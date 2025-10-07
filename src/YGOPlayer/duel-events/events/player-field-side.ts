import { DuelEventHandlerProps } from "..";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

interface PlayerFieldSideEventHandlerProps extends DuelEventHandlerProps {
  event: { player: number };
}

export class PlayerFieldSideEventHandler extends YGOCommandHandler {

  constructor(private props: PlayerFieldSideEventHandlerProps) {
    super("player_field_side_command_handler");
  }

  public start(): void {
    this.props.duel.ygo.setCurrentPlayer(this.props.event.player);
    this.props.onCompleted();
  }
}
