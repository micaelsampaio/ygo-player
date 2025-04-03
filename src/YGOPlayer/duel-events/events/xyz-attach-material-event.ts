import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { CallbackTransition } from "../utils/callback";
import { MultipleTasks } from "../utils/multiple-tasks";
import { PositionTransition } from "../utils/position-transition";
import { GameCard } from "../../game/GameCard";
import { RotationTransition } from "../utils/rotation-transition";
import { getGameZone } from "../../scripts/ygo-utils";
import { CardZone } from "../../game/CardZone";

interface XYZAttachMaterialHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.XYZAttach;
}

export class XYZAttachMaterialHandler extends YGOCommandHandler {
  private props: XYZAttachMaterialHandlerProps;

  constructor(props: XYZAttachMaterialHandlerProps) {
    super("xyz_overlay_command");
    this.props = props;
  }

  public start(): void {
    const { event, duel, startTask } = this.props;

    const sequence = new YGOTaskSequence();
    const originZoneData = YGOGameUtils.getZoneData(event.originZone);
    const targetZone = YGOGameUtils.getZoneData(event.zone);

    const targetCardZone = getGameZone(duel, targetZone)!;

    const endPosition = targetCardZone.position.clone();
    const endRotation = targetCardZone.rotation.clone();

    let cardZone: CardZone | null = null;
    let card: GameCard;

    if (originZoneData.zone === "H") {
      const hand = duel.fields[originZoneData.player].hand;
      const handCard = hand.getCard(originZoneData.zoneIndex - 1);
      card = new GameCard({ duel, card: handCard.card, stats: false });
      card.gameObject.position.copy(handCard.gameObject.position);
      card.gameObject.rotation.copy(handCard.gameObject.rotation);
      duel.updateHand(originZoneData.player);
    } else {
      cardZone = getGameZone(duel, originZoneData)!;
      card = cardZone.getGameCard();
      card.hideCardStats();
    }

    sequence.addMultiple(
      new MultipleTasks(
        new PositionTransition({
          gameObject: card.gameObject,
          position: endPosition,
          duration: 0.35,
        }),
        new RotationTransition({
          gameObject: card.gameObject,
          rotation: endRotation,
          duration: 0.35,
        })
      )
    );

    sequence.add(
      new CallbackTransition(() => {
        card.destroy();
        if (cardZone) cardZone.setCard(null);
        this.props.onCompleted();
      })
    );

    startTask(sequence);
  }
}
