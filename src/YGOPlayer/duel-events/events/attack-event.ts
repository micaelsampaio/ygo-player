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
import { Ease } from "../../scripts/ease";
import { MultipleTasks } from "../utils/multiple-tasks";
import { ScaleTransition } from "../utils/scale-transition";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { liftAndSettle, moveAndRotate } from "../utils/animation-builders";
import type { YGOTask } from "../../core/components/tasks/YGOTask";

/**
 * The attacker's lunge: it backs up and turns toward `target`, strikes it
 * (`onImpact` at `impactAt()` raised by 0.2), backs off and returns to its
 * original transform.
 */
function attackLunge({ card, target, impactAt, originalPosition, originalRotation, onImpact }: {
  card: THREE.Object3D;
  target: THREE.Vector3;
  impactAt: () => THREE.Vector3;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
  onImpact: (position: THREE.Vector3) => void;
}): YGOTask[] {
  const offset = 5;
  const direction = new THREE.Vector3()
    .subVectors(card.position, target)
    .normalize();
  const goingInPosition = card.position.clone().addScaledVector(direction, offset);
  const goingOutPosition = card.position.clone().addScaledVector(direction, offset / 2);
  goingInPosition.z += 3;
  goingOutPosition.z += 1.5;

  const tempDirection = new THREE.Vector3().subVectors(card.position, target);
  const angle = Math.atan2(tempDirection.x, -tempDirection.y);
  const newRotation = card.rotation.clone();
  newRotation.z = angle;

  return [
    moveAndRotate(card, {
      position: goingInPosition,
      duration: 0.5,
      ease: Ease.easeInOut,
      rotation: newRotation,
      rotationDuration: 0.25,
      rotationEase: Ease.easeOutSine,
    }),
    new PositionTransition({
      gameObject: card,
      position: target.clone(),
      duration: 0.25,
      ease: Ease.easeInOut,
    }),
    new CallbackTransition(() => {
      const position = impactAt();
      position.z += 0.2;
      onImpact(position);
    }),
    new PositionTransition({
      gameObject: card,
      position: goingOutPosition,
      duration: 0.4,
      ease: Ease.easeInOut,
    }),
    moveAndRotate(card, {
      position: originalPosition,
      duration: 0.2,
      ease: Ease.easeInOut,
      rotation: originalRotation,
      rotationEase: Ease.easeOutSine,
    }),
  ];
}

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

    // pre load textures
    duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/circle_03.png"))
    duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/star_07.png"))

    if ((event as any).attackedId) {
      const { attackedZone } = (event as any);
      const attackedZoneData = YGOGameUtils.getZoneData(attackedZone);
      const attackedCardZone = getGameZone(duel, attackedZoneData)!;
      const attackedCard = attackedCardZone.getGameCard();
      const targetAttackedPosition = attackedCard.gameObject.position.clone();

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
          ...liftAndSettle(attackedCard.gameObject, {
            above: abovePosition,
            liftDuration: 0.15,
            position: startPosition,
            rotation: targetRotation,
            settleDuration: 0.15,
            rotationDuration: 0.2,
          }),
          new CallbackTransition(() => {
            attackedCard.showCardStats();
          })
        ))
      }

      sequence.addMultiple(...attackLunge({
        card: card.gameObject,
        target: targetAttackedPosition,
        impactAt: () => targetAttackedPosition.clone(),
        originalPosition,
        originalRotation,
        onImpact: (position) => this.createAttackCollistionEffect({ startTask, position }),
      }));
    } else {
      const gameHandZone = duel.fields[1 - event.player].hand.gameHandZone;

      sequence.addMultiple(...attackLunge({
        card: card.gameObject,
        target: gameHandZone.gameObject.position,
        impactAt: () => gameHandZone.gameObject.position.clone(),
        originalPosition,
        originalRotation,
        onImpact: (position) => this.createAttackCollistionEffect({ startTask, position }),
      }));
    }

    sequence.add(new CallbackTransition(() => {
      card.gameObject.position.copy(originalPosition);

      onCompleted();
    }));

    startTask(sequence);
  }

  public finish(): void {
  }

  private createAttackCollistionEffect({ startTask, position }: any) {
    const { duel } = this.props;
    const circleTexture = duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/circle_03.png"));
    const circle = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: circleTexture,
        transparent: true,
      })
    );
    duel.core.scene.add(circle);
    const circleLarge = new THREE.Mesh(
      new THREE.PlaneGeometry(35, 35),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: circleTexture,
        transparent: true,
      })
    );
    duel.core.scene.add(circleLarge);
    const flare = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 15, 15),
      new THREE.MeshBasicMaterial({
        color: 0xFFDE21,
        transparent: true,
        map: duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/star_07.png"))
      })
    );
    duel.core.scene.add(flare);

    circle.scale.set(0, 0, 0);
    circle.position.copy(position);
    circle.material.opacity = 0;

    circleLarge.scale.set(0, 0, 0);
    circleLarge.position.copy(position);
    circleLarge.position.z -= 0.1;
    circleLarge.material.opacity = 0;

    flare.position.copy(position);
    flare.position.z += 0.1;
    flare.scale.set(0.5, 0.5, 0.5);
    flare.rotateZ(THREE.MathUtils.randInt(0, 360))
    flare.material.opacity = 0;

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: flare,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.15
        }),
        new MaterialOpacityTransition({
          material: flare.material,
          duration: 0.1,
          opacity: 1
        })
      ),
      new MultipleTasks(
        new ScaleTransition({
          gameObject: flare,
          scale: new THREE.Vector3(0.5, 0.5, 0.5),
          duration: 0.1
        }),
        new MaterialOpacityTransition({
          material: flare.material,
          duration: 0.1,
          opacity: 0
        })
      ),
      new WaitForSeconds(0.5),
      new CallbackTransition(() => {
        duel.core.scene.remove(circle);
        duel.core.scene.remove(circleLarge);
        duel.core.scene.remove(flare);
      })
    ));

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: circle,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.2
        }),
        new MaterialOpacityTransition({
          material: circle.material,
          duration: 0.1,
          opacity: 0.5
        })
      ),
      new WaitForSeconds(0.15),
      new MaterialOpacityTransition({
        material: circle.material,
        duration: 0.2,
        opacity: 0
      })
    ));

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: circleLarge,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.15
        }),
        new MaterialOpacityTransition({
          material: circleLarge.material,
          duration: 0.1,
          opacity: 0.5
        })
      ),
      new MultipleTasks(
        new ScaleTransition({
          gameObject: circleLarge,
          scale: new THREE.Vector3(1.5, 1.5, 1.5),
          duration: 0.2
        }),
        new MaterialOpacityTransition({
          material: circleLarge.material,
          duration: 0.2,
          opacity: 0
        })
      ),
    ));
  }
}
