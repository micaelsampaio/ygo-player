import { JSONCommand, YGOClient, YGOCommands, YGOGameUtils, YGOServerGameStateData } from "ygo-core";
import type { YGOCommandPayload, YGOReplayData, YGOServerCommandRequest } from "ygo-core";
import type { YGODuel } from "./YGODuel";
import { Command } from "ygo-core";
import { YGOTimerUtils } from "../scripts/timer-utils";
import { YGOComponent } from "./YGOComponent";
import { Exec } from "./components/commands-controller/exec";
import { YGOPlayerRemoteActions } from "ygo-core";
import { markBotActivation } from "../duel-events/bot-spotlight";
import { duelRoomId, roomEventFor } from "./room-events";

/** Server commands that move the duel's timeline instead of adding to it. */
const TIMELINE_MOVES = new Set([
  "ygo:commands:previous", "ygo:commands:next", "ygo:commands:play", "ygo:commands:goto_command",
]);

/** The fields of a server message read before knowing which message it is. */
type ServerMessageFields = { type?: string; reason?: unknown; replay?: YGOReplayData; error?: unknown };

/** A player index carried in a remote action's payload (e.g. RevealExtraDeck's sourcePlayer). */
function payloadPlayer(payload: unknown, key: "sourcePlayer" | "targetPlayer"): number | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

/** Shown when the server no longer has this duel after a reconnect. */
export const DUEL_GONE_MESSAGE = "The connection to the duel server was lost and this duel ended on the server (it may have restarted). It can't continue.";

/** A resume not answered within this long counts as refused (its held commands then play). */
export const RESUME_TIMEOUT_MS = 8_000;

/** A drop with no resume started within this long stops holding (and blocking) the duel. */
export const RESYNC_LIMIT_MS = 30_000;

/** Live commands held after a drop play anyway when no resume started within this long. */
export const HOLD_LIMIT_MS = 10_000;

/** Shown when the server sent only part of what this client missed. */
export const RESUME_TRUNCATED_MESSAGE = "Some of the duel's moves could not be caught up after the reconnect: reload the page to see the board as it is.";

/** A server:exec payload's command id (-1: none). */
function commandIdOf(payload: unknown): number {
  const id = (payload as { data?: { command?: { commandId?: unknown } } } | null | undefined)?.data?.command?.commandId;
  return typeof id === "number" ? id : -1;
}

export class YGOServerActions extends YGOComponent {
  private timers: YGOTimerUtils;
  private nextPlayerActionCooldown: number;

  constructor(private duel: YGODuel, private client: YGOClient) {
    super("server-actions");
    this.timers = new YGOTimerUtils();
    this.nextPlayerActionCooldown = Date.now();
    this.registerClientEvents();
  }

  public server = {
    getGameState: () => {
      this.timers.setTimeout(() => {
        this.client.send("server:game-state");
      }, 1);
    },
    setClientReady: () => {
      this.client.send("client:ready");
    },
    /** The server's full replay (hidden information: only once the match is over). */
    requestReplay: (timeoutMs = 5000): Promise<YGOReplayData> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.replayRequests = this.replayRequests.filter(r => r.resolve !== resolve);
          reject(new Error("The server did not send the replay"));
        }, timeoutMs);
        this.replayRequests.push({ resolve, reject, timer });
        this.client.send("server:replay");
      });
    },
  }

  /**
   * Room-scoped requests outside ygo-core's command stream (room-events.ts):
   * puzzle:state, puzzle:retry, duel:preferences:set, duel:deck:search /
   * duel:deck:take. False when this duel isn't played in a server room.
   */
  public room = {
    id: (): string | null => duelRoomId(this.duel.ygo?.options),
    send: (event: string, data: Record<string, unknown> = {}): boolean => {
      const roomId = this.room.id();
      if (!roomId) return false;
      this.client.send(event, { ...data, roomId });
      return true;
    },
  }

  /** The newest ygo:commands:exec id this client played (-1: none yet). */
  private lastCommandId = -1;
  /** The ids played, so a command the resume and the live socket both deliver plays once. */
  private playedIds = new Set<number>();
  /**
   * From the socket's disconnect until the resume is answered: where the resume asks from (the
   * newest id played before the drop), and the live commands that come meanwhile — the new socket
   * gets live commands as soon as it connects, before the missed ones arrive, and they must not
   * play out of order or move the resume point past the gap.
   */
  private resync: { from: number; live: unknown[] } | null = null;
  private resuming = false;

  get lastReceivedCommandId(): number {
    return this.lastCommandId;
  }

  /** The socket is away or the resume after it isn't answered yet: no move can reach the engine. */
  get resyncing(): boolean {
    return this.resync !== null;
  }

  private offReconnect: (() => void) | null = null;

  /**
   * The host's socket dropped: hold live commands until the resume (a host that can resume only),
   * and resume on its next reconnect. The hook is taken here, not at mount: the host's assist
   * actions are bound to the duel after the UI mounted.
   */
  public onConnectionDropped(): void {
    const assist = this.duel.assist;
    if (!assist?.resume || !assist.onReconnect) return;
    if (!this.offReconnect) {
      this.offReconnect = assist.onReconnect(() => {
        void this.resumeAfterReconnect().then((outcome) => {
          if (outcome === "resumed") this.room.send("duel:presence", { visible: typeof document === "undefined" || document.visibilityState !== "hidden" });
        });
      });
    }
    if (this.resync) return;
    const resync = { from: this.lastCommandId, live: [] as unknown[] };
    this.resync = resync;
    // Never hold the duel forever: no resume started within the limit (no reconnect yet).
    this.timers.setTimeout(() => { if (this.resync === resync && !this.resuming) void this.flushHeld(); }, RESYNC_LIMIT_MS);
  }

  /**
   * The host's socket reconnected: resume the seat on the server (duel:resume) and play the
   * commands that went out while the socket was away, then the live ones held meanwhile, each
   * once and in order, so the board and the engine agree again. "gone": the server no longer has
   * the duel (it restarted, or the duel ended) — the player is told, and nothing is played on.
   */
  public async resumeAfterReconnect(): Promise<"resumed" | "gone" | "failed"> {
    const resume = this.duel.assist?.resume;
    if (!resume || this.resuming) return "failed";
    this.resuming = true;
    const resync = this.resync ?? { from: this.lastCommandId, live: [] };
    this.resync = resync;
    let res: { success?: boolean; commands?: unknown; gone?: boolean; truncated?: boolean } | undefined;
    try {
      // An ack lost with a second drop never settles: a timeout counts as a refusal.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject({ success: false, error: "timeout" }), RESUME_TIMEOUT_MS); });
      try {
        res = (await Promise.race([resume(resync.from), timeout])) as typeof res;
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      // emitEvent rejects with the ack itself when it carries an error.
      res = error as typeof res;
    }
    try {
      if (res?.gone) {
        this.duel.connectionLost = true;
        this.duel.events.dispatch("system-chat-message", { message: DUEL_GONE_MESSAGE });
        this.duel.events.dispatch("assist-notice", { message: DUEL_GONE_MESSAGE });
        this.duel.events.dispatch("render-ui");
        return "gone";
      }
      const missed = res?.success && Array.isArray(res.commands) ? res.commands : [];
      const pending = [...missed, ...resync.live]
        .filter((command) => !this.playedIds.has(commandIdOf(command)))
        .sort((x, y) => commandIdOf(x) - commandIdOf(y));
      this.resync = null;
      for (const command of pending) await this.playExec(command);
      if (res?.truncated) this.duel.events.dispatch("system-chat-message", { message: RESUME_TRUNCATED_MESSAGE });
      this.duel.events.dispatch("assist-refresh", {});
      return res?.success ? "resumed" : "failed";
    } finally {
      this.resync = null;
      this.resuming = false;
    }
  }

  /** Plays the held live commands when no resume took them over (see HOLD_LIMIT_MS). */
  private async flushHeld(): Promise<void> {
    const resync = this.resync;
    if (!resync || this.resuming) return;
    this.resync = null;
    const held = resync.live.filter((c) => !this.playedIds.has(commandIdOf(c))).sort((x, y) => commandIdOf(x) - commandIdOf(y));
    for (const command of held) await this.playExec(command);
  }

  /** Plays a held or missed server:exec payload (never held again). */
  private async playExec(command: unknown): Promise<void> {
    const resync = this.resync;
    this.resync = null;
    try {
      await this.processServerCommand("server:exec", command);
    } finally {
      this.resync = resync;
    }
  }

  private replayRequests: { resolve: (replay: YGOReplayData) => void, reject: (error: Error) => void, timer: ReturnType<typeof setTimeout> }[] = [];

  public getActivePlayer(): number {
    if (this.duel.ygo.options.controlTogglePriority === false) {
      return this.duel.perspective.playerIndex;
    }
    return this.duel.getActivePlayer();
  }

  public ygo = {
    exec: ({ command }: { command: Command | string }) => {
      const serverCommand = typeof command === "string" ? JSON.parse(command) : command.toJSON();

      // If the player does anything while keep-going is active, cancel it first
      if (this.duel.continuousAccept && serverCommand.type !== "PlayerRemoteActionCommand") {
        this.duel.continuousAccept = false;
        this.duel.events.dispatch("render-ui");
        this.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.CancelContinuousOK });
      }

      const currentCommandId = this.duel.ygo.peek()?.commandId;
      this.client.send("server:exec", {
        type: "ygo:commands:exec",
        data: { currentCommandId, command: serverCommand },
      });
    },
    setPlayerPriority: (player: number) => {
      if (!this.duel.ygo.options.controlTogglePriority) player = this.duel.perspective.playerIndex;

      if (this.duel.getActivePlayer() !== player) {
        this.ygo.exec({ command: new YGOCommands.PlayerPriorityCommand({ player }) });
      }
    },
    setPlayerRemoteAction: (data: { player: number, action: YGOPlayerRemoteActions, data?: unknown }) => {

      let message = "";
      const playerName = this.duel.ygo.getField(data.player).player.name;

      switch (data.action) {
        // Pass / OK: shown on the board (the action sprite, YGODuelScene), not as a chat line —
        // each press posted one ("says Ok"), about 20 in a duel.
        case YGOPlayerRemoteActions.OK:
          break;
        case YGOPlayerRemoteActions.ContinuousOK:
          message = playerName + " says \"Keep going\"";
          break;
        case YGOPlayerRemoteActions.CancelContinuousOK:
          message = playerName + " turned off \"Keep going\"";
          break;
        case YGOPlayerRemoteActions.Thinking:
          message = playerName + " says \"Thinking\"";
          break;
        case YGOPlayerRemoteActions.WAIT:
          message = playerName + " says \"Wait\"";
          break;
        case YGOPlayerRemoteActions.RevealExtraDeck: {
          const sourcePlayer = payloadPlayer(data.data, "sourcePlayer");
          if (sourcePlayer !== undefined) {
            message = playerName + " revealed their Extra Deck";
            this.duel.events.dispatch("set-ui-menu", {
              group: "game-overlay",
              type: "extra-deck",
              data: { player: sourcePlayer, extraDeck: this.duel.fields[sourcePlayer].extraDeck },
            });
          }
          break;
        }
        case YGOPlayerRemoteActions.PickExtraDeckCard: {
          const targetPlayer = payloadPlayer(data.data, "targetPlayer");
          if (targetPlayer !== undefined) {
            if (this.duel.perspective.isPlayerPOV(targetPlayer)) {
              message = "Choose a card from your Extra Deck";
              this.duel.events.dispatch("set-ui-menu", {
                group: "game-overlay",
                type: "extra-deck",
                data: { player: targetPlayer, extraDeck: this.duel.fields[targetPlayer].extraDeck },
              });
            } else {
              const targetName = this.duel.ygo.getField(targetPlayer).player.name;
              message = `${targetName} must choose a card from their Extra Deck`;
            }
          }
          break;
        }
      }

      if (!message) return;

      this.duel.events.dispatch("system-chat-message", {
        ...data,
        message
      });
    },
    sendPlayerAction: ({ action, data }: { action: YGOPlayerRemoteActions, data?: unknown }) => {

      if (action !== YGOPlayerRemoteActions.CancelContinuousOK) {
        if (Date.now() < this.nextPlayerActionCooldown) return;
        this.nextPlayerActionCooldown = Date.now() + 1000;
      }

      this.ygo.exec({
        command: new YGOCommands.PlayerRemoteActionCommand({
          player: this.getActivePlayer(),
          action,
          data
        })
      })
    }
  };

  public controls = {
    play: () => {
      const currentCommandId = this.duel.ygo.peek()?.commandId ?? -1;
      this.client.send("server:exec", { type: "ygo:commands:play", data: { currentCommandId } } satisfies YGOServerCommandRequest)
    },
    pause: () => {
      const currentCommandId = this.duel.ygo.peek()?.commandId ?? -1;
      this.client.send("server:exec", { type: "ygo:commands:pause", data: { currentCommandId } } satisfies YGOServerCommandRequest)
    },
    nextCommand: () => {
      if (this.duel.commands.isPlaying()) return;
      if (!this.duel.ygo.hasNextCommand()) return;
      const currentCommandId = this.duel.ygo.peek()?.commandId ?? -1;
      this.client.send("server:exec", { type: "ygo:commands:next", data: { currentCommandId } } satisfies YGOServerCommandRequest)
    },
    previousCommand: () => {
      if (!this.duel.ygo.hasPrevCommand()) return;
      const currentCommandId = this.duel.ygo.peek()?.commandId ?? -1;
      this.client.send("server:exec", { type: "ygo:commands:previous", data: { currentCommandId } } satisfies YGOServerCommandRequest)
    },
    goToCommand: (command: Command | number) => {
      const commandId = typeof command === "object" ? command.commandId : command;
      if (!Number.isInteger(commandId)) return;
      this.client.send("server:exec", { type: "ygo:commands:goto_command", data: { commandId } } satisfies YGOServerCommandRequest)
    }
  }

  public chat = {
    send: (message: string) => {
      this.client.send("client:chat", { message })
    }
  }

  private registerClientEvents() {
    this.client.onMessage((eventName, data) => {
      this.processServerCommand(eventName, data);
    })

    this.client.onDisconnect(() => {
      this.onConnectionDropped();

    })
  }

  public async processServerCommand(eventName: string, data: unknown) {
    // puzzle:state, duel:preferences, duel:deck:* (room-events.ts).
    const roomEvent = roomEventFor(eventName, data, this.room.id());
    if (roomEvent) {
      this.duel.events.dispatch(roomEvent, data);
      return;
    }
    const message = (data ?? undefined) as ServerMessageFields | undefined;

    if (eventName === "server:exec" && TIMELINE_MOVES.has(message?.type ?? "")) {
      // After the move is queued below.
      this.timers.setTimeout(() => this.onTimelineMoved(), 1);
    }

    // Private duels: the server refused a command (e.g. acting on the other
    // player's hidden cards — ygo-core YGOGameServer.acceptPlayerCommand).
    if (eventName === "server:exec-rejected") {
      const reason = typeof message?.reason === "string" && message.reason ? message.reason : "That action isn't allowed";
      this.duel.events.dispatch("system-chat-message", { message: `Not allowed: ${reason}` });
      return;
    }

    if (eventName === "server:replay") {
      const requests = this.replayRequests;
      this.replayRequests = [];
      requests.forEach(({ resolve, reject, timer }) => {
        clearTimeout(timer);
        if (message?.replay) resolve(message.replay);
        else reject(new Error(typeof message?.error === "string" && message.error ? message.error : "Replay not available"));
      });
      return;
    }

    if (eventName === "server:game-state") {
      const gameState = data as YGOServerGameStateData;
      await this.duel.createYGO(gameState);

      if (gameState.commands.length > 0) {
        this.duel.commands.startRecover();
        gameState.commands.forEach(command => {
          this.processServerCommand("server:exec", command);
        });
        this.duel.commands.endRecover();

        this.timers.setTimeout(() => {
          this.duel.updateField();
        });
      }
    }

    if (eventName === "server:exec") {
      const payload = data as YGOCommandPayload;
      if (payload.type === "ygo:commands:exec") {
        // Held until the resume after a reconnect is answered (see resync).
        if (this.resync) {
          this.resync.live.push(payload);
          // No resume started (the reconnect hook never came): never hold the duel forever.
          if (!this.resuming && this.resync.live.length === 1) this.timers.setTimeout(() => void this.flushHeld(), HOLD_LIMIT_MS);
          return;
        }
        if (this.playedIds.has(commandIdOf(payload))) return;
        const eventData = payload.data;
        // Hidden information: data of the opponent's cards this command reveals.
        if (eventData.cards) this.duel.ygo.state.registerCardData(eventData.cards);
        if (typeof eventData.command.commandId === "number") {
          this.playedIds.add(eventData.command.commandId);
          if (eventData.command.commandId > this.lastCommandId) this.lastCommandId = eventData.command.commandId;
        }
        const command = new JSONCommand({ type: eventData.command.type, data: eventData.command.data });
        command.commandId = eventData.command.commandId;
        command.timestamp = eventData.command.timestamp;
        // Bot duels: the bot's activation gets a spotlight when it plays.
        if (!this.duel.commands.isRecovering()) markBotActivation(this.duel, eventData.command);
        this.duel.commands.exec(new Exec(this.duel, command));
      } else if (payload.type === "ygo:commands:previous") {
        const commandId = payload.data.commandId;
        this.duel.commands.previousCommand({ commandId });
      } else if (payload.type === "ygo:commands:next") {
        const commandId = payload.data.commandId;
        this.duel.commands.nextCommand({ commandId });
      } else if (payload.type === "ygo:commands:play") {
        const commandId = payload.data.commandId;
        this.duel.commands.play({ commandId });
      } else if (payload.type === "ygo:commands:pause") {
        const commandId = payload.data.commandId;
        this.duel.commands.pause({ commandId });
      } else if (payload.type === "ygo:commands:goto_command") {
        const eventData = payload.data;
        this.duel.commands.goToCommand({ commandId: eventData.commandId });
      } else if (payload.type === "ygo:replay:start") {
        this.duel.events.dispatch("update-game-ui-config", { startReplay: true });
        this.timers.setTimeout(() => {
          this.duel.serverActions.controls.play();
        }, 500)
      }
    }
  }

  public onDestroy() {
    this.timers.clear();
    this.offReconnect?.();
    this.offReconnect = null;
    this.replayRequests.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error("Duel closed"));
    });
    this.replayRequests = [];
  }

  /** The server moved the duel's timeline (undo / redo / a timeline jump):
   * in a bot duel its rules engine was rebuilt to that point, so the
   * assisted panel asks it again for the options there. */
  private onTimelineMoved() {
    this.duel.events.dispatch("assist-refresh", {});
  }
}