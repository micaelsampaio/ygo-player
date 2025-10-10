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

      originalCard.visible = false;

      const startPosition: THREE.Vector3 = originalCard.position;
      const startRotation: THREE.Euler = originalCard.rotation;

      const targetPosition = getCardPositionInFrontOfCamera({ camera: duel.core.camera, distance: 6 });
      const targetRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

      originalCard.visible = false;

      card.gameObject.position.copy(originalCard.position);
      card.gameObject.rotation.copy(originalCard.rotation);
      sequence.addMultiple(
        new MultipleTasks(
          new PositionTransition({
            gameObject: card.gameObject,
            position: targetPosition,
            duration: 0.5,
          }),
          new RotationTransition({
            gameObject: card.gameObject,
            duration: 0.35,
            rotation: targetRotation,
          })
        ),
        new WaitForSeconds(1),
        new MultipleTasks(
          new RotationTransition({
            gameObject: card.gameObject,
            duration: 0.25,
            rotation: startRotation,
          }),
          new PositionTransition({
            gameObject: card.gameObject,
            position: startPosition,
            duration: 0.25,
          })
        ),
        new CallbackTransition(() => {
          originalCard.visible = true;
          card.destroy();
          this.props.onCompleted();
        })
      );
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
