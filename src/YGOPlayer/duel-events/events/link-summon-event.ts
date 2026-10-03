import { DuelEventHandlerProps } from "..";
import { Card, YGODuelEvents } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { extraDeckSummonSequence, vanishMaterials } from "../utils/extra-deck-summon";

interface LinkSummonEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.LinkSummon;
}

export class LinkSummonEventHandler extends YGOCommandHandler {
  private props: LinkSummonEventHandlerProps;
  private cardReference: Card;

  constructor(props: LinkSummonEventHandlerProps) {
    super("link_summon_command");
    this.props = props;
    const event = this.props.event;
    this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone);
  }

  public start(): void {
    const { event, startTask } = this.props;
    const sequence = new YGOTaskSequence();
    vanishMaterials(this.props, sequence, event.materials, 0xff0000);
    extraDeckSummonSequence(this.props, sequence, {
      cardReference: this.cardReference,
      cardId: event.id,
      zone: event.zone,
      originZone: event.originZone,
    });
    startTask(sequence);
  }
}
