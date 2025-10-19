import { BaseControllerCommand } from "./commands";
import { YGODuel } from "../../YGODuel";
import { YGOCommandsControllerState } from "./YGOCommandsController";

export class Redo extends BaseControllerCommand {
  constructor(private duel: YGODuel, private commandId: number) {
    super();
    this.type = "REDO";
  }

  exec(): void {
    if (this.duel.commands.isRecovering()) {
      this.duel.ygo.goToCommand(this.commandId)
      this.duel.ygo.redo();
      return;
    }

    if (this.duel.ygo.peek()?.commandId !== this.commandId) {
      this.duel.commands.startRecover()
      this.duel.ygo.goToCommand(this.commandId)
      this.duel.commands.endRecover()
    }

    this.duel.updateField();
    this.duel.commands.setState(YGOCommandsControllerState.PLAYING_COMMAND);
    this.duel.ygo.redo();
  }
}
