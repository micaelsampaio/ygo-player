import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { CallbackTransition } from "../utils/callback";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { MultipleTasks } from "../utils/multiple-tasks";
import { getCardPositionInFrontOfCamera } from "../../scripts/ygo-utils";
import { YGOTimerUtils } from "../../scripts/timer-utils";
import { Ease } from "../../scripts/ease";
import { createCardSelectionGeometry } from "../../game/meshes/CardSelectionMesh";
import { ScaleTransition } from "../utils/scale-transition";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { YGODuel } from "../../core/YGODuel";
import type { YGOTask } from "../../core/components/tasks/YGOTask";
import { liftAndSettle, moveAndRotate } from "../utils/animation-builders";

interface RevealEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Reveal;
}

export class RevealEventHandler extends YGOCommandHandler {
  private timers: YGOTimerUtils;

  constructor(private props: RevealEventHandlerProps) {
    super("reveal_card_command");
    this.props = props;
    this.timers = new YGOTimerUtils();
  }

  public start(): void {
    const { event, duel, startTask, onCompleted } = this.props;
    const sequence = new YGOTaskSequence();
    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;

    const card = new GameCard({ card: duel.ygo.state.getCardData(event.id)!, duel, stats: false });
    const timeToReveal = 1;

    if (originZoneData.zone === "D") {
      const field = duel.fields[originZoneData.player];
      const deck = field.mainDeck;
      const transform = deck.getCardTransform();

      this.flipCardAndRevealAnimation({
        card: card.gameObject,
        transform: transform,
        sequence,
        timeToReveal,
      });

    } else if (originZoneData.zone === "ED") {
      const field = duel.fields[originZoneData.player];
      const extraDeck = field.extraDeck;
      const transform = extraDeck.getCardTransform();

      this.flipCardAndRevealAnimation({
        card: card.gameObject,
        transform: transform,
        sequence,
        timeToReveal,
      });

    } else if (originZoneData.zone === "H") {
      const gameField = duel.fields[originZoneData.player];
      const originalCard = gameField.hand.getCard(originZoneData.zoneIndex - 1)!.gameObject;

      const startPosition: THREE.Vector3 = originalCard.position;
      const startRotation: THREE.Euler = originalCard.rotation;

      originalCard.visible = false;
      card.gameObject.position.copy(originalCard.position);
      card.gameObject.rotation.copy(originalCard.rotation);

      if (event.revealType === "target") {

        revealCardAnimation({
          originalCard,
          duel,
          startPosition,
          startRotation,
          card: card.gameObject,
          player: event.player,
          sequence,
          timeToReveal,
          startTask
        });

      } else {
        const targetPosition = getCardPositionInFrontOfCamera({ duel, distance: 6 });
        const targetRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

        sequence.addMultiple(
          moveAndRotate(card.gameObject, {
            position: targetPosition,
            rotation: targetRotation,
            duration: 0.5,
            rotationDuration: 0.35,
            ease: Ease.easeOutQuad,
          }),
          new WaitForSeconds(1),
          moveAndRotate(card.gameObject, {
            position: startPosition,
            rotation: startRotation,
            duration: 0.25,
            ease: Ease.easeOutQuad,
          }),
          new CallbackTransition(() => {
            originalCard.visible = true;
          })
        );
      }
    } else {
      this.timers.setTimeout(() => onCompleted());
      return;
    }

    sequence.add(new CallbackTransition(() => {
      card.destroy();
      onCompleted();
    }));

    startTask(sequence);

  }

  private flipCardAndRevealAnimation({ card, timeToReveal = 1, sequence, transform }: { card: THREE.Object3D, transform: THREE.Object3D, sequence: YGOTaskSequence, timeToReveal?: number }) {
    const { startTask, duel } = this.props;
    const startPosition = transform.position.clone();
    const startRotation = transform.rotation.clone();

    const startQuaternion = new THREE.Quaternion().setFromEuler(startRotation);
    const startQuaternionResult = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    const targetQuaternion = startQuaternion.clone().multiply(startQuaternionResult);
    const targetRotation = new THREE.Euler().setFromQuaternion(targetQuaternion);

    const abovePosition = startPosition.clone();
    abovePosition.z += 1;
    startPosition.z += 0.1;

    card.position.copy(startPosition);
    card.rotation.copy(startRotation);

    sequence.addMultiple(
      new PositionTransition({
        gameObject: card,
        duration: 0.25,
        position: abovePosition,
      }),
      new PositionTransition({
        gameObject: card,
        duration: 0.15,
        position: startPosition,
      }),
      new WaitForSeconds(timeToReveal),
      ...liftAndSettle(card, {
        above: abovePosition,
        liftDuration: 0.1,
        position: startPosition,
        rotation: startRotation,
        settleDuration: 0.15,
      }),
    );

    startTask(
      new YGOTaskSequence(
        new WaitForSeconds(0.15),
        new CallbackTransition(() => {
          this.props.playSound({ key: duel.createCdnUrl(`/sounds/reveal.ogg`), volume: 0.5 });
        }),
        new RotationTransition({
          gameObject: card,
          duration: 0.2,
          rotation: targetRotation,
        })
      )
    );

  }

  public finish(): void {
    this.timers.clear();
  }
}

/**
 * One pulse of the blue "revealed" frame: after `delay` it lights up, grows
 * by 0.4 while settling on `position`, and fades out.
 */
function selectionPulse(mesh: THREE.Mesh, material: THREE.Material, position: THREE.Vector3, delay: number): YGOTask[] {
  return [
    new WaitForSeconds(delay),
    new CallbackTransition(() => {
      material.opacity = 1;
    }),
    new MultipleTasks(
      new ScaleTransition({
        gameObject: mesh,
        scale: mesh.scale.clone().addScalar(0.4),
        duration: 0.25,
      }),
      new PositionTransition({
        gameObject: mesh,
        position,
        duration: 0.15,
      }),
      new YGOTaskSequence(
        new WaitForSeconds(0.1),
        new MaterialOpacityTransition({
          material,
          opacity: 0,
          duration: 0.15,
        })
      )
    ),
  ];
}

export function revealCardAnimation({
  duel,
  originalCard,
  card,
  player,
  sequence,
  startPosition,
  startRotation,
  timeToReveal = 1,
  startTask
}: {
  duel: YGODuel,
  player: number,
  originalCard: THREE.Object3D,
  card: THREE.Object3D,
  sequence: YGOTaskSequence,
  timeToReveal?: number,
  startPosition: THREE.Vector3,
  startRotation: THREE.Euler,
  startTask: (task: YGOTaskSequence) => void
}) {

  const endRotation1 = new THREE.Euler(startRotation.x, startRotation.y, 0);
  const endRotation = new THREE.Euler(0, 0, 0);
  const up = new THREE.Vector3(0, 1, 0);
  up.applyQuaternion(card.quaternion);
  const endPosition = startPosition.clone().add(up);
  endPosition.z += 0.1;
  const delayTarget = duel.perspective.isPlayerPOV(player) ? 0 : 0.5

  const cardSelection = createCardSelectionGeometry(2.65, 3.7, 0.1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xADD8E6,
    opacity: 0,
    transparent: true,
  });
  const material2 = new THREE.MeshBasicMaterial({
    color: 0xADD8E6,
    opacity: 0,
    transparent: true,
  });

  const targetPosition = endPosition.clone();
  targetPosition.z += 0.05;

  const cardSelectionMesh = new THREE.Mesh(cardSelection, material);
  cardSelectionMesh.position.copy(targetPosition);
  cardSelectionMesh.rotation.copy(endRotation);

  const cardSelectionMesh2 = new THREE.Mesh(cardSelection, material2);
  cardSelectionMesh2.position.copy(targetPosition);
  cardSelectionMesh2.rotation.copy(endRotation);

  duel.core.scene.add(cardSelectionMesh);
  duel.core.scene.add(cardSelectionMesh2);

  cardSelectionMesh.visible = false;
  cardSelectionMesh2.visible = false;

  sequence.addMultiple(
    new CallbackTransition(() => {

      cardSelectionMesh.visible = true;
      cardSelectionMesh2.visible = true;

      startTask(
        new YGOTaskSequence(
          ...selectionPulse(cardSelectionMesh2, material2, targetPosition, delayTarget + 0.6),
        )
      );
      startTask(new YGOTaskSequence(
        ...selectionPulse(cardSelectionMesh, material, targetPosition, delayTarget + 0.3),
        new WaitForSeconds(0.5),
        new CallbackTransition(() => {
          duel.core.scene.remove(cardSelectionMesh);
          duel.core.scene.remove(cardSelectionMesh2);
        })
      ));

    }),
    new RotationTransition({
      gameObject: card,
      rotation: endRotation1,
      duration: duel.perspective.isPlayerPOV(player) ? 0 : 0.5,
      ease: Ease.easeOutQuad
    }),
    moveAndRotate(card, {
      position: endPosition,
      rotation: endRotation,
      duration: 0.25,
      ease: Ease.easeOutQuad,
    }),
    new WaitForSeconds(timeToReveal),
    new RotationTransition({
      gameObject: card,
      duration: duel.perspective.isPlayerPOV(player) ? 0 : 0.5,
      rotation: endRotation1,
      ease: Ease.easeOutQuad
    }),
    moveAndRotate(card, {
      position: startPosition,
      rotation: startRotation,
      duration: 0.25,
      ease: Ease.easeOutQuad,
    }),
    new CallbackTransition(() => {
      originalCard.visible = true;
    })
  )
}