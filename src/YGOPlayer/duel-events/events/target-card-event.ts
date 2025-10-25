import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { getCardRotationFromPlayerIndex, getGameZone, getZonePositionFromZoneData } from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import { ScaleTransition } from "../utils/scale-transition";
import * as THREE from "three";
import { MultipleTasks } from "../utils/multiple-tasks";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { createCardSelectionGeometry } from "../../game/meshes/CardSelectionMesh";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { GameCard } from "../../game/GameCard";

interface TargetCardEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Target;
}

export class TargetCardEventHandler extends YGOCommandHandler {
  private props: TargetCardEventHandlerProps;

  constructor(props: TargetCardEventHandlerProps) {
    super("target_card_command");
    this.props = props;
  }

  public start(): void {
    const { event, duel } = this.props;
    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const cardZone = getGameZone(duel, originZoneData);
    let card = cardZone?.getGameCard();
    let destroyCard = false;

    if (!card) {
      alert("HERE");
      const cardRef = duel.ygo.state.getCardData(event.id)!;
      card = new GameCard({ card: cardRef, duel, stats: false });
      destroyCard = true;

      const position = getZonePositionFromZoneData(duel, originZoneData);
      const rotation = getCardRotationFromPlayerIndex(originZoneData.player);

      card.gameObject.position.copy(position);
      card.gameObject.rotation.copy(rotation);
    }

    const cardSelection = createCardSelectionGeometry(2.65, 3.7, 0.1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      opacity: 1,
      transparent: true,
    });
    const material2 = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      opacity: 0,
      transparent: true,
    });

    const targetPosition = card.gameObject.position.clone();
    targetPosition.z += 0.1;

    const cardSelectionMesh = new THREE.Mesh(cardSelection, material);
    cardSelectionMesh.position.copy(card.gameObject.position);
    cardSelectionMesh.rotation.copy(card.gameObject.rotation);

    const cardSelectionMesh2 = new THREE.Mesh(cardSelection, material2);
    cardSelectionMesh2.position.copy(card.gameObject.position);
    cardSelectionMesh2.rotation.copy(card.gameObject.rotation);

    if (event.position?.includes("facedown")) {
      cardSelectionMesh.rotateY(THREE.MathUtils.degToRad(180));
      cardSelectionMesh2.rotateY(THREE.MathUtils.degToRad(180));
    }

    duel.core.scene.add(cardSelectionMesh);
    duel.core.scene.add(cardSelectionMesh2);

    this.props.startTask(
      new YGOTaskSequence(
        new WaitForSeconds(0.25),
        new CallbackTransition(() => {
          cardSelectionMesh2.material.opacity = 1;
          this.props.playSound({ key: duel.createCdnUrl(`/sounds/target.ogg`), volume: 0.5 });
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

    const sequence = new YGOTaskSequence(
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
        if (destroyCard) {
          card.destroy();
        }

        duel.core.scene.remove(cardSelectionMesh);
        duel.core.scene.remove(cardSelectionMesh2);
        this.props.onCompleted();
      })
    );

    this.props.startTask(sequence);

  }
}
