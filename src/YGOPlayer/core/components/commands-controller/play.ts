import { BaseControllerCommand } from "./commands";
import type { YGODuel } from "../../YGODuel";
import { YGOCommandsControllerState } from "./state";

export class Play extends BaseControllerCommand {
  constructor(private duel: YGODuel, private commandId: number) {
    super();
    this.type = "PLAY";
  }

  exec(): void {
    this.duel.commands.clearRequestedPause()

    if (this.duel.commands.isRecovering()) return;


    if (this.duel.ygo.peek()?.commandId !== this.commandId) {
      this.duel.commands.startRecover()
      this.duel.ygo.goToCommand(this.commandId)
      this.duel.commands.endRecover()
    }

    this.duel.updateField();
    this.duel.commands.setState(YGOCommandsControllerState.PLAYING);
    this.duel.ygo.redo();
  }
}
