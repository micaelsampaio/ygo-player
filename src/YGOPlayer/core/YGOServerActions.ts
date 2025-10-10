import { JSONCommand, YGOClient, YGOServerGameStateData } from "ygo-core";
import { YGODuel } from "./YGODuel";
import { Command } from "ygo-core";
import { YGOTimerUtils } from "../scripts/timer-utils";
import { YGOComponent } from "./YGOComponent";

export class YGOServerActions extends YGOComponent {
  private timers: YGOTimerUtils;

  constructor(private duel: YGODuel, private client: YGOClient) {
    super("server-actions");
    this.timers = new YGOTimerUtils();
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
      this.client.send("server:exec", { type: "ygo:commands:set_player_priority", data: { player } })
    }
  };

  public controls = {
    play: () => {
      const currentCommandId = this.duel.ygo.peek()?.commandId;
      this.client.send("server:exec", { type: "ygo:commands:play", data: { currentCommandId } })
    },
    pause: () => {
      const currentCommandId = this.duel.ygo.peek()?.commandId;
      this.client.send("server:exec", { type: "ygo:commands:pause", data: { currentCommandId } })
    },
    nextCommand: () => {
      if (this.duel.commands.isPlaying()) return;
      const currentCommandId = this.duel.ygo.peek()?.commandId;
      this.client.send("server:exec", { type: "ygo:commands:next", data: { currentCommandId } })
    },
    previousCommand: () => {
      const currentCommandId = this.duel.ygo.peek()?.commandId;
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
        })// next fram
      }

    }

    if (eventName === "server:exec") {
      if (data.type === "ygo:commands:exec") {
        const eventData = data.data;
        const command = new JSONCommand({ type: eventData.command.type, data: eventData.command.data });
        command.commandId = eventData.command.id;
        command.timestamp = eventData.command.timestamp;
        this.duel.commands.exec({ command });
      } else if (data.type === "ygo:commands:previous") {
        this.duel.commands.previousCommand();
      } else if (data.type === "ygo:commands:next") {
        this.duel.commands.nextCommand();
      } else if (data.type === "ygo:commands:play") {
        this.duel.commands.play();
      } else if (data.type === "ygo:commands:pause") {
        this.duel.commands.pause();
      } else if (data.type === "ygo:commands:goto_command") {
        const eventData = data.data;
        this.duel.commands.goToCommand(eventData.commandId);
      } else if (data.type === "ygo:commands:set_player_priority") {
        this.duel.ygo.setCurrentPlayer(data.data.player);
      } else if (data.type === "ygo:replay:start") {
        this.duel.events.dispatch("update-game-ui-config", { startReplay: true });
        this.timers.setTimeout(() => {
          this.duel.commands.play();
        }, 500)
      }
    }
  }

  public onDestroy() {
    this.timers.clear();
  }
}