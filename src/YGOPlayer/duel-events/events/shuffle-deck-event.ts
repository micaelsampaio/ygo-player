import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { CallbackTransition } from "../utils/callback";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";

interface ShuffleDeckEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.ShuffleDeck;
}

export class ShuffleDeckEventHandler extends YGOCommandHandler {
  private props: ShuffleDeckEventHandlerProps;

  constructor(props: ShuffleDeckEventHandlerProps) {
    super("shuffle_card_menu");
    this.props = props;
  }

  public start(): void {
    const { event, duel } = this.props;

    const sequence = new YGOTaskSequence();
    const deck = duel.fields[event.player].mainDeck;

    deck.createShuffleAnimation({ sequence });

    sequence.add(new CallbackTransition(() => {
      this.props.onCompleted();
    }))

    this.props.startTask(sequence);
  }
}
