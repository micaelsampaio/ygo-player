import * as THREE from "three";
import type { DuelEventHandlerProps } from "../types";
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
import {
  AttackArrowTask,
  CameraShakeTask,
  ChargeGlowTask,
  ImpactSparksTask,
  ImpactStreaksTask,
  RecoilTask,
  ScreenFlashTask,
  particleTexture,
  prefersReducedMotion,
} from "../utils/battle-fx";
import { CARD_HEIGHT_SIZE, CARD_RATIO } from "../../constants";

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
    super("attack_handler");
  }

  public start(): void {
    const { duel, startTask, onCompleted } = this.props;
    const { event } = this.props;
    // Both logs route here; read them field by field, an attack on a monster
    // being the one that carries `attackedId`.
    const { attackingZone, attackedId, attackedZone, attackedPosition } = event as Partial<YGODuelEvents.Attack>;
    const { originZone } = event as Partial<YGODuelEvents.AttackDirectly>;

    const originZoneData = YGOGameUtils.getZoneData((attackingZone || originZone)!);
    const cardZone = getGameZone(duel, originZoneData)!;
    const card = cardZone.getGameCard();
    const originalPosition = card.gameObject.position.clone();
    const originalRotation = card.gameObject.rotation.clone();

    const originalScale = card.gameObject.scale.clone();
    const sequence = new YGOTaskSequence();

    // Anticipation: the attacker swells and glows while it backs up, snapping back on the dash.
    startTask(new ChargeGlowTask(duel, card.gameObject, { width: CARD_HEIGHT_SIZE / CARD_RATIO, height: CARD_HEIGHT_SIZE }, 0.5, 0.25));

    // pre load textures
    // Warm the cache so the hit's sprites are ready by the impact.
    for (const name of ["circle_03", "star_07", "trace_01", "light_01"]) particleTexture(duel, name);

    if (attackedId) {
      const attackedZoneData = YGOGameUtils.getZoneData(attackedZone!);
      const attackedCardZone = getGameZone(duel, attackedZoneData)!;
      const attackedCard = attackedCardZone.getGameCard();
      const targetAttackedPosition = attackedCard.gameObject.position.clone();

      if (attackedPosition?.includes("facedown")) {
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
        onImpact: (position) => {
          this.onImpact(position);
          // The defender is knocked back along the attack (and shakes); its fate comes in a later event.
          const push = new THREE.Vector3().subVectors(targetAttackedPosition, originalPosition);
          startTask(new RecoilTask(attackedCard.gameObject, push));
        },
      }));
      // The arrow streams from the attacker to its target during the wind-up and fades on the hit.
      startTask(new AttackArrowTask(duel, originalPosition, targetAttackedPosition));
    } else {
      const gameHandZone = duel.fields[1 - event.player].hand.gameHandZone;

      sequence.addMultiple(...attackLunge({
        card: card.gameObject,
        target: gameHandZone.gameObject.position,
        impactAt: () => gameHandZone.gameObject.position.clone(),
        originalPosition,
        originalRotation,
        onImpact: (position) => this.onImpact(position, true),
      }));
      startTask(new AttackArrowTask(duel, originalPosition, gameHandZone.gameObject.position.clone()));
    }

    sequence.add(new CallbackTransition(() => {
      card.gameObject.position.copy(originalPosition);
      card.gameObject.scale.copy(originalScale);

      onCompleted();
    }));

    startTask(sequence);
  }

  public finish(): void {
  }

  /**
   * The hit: rings + flare, radial speed streaks, sparks, a white screen flash and a camera shake
   * (all bigger on a direct attack; streaks/sparks/flash/shake skipped under reduced motion), then where
   * it struck, for the damage number.
   */
  private onImpact(position: THREE.Vector3, direct = false) {
    const { duel, startTask, event } = this.props;
    this.createAttackCollisionEffect({ startTask, position });
    if (!prefersReducedMotion()) {
      startTask(new ImpactStreaksTask(duel, position, direct
        ? { count: 10, length: 13, width: 1.8, duration: 0.4 }
        : { count: 7, length: 9, width: 1.4, duration: 0.35 }));
      startTask(new ScreenFlashTask(duel, direct ? 0.85 : 0.5, direct ? 0.16 : 0.12));
      startTask(new ImpactSparksTask(duel, position, direct
        ? { count: 20, speed: 34, color: 0xffc04a, duration: 0.55 }
        : { count: 12, speed: 26, duration: 0.45 }));
    }
    startTask(new CameraShakeTask(duel, direct ? 0.9 : 0.6, direct ? 0.4 : 0.3));
    duel.events.dispatch("battle-impact", { position: { x: position.x, y: position.y, z: position.z }, player: 1 - event.player });
  }

  private createAttackCollisionEffect({ startTask, position }: {
    startTask: DuelEventHandlerProps["startTask"];
    position: THREE.Vector3;
  }) {
    const { duel } = this.props;
    const circleTexture = particleTexture(duel, "circle_03");
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
        map: particleTexture(duel, "star_07")
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
        for (const mesh of [circle, circleLarge, flare]) {
          duel.core.scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
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
