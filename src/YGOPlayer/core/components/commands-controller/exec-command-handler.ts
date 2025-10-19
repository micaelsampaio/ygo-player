import { BaseControllerCommand, ControllerCommandTag } from "./commands";
import { YGOCommandHandler } from "../YGOCommandHandler";
import { YGODuel } from "../../YGODuel";

export class ExecCommandHandler extends BaseControllerCommand {

  constructor(private duel: YGODuel, command: YGOCommandHandler) {
    super();
    this.type = "EXEC_HANDLER"
    this.handler = command
    this.tags.add(ControllerCommandTag.GAME_EVENT_HANDLER)
  }

  exec(): void {
    if (this.duel.commands.isRecovering()) {
      this.handler = undefined;
      return;
    }
    this.handler?.start();
  }
}