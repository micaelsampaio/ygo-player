import * as THREE from "three";
import { Card, FieldZone, YGOGameUtils } from "ygo-core";
import type { DuelEventHandlerProps } from "..";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import { CardEmptyMesh, createCardPopSummonEffectSequence, GameModalOverlayMesh } from "../../game/meshes/mesh-utils";
import {
  getCardPositionInFrontOfCamera,
  getCardRotationFromFieldZoneData,
  getGameZone,
  getZonePositionFromZoneData,
} from "../../scripts/ygo-utils";
import { CallbackTransition } from "./callback";
import { MaterialOpacityTransition } from "./material-opacity";
import { MultipleTasks } from "./multiple-tasks";
import { PositionTransition } from "./position-transition";
import { RotationTransition } from "./rotation-transition";
import { ScaleTransition } from "./scale-transition";
import { WaitForSeconds } from "./wait-for-seconds";

/** How far in front of the camera the summoned card pops (farther on the narrower mobile view). */
export function extraDeckSummonPopDistance(isMobileLayout: boolean): number {
  return isMobileLayout ? 6 : 4;
}

/**
 * The materials of a Link / Synchro Summon flash in `color` and shrink away
 * (with the materials_vanish sound); `sequence` then waits for them before
 * the summon itself. Nothing happens without materials.
 */
export function vanishMaterials(
  props: DuelEventHandlerProps,
  sequence: YGOTaskSequence,
  materials: { zone: FieldZone }[] | undefined,
  color: number,
) {
  if (!materials || materials.length === 0) return;
  const { duel, startTask } = props;

  props.playSound({ key: duel.createCdnUrl(`/sounds/materials_vanish.ogg`), volume: 0.25 });

  for (const materialData of materials) {
    const originCardZone = getGameZone(duel, YGOGameUtils.getZoneData(materialData.zone)!)!;
    const card = originCardZone.getGameCard()!;
    if (!card) continue;

    const cardEffect = CardEmptyMesh({ color, transparent: true });
    cardEffect.material.opacity = 0;
    duel.core.scene.add(cardEffect);
    originCardZone.removeCard();

    cardEffect.position.copy(card.gameObject.position);
    cardEffect.rotation.copy(card.gameObject.rotation);
    cardEffect.position.z += 0.05;

    card.hideCardStats();

    startTask(
      new YGOTaskSequence(
        new MaterialOpacityTransition({ material: cardEffect.material, opacity: 1, duration: 0.15 }),
        new CallbackTransition(() => {
          card.destroy();
        }),
        new ScaleTransition({ gameObject: cardEffect, scale: new THREE.Vector3(0, 0, 0), duration: 0.2 }),
        new CallbackTransition(() => {
          duel.core.scene.remove(cardEffect);
        })
      )
    );
  }

  sequence.add(new WaitForSeconds(0.5));
}

/**
 * The summoned monster leaves the Extra Deck: the board dims, the card pops
 * in front of the camera (extra_deck_summon sound), flies to its zone and is
 * handed to it; then `onCompleted`. Appended to `sequence`, which the caller starts.
 */
export function extraDeckSummonSequence(
  props: DuelEventHandlerProps,
  sequence: YGOTaskSequence,
  { cardReference, cardId, zone, originZone }: { cardReference: Card; cardId: number; zone: FieldZone; originZone: FieldZone },
) {
  const { duel, startTask } = props;
  const originZoneData = YGOGameUtils.getZoneData(originZone)!;
  const zoneData = YGOGameUtils.getZoneData(zone)!;
  const camera = duel.camera;

  const cardZone = getGameZone(duel, zoneData);
  const endPosition = getZonePositionFromZoneData(duel, zoneData);
  const endRotation = getCardRotationFromFieldZoneData(duel, cardReference, zoneData);

  const startPosition = getCardPositionInFrontOfCamera({ duel, distance: extraDeckSummonPopDistance(duel.core.isMobileLayout) });
  const card = new GameCard({ duel, card: cardReference, player: zoneData.player });
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
      new MaterialOpacityTransition({ material: modal.material, opacity: 0.7, duration: 0.25 }),
      new WaitForSeconds(1.25),
      new MaterialOpacityTransition({ material: modal.material, opacity: 0, duration: 0.15 })
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
          cardData: duel.ygo.state.getCardData(cardId)!,
          startTask,
        });
        props.playSound({ key: duel.createCdnUrl(`/sounds/extra_deck_summon.ogg`), volume: 0.8 });
      })
    )
    .add(new WaitForSeconds(1))
    .add(
      new MultipleTasks(
        new PositionTransition({ gameObject: cardOverlay, position: endPosition, duration: 0.5 }),
        new RotationTransition({ gameObject: cardOverlay, rotation: endRotation, duration: 0.5 })
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
        props.onCompleted();
      })
    );
}
