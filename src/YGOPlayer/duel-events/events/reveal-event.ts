import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { YGOComponent } from "../../core/YGOComponent";
import { Card } from "ygo-core";
import { CallbackTransition } from "../utils/callback";

interface RevealEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Reveal;
}

export class RevealEventHandler extends YGOComponent {
  private cardReference: Card;

  constructor(private props: RevealEventHandlerProps) {
    super("reveal_card_command");
    this.props = props;
    this.cardReference = this.props.ygo.state.getCardById(
      this.props.event.id,
      this.props.event.originZone
    );
  }

  public start(): void {
    const { event, duel, startTask } = this.props;
    const gameField = duel.fields[this.props.event.player];
    const sequence = new YGOTaskSequence();
    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;

    let originalCard!: THREE.Object3D;
    const card = new GameCard({ card: this.cardReference, duel });

    if (originZoneData.zone === "M") {
      originalCard =
        gameField.monsterZone[originZoneData.zoneIndex - 1].getGameCard()!
          .gameObject;
    } else if (originZoneData.zone === "H") {
      originalCard = gameField.hand.getCard(
        originZoneData.zoneIndex - 1
      )!.gameObject;
    }

    const startPosition: THREE.Vector3 = originalCard.position;
    const startRotation: THREE.Euler = originalCard.rotation;

    const targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 10);
    const targetRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

    originalCard.visible = false;

    card.gameObject.position.copy(originalCard.position);
    card.gameObject.rotation.copy(originalCard.rotation);

    startTask(
      new RotationTransition({
        gameObject: card.gameObject,
        duration: 0.25,
        rotation: targetRotation,
      })
    );

    sequence.add(
      new PositionTransition({
        gameObject: card.gameObject,
        position: targetPosition,
        duration: 0.5,
      })
    );
    sequence.add(new WaitForSeconds(1));
    sequence.add(
      new CallbackTransition(() => {
        startTask(
          new RotationTransition({
            gameObject: card.gameObject,
            duration: 0.1,
            rotation: startRotation,
          })
        );
      })
    );
    sequence.add(
      new PositionTransition({
        gameObject: card.gameObject,
        position: startPosition,
        duration: 0.25,
      })
    );
    sequence.add(
      new CallbackTransition(() => {
        originalCard.visible = true;
        card.destroy();
        this.props.onCompleted();
      })
    );

    startTask(sequence);
  }
}
