import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

interface AdmitDefeatEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.AdmitDefeat;
}

export class AdmitDefeatEventHandler extends YGOCommandHandler {
  private props: AdmitDefeatEventHandlerProps;
  private timeoutId?: number;

  constructor(props: AdmitDefeatEventHandlerProps) {
    super("admit_defeat_command");
    this.props = props;
  }

  public start(): void {

    this.props.duel.events.dispatch("set-ui-menu", {
      group: "game-overlay",
      type: "duel-endgame-overlay",
      data: {
        loser: this.props.event.player
      }
    })

    this.props.duel.endDuel();

    // Admit defeat doesn't require visual effects, complete in next frame
    this.timeoutId = setTimeout(() => {
      // Dispatch game-defeat event to notify the web interface
      this.props.duel.events.dispatch("game-defeat", {
        player: this.props.event.player
      });
      this.props.onCompleted();
    }, 0) as unknown as number;
  }

  public finish(): void {
    clearTimeout(this.timeoutId);
    this.timeoutId = undefined;
  }
}