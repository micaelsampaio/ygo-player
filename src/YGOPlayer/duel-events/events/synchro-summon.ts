import { DuelEventHandlerProps } from "..";
import { Card, YGODuelEvents } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { extraDeckSummonSequence, vanishMaterials } from "../utils/extra-deck-summon";

interface SynchroSummonEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.SynchroSummon;
}

export class SynchroSummonEventHandler extends YGOCommandHandler {
  private props: SynchroSummonEventHandlerProps;
  private cardReference: Card;

  constructor(props: SynchroSummonEventHandlerProps) {
    super("synchro_summon_command");
    this.props = props;
    const event = this.props.event;
    this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone);
  }

  public start(): void {
    const { event, startTask } = this.props;
    const sequence = new YGOTaskSequence();
    vanishMaterials(this.props, sequence, event.materials, 0xffffff);
    extraDeckSummonSequence(this.props, sequence, {
      cardReference: this.cardReference,
      cardId: event.id,
      zone: event.zone,
      originZone: event.originZone,
    });
    startTask(sequence);
  }
}
