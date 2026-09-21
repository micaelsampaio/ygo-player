import { YGODuelPhase, YGO_DUEL_PHASE_ORDER } from "ygo-core";
import { BotYGOPlayerClient } from "./bot-client";

/**
 * Stage 0 ("walking skeleton"): the bot has no strategy yet. On its own
 * turn it does nothing but advance through every phase and end the turn,
 * exactly mirroring the phase-advance rules the human UI already follows
 * (see ygo-player's DuelPhaseActionsMenu.nextPhase/nextTurn) — turn 1 skips
 * Battle/Main2, otherwise every phase is visited in order.
 *
 * The bot never touches YGOCore/YGOGameState directly. It only replays the
 * same command-executed broadcast stream every other client sees to keep a
 * minimal local mirror of turn/phase/turnPlayer, and emits the same
 * wire-format commands a human's UI would — so it can never desync, since
 * it's driven by the same event log as everyone else.
 */
export class BotController {
  private client: BotYGOPlayerClient;
  private playerIndex: number;
  private turn = 0;
  private turnPlayer = 0;
  private phase: YGODuelPhase = YGODuelPhase.Draw;
  private actionDelayMs: number;

  constructor(
    username: string,
    playerIndex: number,
    options?: { actionDelayMs?: number },
  ) {
    this.playerIndex = playerIndex;
    this.actionDelayMs = options?.actionDelayMs ?? 600;
    this.client = new BotYGOPlayerClient(username);
    this.client.onReceive((eventName, data) => this.onServerMessage(eventName, data));
  }

  getClient(): BotYGOPlayerClient {
    return this.client;
  }

  /**
   * Must be called only after this controller's client has been registered
   * with YGOGameServer (which binds `onMessage` synchronously in its own
   * constructor) — calling it any earlier is a silent no-op since there's
   * nothing yet listening on the other end.
   */
  sendReady() {
    this.client.emit("client:ready");
  }

  private onServerMessage(eventName: string, data: any) {
    if (eventName !== "server:exec") return;

    if (data?.type === "ygo:replay:start") {
      this.maybeAct();
      return;
    }

    if (data?.type !== "ygo:commands:exec") return;

    const command = data.data?.command;
    if (!command) return;

    if (command.type === "DuelTurnCommand") {
      // Mirrors DuelTurnCommand.exec() exactly: the very first turn (0 -> 1,
      // at game start) does NOT flip turnPlayer — only every turn after does.
      this.turn++;
      if (this.turn > 1) {
        this.turnPlayer = this.turnPlayer === 0 ? 1 : 0;
      }
    }
    if (command.type === "DuelPhaseCommand") {
      this.phase = command.data.phase;
    }

    this.maybeAct();
  }

  private maybeAct() {
    if (this.turnPlayer !== this.playerIndex) return;
    setTimeout(() => this.takeTurnStep(), this.actionDelayMs);
  }

  /** Stage 0: no decisions — just advance phases and end the turn. */
  private takeTurnStep() {
    if (this.turnPlayer !== this.playerIndex) return; // stale timer guard

    const currentIndex = YGO_DUEL_PHASE_ORDER.indexOf(this.phase);
    let nextIndex = currentIndex + 1;

    // Turn 1 skips Battle/Main2, same rule the human UI's nextPhase() applies.
    if (this.turn === 1 && this.phase === YGODuelPhase.Main1) {
      nextIndex += 2;
    }

    const nextPhase = YGO_DUEL_PHASE_ORDER[nextIndex];

    if (nextPhase) {
      this.sendCommand("DuelPhaseCommand", { phase: nextPhase });
      return;
    }

    // Past End phase: end the turn.
    this.sendCommand("DuelTurnCommand", {});
    this.sendCommand("DuelPhaseCommand", { phase: YGODuelPhase.Draw });
  }

  private sendCommand(type: string, data: any) {
    this.client.emit("server:exec", {
      type: "ygo:commands:exec",
      data: { command: { type, data } },
    });
  }
}
