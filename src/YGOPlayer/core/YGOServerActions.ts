import { JSONCommand, YGOClient, YGOCommands, YGOGameUtils, YGOServerGameStateData } from "ygo-core";
import { YGODuel } from "./YGODuel";
import { Command } from "ygo-core";
import { YGOTimerUtils } from "../scripts/timer-utils";
import { YGOComponent } from "./YGOComponent";
import { YGOStatic } from "./YGOStatic";
import { YGOControllerCommands } from "./components/commands-controller";
import { YGOPlayerRemoteActions } from "ygo-core";

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
    }
  }

  public getActivePlayer(): number {
    if (this.duel.ygo.options.controlTogglePriority === false) {
      return YGOStatic.playerIndex;
    }
    return this.duel.getActivePlayer();
  }

  public ygo = {
    exec: ({ command }: { command: Command | string }) => {
      const serverCommand = typeof command === "string" ? JSON.parse(command) : command.toJSON();
      const currentCommandId = this.duel.ygo.peek()?.commandId;
      this.client.send("server:exec", {
        type: "ygo:commands:exec",
        data: { currentCommandId, command: serverCommand },
      });
    },
    setPlayerPriority: (player: number) => {
      if (!this.duel.ygo.options.controlTogglePriority) player = YGOStatic.playerIndex;

      if (this.duel.getActivePlayer() !== player) {
        this.ygo.exec({ command: new YGOCommands.PlayerPriorityCommand({ player }) });
      }
    },
    setPlayerRemoteAction: (data: { player: number, action: YGOPlayerRemoteActions, data?: any }) => {

      let message = "";
      const playerName = this.duel.ygo.getField(data.player).player.name;

      console.log("DATA", data.action);
      console.log("Player", playerName);

      switch (data.action) {
        case YGOPlayerRemoteActions.OK:
          message = playerName + " says \"Ok\"";
          break;
        case YGOPlayerRemoteActions.Thinking:
          message = playerName + " says \"Thinking\"";
          break;
        case YGOPlayerRemoteActions.WAIT:
          message = playerName + " says \"Wait\"";
          break;
      }

      if (!message) return;

      this.duel.events.dispatch("system-chat-message", {
        ...data,
        message
      });
    },
    sendPlayerAction: ({ action, data }: { action: YGOPlayerRemoteActions, data?: any }) => {

      if (Date.now() < this.nextPlayerActionCooldown) return;

      this.nextPlayerActionCooldown = Date.now() + 1000;

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
      this.client.send("server:exec", { type: "ygo:commands:play", data: { currentCommandId } })
    },
    pause: () => {
      const currentCommandId = this.duel.ygo.peek()?.commandId ?? -1;
      this.client.send("server:exec", { type: "ygo:commands:pause", data: { currentCommandId } })
    },
    nextCommand: () => {
      if (this.duel.commands.isPlaying()) return;
      if (!this.duel.ygo.hasNextCommand()) return;
      const currentCommandId = this.duel.ygo.peek()?.commandId ?? -1;
      this.client.send("server:exec", { type: "ygo:commands:next", data: { currentCommandId } })
    },
    previousCommand: () => {
      if (!this.duel.ygo.hasPrevCommand()) return;
      const currentCommandId = this.duel.ygo.peek()?.commandId ?? -1;
      this.client.send("server:exec", { type: "ygo:commands:previous", data: { currentCommandId } })
    },
    goToCommand: (command: Command | number) => {
      const commandId = typeof command === "object" ? command.commandId : command;
      if (!Number.isInteger(commandId)) return;
      this.client.send("server:exec", { type: "ygo:commands:goto_command", data: { commandId } })
    }
  }

  public chat = {
    send: (message: string) => {
      this.client.send("client:chat", { message })
    }
  }

  private registerClientEvents() {
    this.client.onMessage((eventName, data) => {
      console.log('TCL:\n\n\n\ NEW CLIENT EVENT <<<<<<<<<<<<<<<<<<<');
      console.log("TCL: event:", eventName)
      console.log("TCL: data:", data)
      console.log('TCL: --------');

      this.processServerCommand(eventName, data);
    })

    this.client.onDisconnect(() => {

    })
  }

  public processServerCommand(eventName: string, data: any) {
    if (eventName === "server:game-state") {
      const gameState = data as YGOServerGameStateData;
      this.duel.createYGO(gameState);

      if (gameState.commands.length > 0) {
        this.duel.commands.isRecovering();
        gameState.commands.forEach(command => {
          this.processServerCommand(command.type, command.data);
        })
        this.duel.commands.endRecover();

        this.timers.setTimeout(() => {
          this.duel.updateField();
        })// next frame
      }
    }

    if (eventName === "server:exec") {
      const commandData = data.data;
      if (data.type === "ygo:commands:exec") {
        const eventData = data.data;
        const command = new JSONCommand({ type: eventData.command.type, data: eventData.command.data });
        command.commandId = eventData.command.commandId;
        command.timestamp = eventData.command.timestamp;
        this.duel.commands.exec(new YGOControllerCommands.Exec(this.duel, command));
      } else if (data.type === "ygo:commands:previous") {
        const commandId = commandData.commandId;
        this.duel.commands.previousCommand({ commandId });
      } else if (data.type === "ygo:commands:next") {
        const commandId = commandData.commandId;
        this.duel.commands.nextCommand({ commandId });
      } else if (data.type === "ygo:commands:play") {
        const commandId = commandData.commandId;
        this.duel.commands.play({ commandId });
      } else if (data.type === "ygo:commands:pause") {
        const commandId = commandData.commandId;
        this.duel.commands.pause({ commandId });
      } else if (data.type === "ygo:commands:goto_command") {
        const eventData = data.data;
        this.duel.commands.goToCommand({ commandId: eventData.commandId });
      } else if (data.type === "ygo:replay:start") {
        this.duel.events.dispatch("update-game-ui-config", { startReplay: true });
        this.timers.setTimeout(() => {
          this.duel.serverActions.controls.play();
        }, 500)
      }
    }
  }

  public onDestroy() {
    this.timers.clear();
  }
}