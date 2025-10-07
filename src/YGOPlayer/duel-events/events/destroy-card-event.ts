import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import {
  getGameZone,
  getZonePositionFromZoneData,
} from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import * as THREE from "three";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { Card } from "ygo-core";
import { GameCard } from "../../game/GameCard";
import { Graveyard } from "../../game/Graveyard";
import { MultipleTasks } from "../utils/multiple-tasks";
import { ScaleTransition } from "../utils/scale-transition";
import { createSquareWithTopMiddlePivot } from "../../game/meshes/mesh-utils";
import { YGOAnimationObject } from "../../game/YGOAnimationObject";
import { MaterialOpacityTransition } from "../utils/material-opacity";

interface DestroyEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Destroy;
}

export class DestroyCardEventHandler extends YGOCommandHandler {
  private props: DestroyEventHandlerProps;

  constructor(props: DestroyEventHandlerProps) {
    super("move_card_command");
    this.props = props;
  }

  public start(): void {
    const { event, duel } = this.props;

    const sequence = new YGOTaskSequence();
    const originZoneData = YGOGameUtils.getZoneData(event.originZone)!;
    const cardZone = getGameZone(duel, originZoneData);

    let card = cardZone?.getGameCard();
    let gy!: Graveyard;
    let cardReference: Card | undefined;
    let startPosition!: THREE.Vector3;

    if (cardZone) {
      startPosition = cardZone.position.clone();
      gy = duel.fields[card!.cardReference.originalOwner].graveyard;
    }

    if (!card) {
      cardReference = duel.ygo.state.getCardData(event.id)!;
      startPosition = getZonePositionFromZoneData(duel, originZoneData);
      card = new GameCard({ duel, card: cardReference, stats: false });
      card.gameObject.position.copy(startPosition);
      gy = duel.fields[originZoneData.player].graveyard;
    }

    card.hideCardStats();
    card.gameObject.visible = false;

    startPosition.z += 0.05;

    // moving light
    const PlaneGeometry = new THREE.PlaneGeometry(1, 1);
    const texture = duel.assets.getTexture(`${duel.config.cdnUrl}/images/particles/light_01.png`);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      color: 0xADD8E6,
    });
    const mesh = new THREE.Mesh(PlaneGeometry, material);
    mesh.scale.set(2, 2, 2);
    mesh.rotation.set(0, 0, 0);
    mesh.position.copy(startPosition);
    duel.core.scene.add(mesh);

    const trailTexture = duel.assets.getTexture(
      `${duel.config.cdnUrl}/images/particles/flame_07.png`
    );
    const trailMat = new THREE.MeshBasicMaterial({
      map: trailTexture,
      transparent: true,
      color: 0xADD8E6,
    });

    // FLASH 
    const flashTexture = duel.assets.getTexture(`${duel.config.cdnUrl}/images/particles/star_09.png`);
    const flashMaterial = new THREE.MeshBasicMaterial({
      map: flashTexture,
      transparent: true,
      color: 0xffffff,
      opacity: 1,
    });
    const flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), flashMaterial);

    flashMesh.position.copy(card.gameObject.position);
    flashMesh.position.z += 1;
    duel.core.scene.add(flashMesh);

    const spreadTexture = duel.assets.getTexture(`${duel.config.cdnUrl}/images/particles/light_03.png`);
    const spreadMaterial = new THREE.MeshBasicMaterial({
      map: spreadTexture,
      transparent: true,
      color: 0xADD8E6,
    });
    const spreadMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), spreadMaterial);

    spreadMesh.position.copy(card.gameObject.position);
    spreadMesh.position.z += 0.5;
    duel.core.scene.add(spreadMesh);

    this.props.playSound({ key: duel.createCdnUrl(`/sounds/crack.ogg`), volume: 0.5 });

    this.props.startTask(
      new MultipleTasks(
        new MaterialOpacityTransition({
          material: flashMaterial,
          opacity: 0,
          duration: 0.2,
        }),
        new ScaleTransition({
          gameObject: flashMesh,
          scale: new THREE.Vector3(.5, .5, .5),
          duration: 0.2,
        })
      )
    );

    this.props.startTask(
      new MultipleTasks(
        new MaterialOpacityTransition({
          material: spreadMaterial,
          opacity: 0,
          duration: 0.4,
        }),
        new ScaleTransition({
          gameObject: spreadMesh,
          scale: new THREE.Vector3(3, 3, 3),
          duration: 0.4,
        })
      )
    );



    const trailMesh = createSquareWithTopMiddlePivot(3, 3, trailMat);
    duel.core.scene.add(trailMesh);

    mesh.add(trailMesh);
    trailMesh.position.set(0, 0, 0);
    trailMesh.rotation.set(0, 0, 0);
    trailMesh.scale.set(1, 0, 1);
    trailMesh.rotateZ(THREE.MathUtils.degToRad(-90));

    const pool = this.props.duel.assets.getPool("destroyEffect");
    const destroyEffect = pool.get<YGOAnimationObject>();

    destroyEffect.gameObject.position.copy(card.gameObject.position);
    destroyEffect.gameObject.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);
    destroyEffect.gameObject.visible = true;
    destroyEffect.playAll();
    destroyEffect.enable();

    this.props.duel.core.scene.add(destroyEffect.gameObject);

    this.props.startTask(
      new YGOTaskSequence(
        new ScaleTransition({
          gameObject: trailMesh,
          scale: new THREE.Vector3(1, 2, 1),
          duration: 0.35,
        }),
        new ScaleTransition({
          gameObject: trailMesh,
          scale: new THREE.Vector3(1, 0, 1),
          duration: 0.1,
        })
      )
    );

    sequence.addMultiple(
      new MultipleTasks(
        new PositionTransition({
          gameObject: mesh,
          position: gy.cardPosition,
          duration: 0.5,
        }),
        new ScaleTransition({
          gameObject: mesh,
          scale: mesh.scale.addScalar(1.5),
          duration: 0.25,
        })
      ),
      new CallbackTransition(() => {
        mesh.visible = false;
      })
    );

    gy.createSendToGraveyardEffect({ card: card.gameObject, sequence });

    sequence.add(
      new CallbackTransition(() => {
        duel.core.scene.remove(mesh);
        cardZone?.setCard(null);
        this.props.onCompleted();
        pool.enquene(destroyEffect);
      })
    );

    this.props.startTask(sequence);
  }
}

function calculateZRotationToLookAt(
  pos1: THREE.Vector3,
  pos2: THREE.Vector3
): number {
  const deltaX = pos2.x - pos1.x;
  const deltaY = pos2.y - pos1.y;
  const angle = Math.atan2(deltaY, deltaX);
  return angle;
}
