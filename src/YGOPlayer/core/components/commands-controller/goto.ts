import { BaseControllerCommand } from "./commands";
import type { YGODuel } from "../../YGODuel";
import { YGOCommandsControllerState } from "./state";

export class Goto extends BaseControllerCommand {

  constructor(private duel: YGODuel, private commandId: number) {
    super();
    this.type = "GOTO"
  }

  exec(): void {
    if (this.duel.commands.isRecovering()) {
      this.duel.ygo.goToCommand(this.commandId)
      return;
    }

    this.duel.commands.startRecover();
    this.duel.ygo.goToCommand(this.commandId)
    this.duel.commands.endRecover();
    this.duel.commands.setState(YGOCommandsControllerState.IDLE);
    this.duel.updateField();
    this.duel.clearActions();
  }
}