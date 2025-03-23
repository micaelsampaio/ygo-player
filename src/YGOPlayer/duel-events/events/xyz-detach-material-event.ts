import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { ScaleTransition } from "../utils/scale-transition";
import { CardEmptyMesh } from "../../game/meshes/mesh-utils";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { getGameZone } from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { MultipleTasks } from "../utils/multiple-tasks";
import { PositionTransition } from "../utils/position-transition";
import { GameCard } from "../../game/GameCard";
import { RotationTransition } from "../utils/rotation-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";

interface XYZDetachMaterialHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.XYZDetach;
}

export class XYZDetachMaterialHandler extends YGOCommandHandler {
  private props: XYZDetachMaterialHandlerProps;

  constructor(props: XYZDetachMaterialHandlerProps) {
    super("xyz_overlay_command");
    this.props = props;
  }

  public start(): void {
    const { event, duel, startTask } = this.props;

    const zoneData = YGOGameUtils.getZoneData(event.overlayZone);
    const cardReference = duel.ygo.state.getCardData(event.materialId)!;
    const gy = duel.fields[event.owner].graveyard;

    const endPosition: THREE.Vector3 = gy.cardPosition.clone();
    const endRotation: THREE.Euler = gy.rotation.clone();

    let startPosition: THREE.Vector3;
    let startRotation: THREE.Euler;

    if (zoneData.zone === "ORUEMZ") {
      const extraMonsterZone =
        duel.fields[zoneData.player].extraMonsterZone[zoneData.zoneIndex - 1]!;
      startPosition = extraMonsterZone.position.clone();
      startRotation = extraMonsterZone.rotation.clone();
    } else {
      const monsterZone =
        duel.fields[zoneData.player].monsterZone[zoneData.zoneIndex - 1]!;
      startPosition = monsterZone.position.clone();
      startRotation = monsterZone.rotation.clone();
    }

    startPosition.z += 0.02;
    const card = new GameCard({ card: cardReference, duel });
    card.gameObject.visible = false;

    const overlayEffect = CardEmptyMesh({ color: 0xffff00, transparent: true });
    overlayEffect.position.copy(startPosition);
    overlayEffect.rotation.copy(startRotation);

    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion(overlayEffect.quaternion);

    overlayEffect.position.add(rightVector.multiplyScalar(0.1));
    overlayEffect.position.z -= 0.05;
    overlayEffect.rotateZ(THREE.MathUtils.degToRad(-10));
    overlayEffect.material.opacity = 0;

    duel.core.scene.add(overlayEffect);

    card.gameObject.position.copy(overlayEffect.position);
    card.gameObject.rotation.copy(overlayEffect.rotation);

    const sequence = new YGOTaskSequence(
      new MaterialOpacityTransition({
        material: overlayEffect.material,
        opacity: 1,
        duration: 0.15,
      }),
      new CallbackTransition(() => {
        card.gameObject.visible = true;
      }),
      new MultipleTasks(
        new MaterialOpacityTransition({
          material: overlayEffect.material,
          opacity: 0,
          duration: 0.1,
        }),
        new PositionTransition({
          gameObject: card.gameObject,
          position: endPosition,
          duration: 0.5,
        }),
        new RotationTransition({
          gameObject: card.gameObject,
          rotation: endRotation,
          duration: 0.35,
        })
      )
    );

    gy.createSendToGraveyardEffect({ card: card.gameObject, sequence });

    startTask(
      new YGOTaskSequence(
        new WaitForSeconds(0.1),
        new MaterialOpacityTransition({
          material: overlayEffect.material,
          opacity: 0,
          duration: 0.15,
        })
      )
    );

    sequence.add(
      new CallbackTransition(() => {
        card.destroy();
        duel.core.scene.remove(overlayEffect);
        this.props.onCompleted();
      })
    );

    startTask(sequence);
  }
}
