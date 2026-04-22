import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

interface ShowExtraDeckEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.ShowExtraDeck;
}

export class ShowExtraDeckEventHandler extends YGOCommandHandler {
  constructor(private props: ShowExtraDeckEventHandlerProps) {
    super("show_extra_deck_command");
  }

  public start(): void {
    const { event, duel, onCompleted } = this.props;
    const { player } = event;

    duel.events.dispatch("set-ui-menu", {
      group: "game-overlay",
      type: "extra-deck",
      data: { player, extraDeck: duel.fields[player].extraDeck },
    });

    setTimeout(() => onCompleted());
  }
}
