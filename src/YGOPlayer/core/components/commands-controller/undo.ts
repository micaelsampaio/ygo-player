import { YGODuel } from "../../YGODuel";
import { BaseControllerCommand, ControllerCommandTag } from "./commands";
import { YGOCommandsControllerState } from "./YGOCommandsController";

export class Undo extends BaseControllerCommand {

  constructor(private duel: YGODuel, private commandId: number) {
    super();
    this.type = "UNDO"
    this.addTag(ControllerCommandTag.EXEC_IMMEDIATLY);
  }

  exec(): void {

    if (this.duel.commands.isRecovering()) {
      this.duel.ygo.undo();
      return;
    }

    this.duel.commands.startRecover()
    this.duel.ygo.goToCommand(this.commandId)
    this.duel.ygo.undo();
    this.duel.commands.endRecover()
    this.duel.updateField();
  }
}