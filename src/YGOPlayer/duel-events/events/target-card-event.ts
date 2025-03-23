import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { getGameZone } from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import { ScaleTransition } from "../utils/scale-transition";
import * as THREE from "three";
import { MultipleTasks } from "../utils/multiple-tasks";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { createCardSelectionGeometry } from "../../game/meshes/CardSelectionMesh";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { WaitForSeconds } from "../utils/wait-for-seconds";

interface TargetCardEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Target;
}

export class TargetCardEventHandler extends YGOCommandHandler {
  private props: TargetCardEventHandlerProps;

  constructor(props: TargetCardEventHandlerProps) {
    super("move_card_command");
    this.props = props;
    const event = this.props.event;
  }

  public start(): void {
    const { event, duel } = this.props;
    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const cardZone = getGameZone(duel, originZoneData);
    const card = cardZone?.getGameCard();

    if (card) {
      const cardSelection = createCardSelectionGeometry(2.65, 3.7, 0.1);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        opacity: 1,
        transparent: true,
      });
      const cardSelectionMesh = new THREE.Mesh(cardSelection, material);
      const targetPosition = card.gameObject.position.clone();
      targetPosition.z += 0.05;

      material.opacity = 1;
      cardSelectionMesh.position.copy(card.gameObject.position);
      cardSelectionMesh.rotation.copy(card.gameObject.rotation);

      duel.core.scene.add(cardSelectionMesh);

      const sequence = new YGOTaskSequence(
        new MultipleTasks(
          new ScaleTransition({
            gameObject: cardSelectionMesh,
            scale: cardSelectionMesh.scale.clone().addScalar(0.2),
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
        new CallbackTransition(() => {
          duel.core.scene.remove(cardSelectionMesh);
          this.props.onCompleted();
        })
      );

      this.props.startTask(sequence);
    } else {
      // TODO IMPLEMENT OTHER CARD POSITIONS
      this.props.onCompleted();
    }
  }
}
