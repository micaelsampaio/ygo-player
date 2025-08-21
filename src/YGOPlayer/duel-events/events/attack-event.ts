// if origin && zoen
// new Move card
// on complete -> start
import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import {
  getCardRotationFromFieldZoneData,
  getGameZone,
} from "../../scripts/ygo-utils";
import { MoveCardEventHandler } from "./move-card-event";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { RotationTransition } from "../utils/rotation-transition";
import { Ease } from "../../scripts/ease";
import { MultipleTasks } from "../utils/multiple-tasks";

interface AttackEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Attack | YGODuelEvents.AttackDirectly;
}

export class AttackEventHandler extends YGOCommandHandler {

  constructor(private props: AttackEventHandlerProps) {
    super("change_card_position_handler");
  }

  public start(): void {
    const { duel, startTask, onCompleted } = this.props;
    const event = this.props.event as (YGODuelEvents.Attack | YGODuelEvents.AttackDirectly);

    const originZone = (event as any).attackingZone || (event as any).originZone;
    const originZoneData = YGOGameUtils.getZoneData(originZone);
    const cardZone = getGameZone(duel, originZoneData)!;
    const card = cardZone.getGameCard();
    const originalPosition = card.gameObject.position.clone();
    const originalRotation = card.gameObject.rotation.clone();

    const sequence = new YGOTaskSequence();

    if ((event as any).attackedId) {
      const { attackedZone } = (event as any);
      const attackedZoneData = YGOGameUtils.getZoneData(attackedZone);
      const attackedCardZone = getGameZone(duel, attackedZoneData)!;
      const attackedCard = attackedCardZone.getGameCard();

      const offset = 5;
      const direction = new THREE.Vector3()
        .subVectors(card.gameObject.position, attackedCard.gameObject.position)
        .normalize();
      const goingInPosition = card.gameObject.position.clone().addScaledVector(direction, offset);
      const goingOutPosition = card.gameObject.position.clone().addScaledVector(direction, offset / 2);
      goingInPosition.z += 3;
      goingOutPosition.z += 1.5;

      const lookDir = new THREE.Vector3().subVectors(
        attackedCard.gameObject.position,
        card.gameObject.position
      ).normalize();

      const angleZ = Math.atan2(lookDir.x, lookDir.z);
      const newRotation = new THREE.Euler(0, 0, angleZ, 'XYZ');

      sequence.addMultiple(
        new MultipleTasks(
          new PositionTransition({
            gameObject: card.gameObject,
            position: goingInPosition,
            duration: 0.5,
            ease: Ease.easeInOut,
          }),
          new RotationTransition({
            gameObject: card.gameObject,
            rotation: newRotation,
            duration: 0.25,
            ease: Ease.easeOutSine
          })
        ),
        new PositionTransition({
          gameObject: card.gameObject,
          position: attackedCard.gameObject.position.clone(),
          duration: 0.25,
          ease: Ease.easeInOut,
        }),
        new PositionTransition({
          gameObject: card.gameObject,
          position: goingOutPosition,
          duration: 0.4,
          ease: Ease.easeInOut,
        }),
        new MultipleTasks(
          new PositionTransition({
            gameObject: card.gameObject,
            position: originalPosition,
            duration: 0.2,
            ease: Ease.easeInOut,
          }),
          new RotationTransition({
            gameObject: card.gameObject,
            rotation: originalRotation,
            duration: 0.2,
            ease: Ease.easeOutSine
          })
        )
      )
    }

    sequence.add(new CallbackTransition(() => {
      card.gameObject.position.copy(originalPosition);

      onCompleted();
    }));

    startTask(sequence);
  }

  public finish(): void {
  }
}
