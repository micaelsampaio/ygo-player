import { Command, YGOCommandScope } from "ygo-core";
import { BaseControllerCommand } from "./commands";
import { YGODuel } from "../../YGODuel";
import { YGOCommandsControllerState } from "./YGOCommandsController";

export class Exec extends BaseControllerCommand {

  constructor(private duel: YGODuel, private command: Command) {
    super();
    this.type = "EXEC"
  }

  exec(): void {
    if (this.duel.commands.isRecovering()) {
      this.duel.ygo.exec(this.command);
      return;
    }

    if (this.command.scope !== YGOCommandScope.GAME) {
      this.duel.commands.setState(YGOCommandsControllerState.PLAYING_COMMAND);
    } else {
      this.duel.commands.setState(YGOCommandsControllerState.PLAYING);
    }

    this.duel.ygo.exec(this.command);
  }
}