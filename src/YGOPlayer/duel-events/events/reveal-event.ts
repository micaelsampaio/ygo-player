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
import { YGOStatic } from "../../core/YGOStatic";
import { createCardSelectionGeometry } from "../../game/meshes/CardSelectionMesh";
import { ScaleTransition } from "../utils/scale-transition";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { YGODuel } from "../../core/YGODuel";

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
        const targetPosition = getCardPositionInFrontOfCamera({ camera: duel.core.camera, distance: 6 });
        const targetRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

        sequence.addMultiple(
          new MultipleTasks(
            new PositionTransition({
              gameObject: card.gameObject,
              position: targetPosition,
              duration: 0.5,
              ease: Ease.easeOutQuad
            }),
            new RotationTransition({
              gameObject: card.gameObject,
              duration: 0.35,
              rotation: targetRotation,
              ease: Ease.easeOutQuad
            })
          ),
          new WaitForSeconds(1),
          new MultipleTasks(
            new RotationTransition({
              gameObject: card.gameObject,
              duration: 0.25,
              rotation: startRotation,
              ease: Ease.easeOutQuad
            }),
            new PositionTransition({
              gameObject: card.gameObject,
              position: startPosition,
              duration: 0.25,
              ease: Ease.easeOutQuad
            })
          ),
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
      new PositionTransition({
        gameObject: card,
        duration: 0.1,
        position: abovePosition,
      }),
      new MultipleTasks(
        new PositionTransition({
          gameObject: card,
          duration: 0.15,
          position: startPosition,
        }),
        new RotationTransition({
          gameObject: card,
          duration: 0.15,
          rotation: startRotation,
        })
      )
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

  public _start(): void {
    // const { event, duel, startTask } = this.props;
    // const gameField = duel.fields[this.props.event.player];
    // const sequence = new YGOTaskSequence();
    // const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;

    // let originalCard!: THREE.Object3D;
    // const card = new GameCard({ card: this.cardReference, duel });

    // if (originZoneData.zone === "M") {
    //   originalCard = gameField.monsterZone[originZoneData.zoneIndex - 1].getGameCard()!.gameObject;
    // } else if (originZoneData.zone === "H") {
    //   originalCard = gameField.hand.getCard(originZoneData.zoneIndex - 1)!.gameObject;
    // }

    // const startPosition: THREE.Vector3 = originalCard.position;
    // const startRotation: THREE.Euler = originalCard.rotation;

    // const targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 10);
    // const targetRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

    // originalCard.visible = false;

    // card.gameObject.position.copy(originalCard.position);
    // card.gameObject.rotation.copy(originalCard.rotation);

    // startTask(
    //   new RotationTransition({
    //     gameObject: card.gameObject,
    //     duration: 0.25,
    //     rotation: targetRotation,
    //   })
    // );

    // sequence.add(
    //   new PositionTransition({
    //     gameObject: card.gameObject,
    //     position: targetPosition,
    //     duration: 0.5,
    //   })
    // );
    // sequence.add(new WaitForSeconds(1));
    // sequence.add(
    //   new CallbackTransition(() => {
    //     startTask(
    //       new RotationTransition({
    //         gameObject: card.gameObject,
    //         duration: 0.1,
    //         rotation: startRotation,
    //       })
    //     );
    //   })
    // );
    // sequence.add(
    //   new PositionTransition({
    //     gameObject: card.gameObject,
    //     position: startPosition,
    //     duration: 0.25,
    //   })
    // );
    // sequence.add(
    //   new CallbackTransition(() => {
    //     originalCard.visible = true;
    //     card.destroy();
    //     this.props.onCompleted();
    //   })
    // );

    // startTask(sequence);
  }
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
  const delayTarget = YGOStatic.isPlayerPOV(player) ? 0 : 0.5

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
          new WaitForSeconds(delayTarget + 0.6),
          new CallbackTransition(() => {
            cardSelectionMesh2.material.opacity = 1;
          }),
          new MultipleTasks(
            new ScaleTransition({
              gameObject: cardSelectionMesh2,
              scale: cardSelectionMesh2.scale.clone().addScalar(0.4),
              duration: 0.25,
            }),
            new PositionTransition({
              gameObject: cardSelectionMesh2,
              position: targetPosition,
              duration: 0.15,
            }),
            new YGOTaskSequence(
              new WaitForSeconds(0.1),
              new MaterialOpacityTransition({
                material: material2,
                opacity: 0,
                duration: 0.15,
              })
            )
          ),
        )
      );
      startTask(new YGOTaskSequence(

        new WaitForSeconds(delayTarget + 0.3),
        new CallbackTransition(() => {
          cardSelectionMesh.material.opacity = 1;
        }),
        new MultipleTasks(
          new ScaleTransition({
            gameObject: cardSelectionMesh,
            scale: cardSelectionMesh.scale.clone().addScalar(0.4),
            duration: 0.25,
          }),
          new PositionTransition({
            gameObject: cardSelectionMesh,
            position: targetPosition,
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
      duration: YGOStatic.isPlayerPOV(player) ? 0 : 0.5,
      ease: Ease.easeOutQuad
    }),
    new MultipleTasks(
      new PositionTransition({
        gameObject: card,
        position: endPosition,
        duration: 0.25,
        ease: Ease.easeOutQuad
      }),
      new RotationTransition({
        gameObject: card,
        rotation: endRotation,
        duration: 0.25,
        ease: Ease.easeOutQuad
      })
    ),
    new WaitForSeconds(timeToReveal),
    new RotationTransition({
      gameObject: card,
      duration: YGOStatic.isPlayerPOV(player) ? 0 : 0.5,
      rotation: endRotation1,
      ease: Ease.easeOutQuad
    }),
    new MultipleTasks(
      new RotationTransition({
        gameObject: card,
        duration: 0.25,
        rotation: startRotation,
        ease: Ease.easeOutQuad
      }),
      new PositionTransition({
        gameObject: card,
        position: startPosition,
        duration: 0.25,
        ease: Ease.easeOutQuad
      })
    ),
    new CallbackTransition(() => {
      originalCard.visible = true;
    })
  )
}