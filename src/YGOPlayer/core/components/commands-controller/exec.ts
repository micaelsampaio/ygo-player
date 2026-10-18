import { Command, YGOCommandScope } from "ygo-core";
import { BaseControllerCommand, ControllerCommandTag } from "./commands";
import type { YGODuel } from "../../YGODuel";
import { YGOCommandsControllerState } from "./state";

export class Exec extends BaseControllerCommand {

  constructor(private duel: YGODuel, private command: Command) {
    super();
    this.type = "EXEC"
    if (duel.commands.isRecovering()) {
      this.addTag(ControllerCommandTag.EXEC_IMMEDIATLY);
    }
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