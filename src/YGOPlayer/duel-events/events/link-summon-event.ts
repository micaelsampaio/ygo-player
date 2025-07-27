import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import {
  getCardPositionInFrontOfCamera,
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
import { ScaleTransition } from "../utils/scale-transition";
import {
  CardEmptyMesh,
  createCardPopSummonEffectSequence,
  GameModalOverlayMesh,
} from "../../game/meshes/mesh-utils";
import { MaterialOpacityTransition } from "../utils/material-opacity";

interface LinkSummonEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.LinkSummon;
}

export class LinkSummonEventHandler extends YGOCommandHandler {
  private props: LinkSummonEventHandlerProps;
  private cardReference: Card;

  constructor(props: LinkSummonEventHandlerProps) {
    super("link_summon_command");
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

    if (event.materials?.length > 0) {

      this.props.playSound({ key: duel.createCdnUrl(`/sounds/materials_vanish.ogg`), volume: 0.25 });

      for (let i = 0; i < event.materials.length; ++i) {
        const materialData = event.materials[i];
        const originZoneData = YGOGameUtils.getZoneData(materialData.zone)!;
        const originCardZone = getGameZone(duel, originZoneData)!;

        const card = originCardZone.getGameCard()!;

        if (!card) continue;
        //const material = originCardZone.getCardReference()!;

        const cardEffect = CardEmptyMesh({
          color: 0xff0000,
          transparent: true,
        });
        cardEffect.material.opacity = 0;
        duel.core.scene.add(cardEffect);
        originCardZone.removeCard();

        cardEffect.position.copy(card.gameObject.position);
        cardEffect.rotation.copy(card.gameObject.rotation);
        cardEffect.position.z += 0.05;

        card.hideCardStats();

        startTask(
          new YGOTaskSequence(
            new MaterialOpacityTransition({
              material: cardEffect.material,
              opacity: 1,
              duration: 0.15,
            }),
            new CallbackTransition(() => {
              card.destroy();
            }),
            new ScaleTransition({
              gameObject: cardEffect,
              scale: new THREE.Vector3(0, 0, 0),
              duration: 0.2,
            }),
            new CallbackTransition(() => {
              duel.core.scene.remove(cardEffect);
            })
          )
        );
      }

      sequence.add(new WaitForSeconds(0.5));
    }

    const cardZone = getGameZone(duel, zoneData);
    const endPosition = getZonePositionFromZoneData(duel, zoneData);
    const endRotation = getCardRotationFromFieldZoneData(
      duel,
      this.cardReference,
      zoneData
    );

    const startPosition = getCardPositionInFrontOfCamera({ camera });
    const card = new GameCard({ duel, card: this.cardReference });
    card.hideCardStats();
    card.gameObject.position.copy(startPosition);
    card.gameObject.visible = false;
    card.gameObject.lookAt(camera.position);

    const modal = GameModalOverlayMesh();
    duel.core.scene.add(modal);

    const cardOverlay = card.gameObject.clone();
    duel.core.sceneOverlay.add(cardOverlay);

    modal.material.opacity = 0;

    startTask(
      new YGOTaskSequence(
        new WaitForSeconds(0.3),
        new MaterialOpacityTransition({
          material: modal.material,
          opacity: 0.7,
          duration: 0.25,
        }),
        new WaitForSeconds(1.25),
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
          cardZone?.setGameCard(card);
          duel.core.disableRenderOverlay();
          duel.core.scene.remove(modal);
          this.props.onCompleted();
        })
      );

    startTask(sequence);

  }
}
