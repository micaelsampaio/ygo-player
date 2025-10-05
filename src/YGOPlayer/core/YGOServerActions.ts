import { JSONCommand, YGOClient } from "ygo-core";
import { YGODuel } from "./YGODuel";
import { Command } from "ygo-core";

export class YGOServerActions {

  constructor(private duel: YGODuel, private client: YGOClient) {
    this.registerClientEvents();
  }

  private registerClientEvents() {
    this.client.onMessage((eventName, data) => {
      console.log('TCL:\n\n\n\ NEW CLIENT EVENT --------');
      console.log("TCL: eventNa me:", eventName)
      console.log("TCL: data:", data)
      console.log('TCL: --------');

      if (eventName === "server:game-state") {
        this.duel.createYGO(data);
      }

      if (eventName === "server:exec") {
        if (data.type === "ygo:commands:exec") {
          const eventData = data.data;
          const command = new JSONCommand({ type: eventData.command.type, data: eventData.command.data });
          command.commandId = eventData.command.id;
          command.timestamp = eventData.command.timestamp;
          this.duel.commands.exec(command);
        }

        if (data.type === "ygo:commands:undo") {
          this.duel.commands.previousCommand();
        }

        if (data.type === "ygo:commands:redo") {
          this.duel.commands.nextCommand();
        }
      }

      // TODO
    })

    this.client.onDisconnect(() => {

    })

    setTimeout(() => {

    })
  }

  execYGOCommand({ command }: { command: Command | string }) {
    const serverCommand = typeof command === "string" ? JSON.parse(command) : command.toJSON()

    this.client.send("server:exec", {
      type: "ygo:commands:exec",
      data: {
        command: serverCommand
      }
    })
  }

  requestGameState() {
    setTimeout(() => { // call it in next frame
      this.client.send("server:game-state");
    });
  }

  setClientReady() {
    this.client.send("client:ready");
  }
}