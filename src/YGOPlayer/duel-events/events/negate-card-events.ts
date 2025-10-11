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
  getZonePositionFromZoneData,
  isCardTransformFlipDown,
} from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import {
  CardNegationEffect,
  GameCardGrayscale,
  GameModalOverlayMesh,
} from "../../game/meshes/mesh-utils";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { MultipleTasks } from "../utils/multiple-tasks";
import { RotationTransition } from "../utils/rotation-transition";

interface NegateCardHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Negate;
}

export class NegateCardHandler extends YGOCommandHandler {
  private command: YGOCommandHandler | undefined;

  constructor(private props: NegateCardHandlerProps) {
    super("negate_command");
  }

  start() {
    const { ygo, duel, event } = this.props;

    const cardReference = ygo.state.getCardById(event.id, event.originZone);
    const zoneData = YGOGameUtils.getZoneData(event.originZone);
    const cardZone = getGameZone(duel, zoneData);
    const sequence = new YGOTaskSequence();
    const field = duel.fields[zoneData.player];
    let modalDuration = 0.4;
    let negationDelay = 0;

    if (duel.settings.getConfigFromPath("showCardWhenPlayed")) {
      duel.gameActions.setSelectedCard({
        player: zoneData.player,
        card: cardReference,
        force: true
      })
    }

    const modal = GameModalOverlayMesh();
    modal.material.opacity = 0;
    duel.core.scene.add(modal);
    duel.core.enableRenderOverlay();
    this.props.startTask(new YGOTaskSequence(
      new WaitForSeconds(0.2),
      new CallbackTransition(() => {
        this.props.playSound({ key: duel.createCdnUrl(`/sounds/negate.ogg`), volume: 0.7 });
      })
    ));


    if (zoneData.zone === "GY" || zoneData.zone === "B") {
      const cardOverlay = new GameCardGrayscale({ duel, card: cardReference });
      const startPosition: THREE.Vector3 = getZonePositionFromZoneData(duel, zoneData);
      const startRotation: THREE.Euler = getCardRotationFromFieldZoneData(duel, cardReference, zoneData);

      cardOverlay.gameObject.position.copy(startPosition);
      cardOverlay.gameObject.rotation.copy(startRotation);

      duel.core.sceneOverlay.add(cardOverlay.gameObject);

      CardNegationEffect({
        duel,
        card: cardOverlay.gameObject,
        startTask: this.props.startTask,
      });

      this.createNegationEffect(sequence, cardOverlay.gameObject, startPosition);
    } else if (zoneData.zone === "H") {
      const card = field.hand.getCardFromReference(cardReference);
      const cardOverlay = new GameCardGrayscale({ duel, card: cardReference });
      const startPosition: THREE.Vector3 = card.position.clone();
      const startRotation: THREE.Euler = card.gameObject.rotation.clone();
      const isFlipDown = isCardTransformFlipDown(card.gameObject);
      const originalRotation = card.gameObject.rotation.clone();

      card.gameObject.visible = false;

      cardOverlay.gameObject.position.copy(startPosition);
      cardOverlay.gameObject.rotation.copy(startRotation);

      duel.core.sceneOverlay.add(cardOverlay.gameObject);

      const up = new THREE.Vector3(0, 1, 0);
      up.applyQuaternion(card.gameObject.quaternion);

      card.isUiElementClick = false;
      card.isUiElementHover = false;

      if (isFlipDown) {
        modalDuration += 0.35;
        const rotation = originalRotation.clone();
        rotation.y = 0;

        sequence.add(new RotationTransition({
          gameObject: cardOverlay.gameObject,
          duration: 0.25,
          rotation: rotation
        }))
      }

      CardNegationEffect({
        duel,
        delay: negationDelay,
        card: cardOverlay.gameObject,
        startTask: this.props.startTask,
      });

      this.createNegationEffect(sequence, cardOverlay.gameObject, startPosition, up);

      sequence.add(
        new CallbackTransition(() => {
          card.gameObject.visible = true;
          card.gameObject.position.copy(startPosition);
          card.gameObject.rotation.copy(startRotation);
          card.isUiElementClick = true;
          card.isUiElementHover = true;
        })
      );
    } else if (cardZone) {
      const card = getGameZone(duel, zoneData)!.getGameCard();
      const cardOverlay = new GameCardGrayscale({ duel, card: cardReference });
      card.hideCardStats();

      cardOverlay.gameObject.position.copy(card.gameObject.position);
      cardOverlay.gameObject.rotation.copy(card.gameObject.rotation);

      duel.core.sceneOverlay.add(cardOverlay.gameObject);

      card.gameObject.visible = false;

      CardNegationEffect({
        duel,
        card: cardOverlay.gameObject,
        startTask: this.props.startTask,
      });

      this.createNegationEffect(
        sequence,
        cardOverlay.gameObject,
        card.gameObject.position.clone()
      );

      sequence.add(
        new CallbackTransition(() => {
          card.gameObject.visible = true;
          card.updateCardStats(zoneData);
        })
      );
    } else {
      this.props.onCompleted();
    }

    this.props.startTask(
      new YGOTaskSequence(
        new MaterialOpacityTransition({
          material: modal.material,
          duration: 0.25,
          opacity: 0.7,
        }),
        new WaitForSeconds(modalDuration),
        new MaterialOpacityTransition({
          material: modal.material,
          duration: 0.25,
          opacity: 0,
        })
      )
    );

    sequence.add(
      new CallbackTransition(() => {
        duel.core.disableRenderOverlay();
        this.props.onCompleted();
      })
    );

    this.props.startTask(sequence);
  }

  public createNegationEffect(
    seq: YGOTaskSequence,
    card: THREE.Object3D,
    startPos: THREE.Vector3,
    axis: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
  ) {
    const position = startPos.clone();
    const rotation = card.rotation.clone();
    position.add(axis);
    seq
      .add(
        new PositionTransition({
          gameObject: card,
          position,
          duration: 0.25,
        })
      )
      .add(new WaitForSeconds(0.5))
      .add(
        new MultipleTasks(
          new PositionTransition({
            gameObject: card,
            position: startPos,
            duration: 0.15,
          }),
          new RotationTransition({
            gameObject: card,
            rotation,
            duration: 0.15,
          }),
        )
      );
  }

  public finish(): void {
    this.command?.finish();
  }
}
