import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils, Card } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { GameCard } from "../../game/GameCard";
import { getCardRotationFromFieldZoneData, getGameZone, getZonePositionFromZoneData, } from "../../scripts/ygo-utils";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { CallbackTransition } from "../utils/callback";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { MultipleTasks } from "../utils/multiple-tasks";
import { UpdateTask } from "../utils/update-task";
import { ScaleTransition } from "../utils/scale-transition";
import {
  CardEmptyMesh,
  createCardPopSummonEffectSequence,
} from "../../game/meshes/mesh-utils";
import { MaterialOpacityTransition } from "../utils/material-opacity";

interface FusionSummonEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.FusionSummon;
}

export class FusionSummonEventHandler extends YGOCommandHandler {
  private props: FusionSummonEventHandlerProps;
  private cardReference: Card;
  private cards: THREE.Object3D[];

  constructor(props: FusionSummonEventHandlerProps) {
    super("fusion_summon_command");
    this.props = props;
    this.cards = [];
    const event = this.props.event;
    this.cardReference = this.props.ygo.state.getCardById(event.id, event.zone);
  }

  public start(): void {
    const { event, duel, startTask } = this.props;
    const sequence = new YGOTaskSequence();

    const radius = 2;
    const camera = duel.camera;
    const direction = new THREE.Vector3();

    camera.getWorldDirection(direction);
    const pivotPosition = camera.position.clone().add(direction.multiplyScalar(8));
    const materialsCount = event.materials.length;
    const hasMaterials = event.materials.length > 0;

    // Initial setup of cards in a circle
    this.cards = event.materials.map((material: any, i: any) => {
      const zoneData = YGOGameUtils.getZoneData(material.zone);
      const cardZone = getGameZone(duel, zoneData)!;
      let card: GameCard;
      let cardOverlay: THREE.Object3D;

      if (cardZone && cardZone.getGameCard()) {
        card = cardZone.getGameCard();
        card.hideCardStats();
        cardOverlay = card.gameObject.clone();
        cardZone.setCard(null);
      } else {
        const cardRef = duel.ygo.state.getCardData(material.id)!;
        card = new GameCard({ card: cardRef, duel, stats: false });
        cardOverlay = card.gameObject.clone();
        card.destroy();
      }

      if (!card) return null;

      const startRadius = radius * 2;
      const angle = (i / materialsCount) * Math.PI * 2;
      cardOverlay.rotation.set(0, 0, 0);
      cardOverlay.position
        .copy(pivotPosition)
        .add(
          new THREE.Vector3(
            Math.cos(angle) * startRadius,
            Math.sin(angle) * startRadius,
            0
          )
        );

      duel.core.sceneOverlay.add(cardOverlay);

      return cardOverlay;
    }).filter(c => c) as any;

    duel.updateHand(event.player);
    duel.fields[event.player].mainDeck.updateDeck();
    duel.fields[event.player].extraDeck.updateExtraDeck();

    this.cards.forEach((card) => {
      card.scale.set(0, 0, 0);
      startTask(
        new ScaleTransition({
          gameObject: card,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.15,
        })
      );
    });

    const fusionImage = duel.assets.getTexture(
      `${duel.config.cdnUrl}/images/particles/twirl_03.png`
    );
    const fusionPlaneGeometry = new THREE.PlaneGeometry(10, 10);
    const fusionPlane1Mat = new THREE.MeshBasicMaterial({
      color: 0xffa500,
      map: fusionImage,
      transparent: true,
      opacity: 0.8,
    });
    const fusionPlane2Mat = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      map: fusionImage,
      transparent: true,
      opacity: 0.8,
    });

    const fusionPlane1 = new THREE.Mesh(fusionPlaneGeometry, fusionPlane1Mat);
    const fusionPlane2 = new THREE.Mesh(fusionPlaneGeometry, fusionPlane2Mat);
    fusionPlane1.position.copy(pivotPosition);
    fusionPlane1.position.z -= 0.5;
    fusionPlane2.position.copy(pivotPosition);
    fusionPlane2.position.z -= 0.5;
    fusionPlane2.rotateZ(THREE.MathUtils.degToRad(180));

    duel.core.sceneOverlay.add(fusionPlane1);
    duel.core.sceneOverlay.add(fusionPlane2);

    const cardEffect = CardEmptyMesh({ color: 0xffffff, transparent: true });
    cardEffect.position.copy(pivotPosition);
    cardEffect.material.opacity = 0;
    cardEffect.position.z += 0.05;
    duel.core.sceneOverlay.add(cardEffect);

    duel.core.enableRenderOverlay();

    const fusionMats = [fusionPlane1, fusionPlane2];
    for (const fusionEffect of fusionMats) {
      startTask(
        new YGOTaskSequence(
          new WaitForSeconds(1),
          new MultipleTasks(
            new ScaleTransition({
              gameObject: fusionEffect,
              scale: new THREE.Vector3(0, 0, 0),
              duration: 1,
            }),
            new MaterialOpacityTransition({
              material: fusionEffect.material,
              opacity: 0,
              duration: 1,
            })
          )
        )
      );
    }

    let time = 0;
    const maxRotationTime = hasMaterials ? 1.25 : 0.5;
    const showCardTime = hasMaterials ? 1.0 : 0.4;
    const rotationSpeed = hasMaterials ? 2 : 4;

    const updateTask = new UpdateTask({
      onUpdate: function (dt) {
        time += dt;
        fusionPlane1.rotateZ(THREE.MathUtils.degToRad(360) * dt * rotationSpeed);
        fusionPlane2.rotateZ(THREE.MathUtils.degToRad(360) * dt * rotationSpeed);

        if (time > maxRotationTime) {
          updateTask.setTaskCompleted();
        }
      },
    });

    // rotate fusion effect
    startTask(updateTask);

    // show white card
    startTask(
      new YGOTaskSequence(
        new WaitForSeconds(maxRotationTime - 0.2),
        new MaterialOpacityTransition({
          material: cardEffect.material,
          opacity: 1,
          duration: 0.15,
        }),
        new WaitForSeconds(0.25),
        new MaterialOpacityTransition({
          material: cardEffect.material,
          opacity: 0,
          duration: 0.1,
        }),
        new CallbackTransition(() => {
          duel.core.scene.remove(cardEffect);
        })
      )
    );

    let updateCardPositionsTime = 0;
    const maxTime = 1.0;
    const rotations = 2;

    const updateCardPositions = new UpdateTask({
      onUpdate: (dt) => {
        updateCardPositionsTime += dt;
        const animationProgress = Math.min(
          updateCardPositionsTime / maxTime,
          showCardTime
        );
        const easeOutCubic = 1 - Math.pow(1 - animationProgress, 3);

        this.cards.forEach((card, index) => {
          const baseAngle = (index / materialsCount) * Math.PI * 2;

          const rotationAngle = (1 - easeOutCubic) * rotations * Math.PI * 2;
          const currentAngle = baseAngle + rotationAngle;

          const currentRadius = radius * 2 * (1 - easeOutCubic);

          const targetPos = new THREE.Vector3(
            pivotPosition.x + Math.cos(currentAngle) * currentRadius,
            pivotPosition.y + Math.sin(currentAngle) * currentRadius,
            pivotPosition.z
          );

          const lerpFactor = 0.2 + 0.8 * easeOutCubic; // Lerp gets stronger as animation progresses
          card.position.lerp(targetPos, lerpFactor);
        });

        if (animationProgress >= showCardTime) {
          // this.cards.forEach(card => { card.destroy() });
          this.cards.forEach((card) => {
            card.position.copy(pivotPosition);
          });
          updateCardPositions.setTaskCompleted();
        }
      },
    });

    const zoneData = YGOGameUtils.getZoneData(event.zone)!;
    const cardZone = getGameZone(duel, zoneData);
    const endPosition = getZonePositionFromZoneData(duel, zoneData);
    const endRotation = getCardRotationFromFieldZoneData(
      duel,
      this.cardReference,
      zoneData
    );

    camera.getWorldDirection(direction);

    const fusionCard = new GameCard({ duel, card: this.cardReference });
    fusionCard.gameObject.position.copy(pivotPosition);
    fusionCard.gameObject.position.y += 0.05;
    fusionCard.gameObject.visible = false;

    const fusionCardEffect = fusionCard.gameObject.clone();
    duel.core.sceneOverlay.add(fusionCardEffect);

    // rotate materials and show card
    sequence.addMultiple(
      new WaitForSeconds(hasMaterials ? 0.5 : 0),
      updateCardPositions,
      new MultipleTasks(
        new WaitForSeconds(1),
        new CallbackTransition(() => {
          fusionCardEffect.visible = true;
          this.cards.forEach((card) => (card.visible = false));
          createCardPopSummonEffectSequence({
            duel,
            card: fusionCardEffect,
            cardData: duel.ygo.state.getCardData(event.id)!,
            startTask: this.props.startTask,
          });
        })
      ),
      new WaitForSeconds(0.2),
      new MultipleTasks(
        new PositionTransition({
          gameObject: fusionCardEffect,
          position: endPosition,
          duration: 0.5,
        }),
        new RotationTransition({
          gameObject: fusionCardEffect,
          rotation: endRotation,
          duration: 0.5,
        })
      ),
      new CallbackTransition(() => {
        cardZone?.setGameCard(fusionCard);
        cardZone?.updateCard();
        duel.core.clearSceneOverlay();
        this.props.onCompleted();
      })
    );

    startTask(sequence);
  }
}
