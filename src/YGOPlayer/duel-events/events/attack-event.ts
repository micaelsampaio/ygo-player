import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import {
  getCardRotationFromFieldZoneData,
  getGameZone,
} from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
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
      const targetAttackedPosition = attackedCard.gameObject.position.clone();

      const offset = 5;
      const direction = new THREE.Vector3()
        .subVectors(card.gameObject.position, attackedCard.gameObject.position)
        .normalize();
      const goingInPosition = card.gameObject.position.clone().addScaledVector(direction, offset);
      const goingOutPosition = card.gameObject.position.clone().addScaledVector(direction, offset / 2);
      goingInPosition.z += 3;
      goingOutPosition.z += 1.5;

      const tempDirection = new THREE.Vector3().subVectors(card.gameObject.position, attackedCard.gameObject.position);
      const angle = Math.atan2(tempDirection.x, -tempDirection.y);
      const newRotation = card.gameObject.rotation.clone();

      if ((event as any).attackedPosition?.includes("facedown")) {
        const startPosition: THREE.Vector3 = attackedCard.gameObject.position.clone();
        const targetRotation = getCardRotationFromFieldZoneData(
          duel,
          attackedCard.cardReference!,
          attackedZoneData
        );
        const abovePosition = startPosition.clone();
        abovePosition.z += 1;
        attackedCard.hideCardStats();

        startTask(new YGOTaskSequence(
          new PositionTransition({
            gameObject: attackedCard.gameObject,
            duration: 0.15,
            position: abovePosition,
          }),
          new MultipleTasks(
            new PositionTransition({
              gameObject: attackedCard.gameObject,
              duration: 0.15,
              position: startPosition,
            }),
            new RotationTransition({
              gameObject: attackedCard.gameObject,
              duration: 0.2,
              rotation: targetRotation,
            })
          ),
          new CallbackTransition(() => {
            attackedCard.showCardStats();
          })
        ))
      }
      newRotation.z = angle;

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
          position: targetAttackedPosition.clone(),
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
    } else {
      const offset = 5;
      const gameHandZone = duel.fields[1 - event.player].hand.gameHandZone;
      const direction = new THREE.Vector3()
        .subVectors(card.gameObject.position, gameHandZone.gameObject.position)
        .normalize();
      const goingInPosition = card.gameObject.position.clone().addScaledVector(direction, offset);
      const goingOutPosition = card.gameObject.position.clone().addScaledVector(direction, offset / 2);
      goingInPosition.z += 3;
      goingOutPosition.z += 1.5;

      const tempDirection = new THREE.Vector3().subVectors(card.gameObject.position, gameHandZone.gameObject.position);
      const angle = Math.atan2(tempDirection.x, -tempDirection.y);
      const newRotation = card.gameObject.rotation.clone();
      newRotation.z = angle;

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
          position: gameHandZone.gameObject.position.clone(),
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
