import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import {
  getCardRotationFromFieldZoneData,
  getGameZone,
  getZonePositionFromZoneData,
} from "../../scripts/ygo-utils";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { Card } from "ygo-core";
import { CallbackTransition } from "../utils/callback";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { MultipleTasks } from "../utils/multiple-tasks";
import { createCardPopSummonEffectSequence, GameModalOverlayMesh } from "../../game/meshes/mesh-utils";
import { MaterialOpacityTransition } from "../utils/material-opacity";

interface XYZSummonEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.XYZSummon;
}

export class XYZSummonEventHandler extends YGOCommandHandler {
  private props: XYZSummonEventHandlerProps;
  private cardReference: Card;

  constructor(props: XYZSummonEventHandlerProps) {
    super("xyz_summon_command");
    this.props = props;
    const event = this.props.event;
    this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone);
  }

  public start(): void {
    const { event, duel, startTask } = this.props;
    const sequence = new YGOTaskSequence();

    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const zoneData = YGOGameUtils.getZoneData(event.zone)!;

    const camera = duel.camera;
    const cardZone = getGameZone(duel, zoneData);
    const endPosition = getZonePositionFromZoneData(duel, zoneData);
    const endRotation = getCardRotationFromFieldZoneData(
      duel,
      this.cardReference,
      zoneData
    );

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const startPosition = camera.position
      .clone()
      .add(direction.multiplyScalar(4));

    const card = new GameCard({ duel, card: this.cardReference });
    card.hideCardStats();
    card.gameObject.position.copy(startPosition);
    card.gameObject.visible = false;
    card.gameObject.lookAt(camera.position);

    const modal = GameModalOverlayMesh();
    duel.core.scene.add(modal);

    const cardOverlay = card.gameObject.clone();
    duel.core.sceneOverlay.add(cardOverlay);
    card.gameObject.visible = false;
    cardOverlay.visible = false;

    modal.material.opacity = 0;

    startTask(
      new YGOTaskSequence(
        new MaterialOpacityTransition({
          material: modal.material,
          opacity: 0.7,
          duration: 0.15,
        }),
        new WaitForSeconds(0.75),
        new MaterialOpacityTransition({
          material: modal.material,
          opacity: 0,
          duration: 0.15,
        })
      )
    );

    sequence
      .add(
        new CallbackTransition(() => {
          cardOverlay.visible = true;
          duel.core.enableRenderOverlay();
          duel.fields[originZoneData.player].extraDeck.updateExtraDeck();
          createCardPopSummonEffectSequence({
            duel,
            card: cardOverlay,
            cardData: duel.ygo.state.getCardData(event.id)!,
            startTask: this.props.startTask,
          });
          this.props.playSound({ key: duel.createCdnUrl(`/sounds/extra_deck_summon.ogg`), volume: 0.8 });
        })
      )
      .add(new WaitForSeconds(1))
      .add(
        new MultipleTasks(
          new PositionTransition({
            gameObject: cardOverlay,
            position: endPosition,
            duration: 0.5,
          }),
          new RotationTransition({
            gameObject: cardOverlay,
            rotation: endRotation,
            duration: 0.5,
          })
        )
      )
      .add(
        new CallbackTransition(() => {
          card.gameObject.position.copy(cardOverlay.position);
          card.gameObject.rotation.copy(cardOverlay.rotation);
          card.gameObject.scale.copy(cardOverlay.scale);
          card.gameObject.visible = true;
          duel.core.disableRenderOverlay();
          cardZone?.setGameCard(card);
          this.props.onCompleted();
        })
      );

    startTask(sequence);

  }
}
