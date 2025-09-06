import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents, YGOGameUtils } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import {
  getCardRotationFromFieldZoneData,
  getGameZone,
} from "../../scripts/ygo-utils";
import { CallbackTransition } from "../utils/callback";
import { PositionTransition } from "../utils/position-transition";
import { RotationTransition } from "../utils/rotation-transition";
import { Ease } from "../../scripts/ease";
import { MultipleTasks } from "../utils/multiple-tasks";
import { ScaleTransition } from "../utils/scale-transition";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { WaitForSeconds } from "../utils/wait-for-seconds";

interface AttackEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.Attack | YGODuelEvents.AttackDirectly;
}

export class AttackEventHandler extends YGOCommandHandler {

  constructor(private props: AttackEventHandlerProps) {
    super("change_card_position_handler");
  }

  public start(): void {
    const { duel, startTask, onCompleted } = this.props;
    const event = this.props.event as (YGODuelEvents.Attack | YGODuelEvents.AttackDirectly);

    const originZone = (event as any).attackingZone || (event as any).originZone;
    const originZoneData = YGOGameUtils.getZoneData(originZone);
    const cardZone = getGameZone(duel, originZoneData)!;
    const card = cardZone.getGameCard();
    const originalPosition = card.gameObject.position.clone();
    const originalRotation = card.gameObject.rotation.clone();

    const sequence = new YGOTaskSequence();

    // pre load textures
    duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/circle_03.png"))
    duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/star_07.png"))

    if ((event as any).attackedId) {
      const { attackedZone } = (event as any);
      const attackedZoneData = YGOGameUtils.getZoneData(attackedZone);
      const attackedCardZone = getGameZone(duel, attackedZoneData)!;
      const attackedCard = attackedCardZone.getGameCard();
      const targetAttackedPosition = attackedCard.gameObject.position.clone();

      const offset = 5;
      const direction = new THREE.Vector3()
        .subVectors(card.gameObject.position, attackedCard.gameObject.position)
        .normalize();
      const goingInPosition = card.gameObject.position.clone().addScaledVector(direction, offset);
      const goingOutPosition = card.gameObject.position.clone().addScaledVector(direction, offset / 2);
      goingInPosition.z += 3;
      goingOutPosition.z += 1.5;

      const tempDirection = new THREE.Vector3().subVectors(card.gameObject.position, attackedCard.gameObject.position);
      const angle = Math.atan2(tempDirection.x, -tempDirection.y);
      const newRotation = card.gameObject.rotation.clone();

      if ((event as any).attackedPosition?.includes("facedown")) {
        const startPosition: THREE.Vector3 = attackedCard.gameObject.position.clone();
        const targetRotation = getCardRotationFromFieldZoneData(
          duel,
          attackedCard.cardReference!,
          attackedZoneData
        );
        const abovePosition = startPosition.clone();
        abovePosition.z += 1;
        attackedCard.hideCardStats();

        startTask(new YGOTaskSequence(
          new PositionTransition({
            gameObject: attackedCard.gameObject,
            duration: 0.15,
            position: abovePosition,
          }),
          new MultipleTasks(
            new PositionTransition({
              gameObject: attackedCard.gameObject,
              duration: 0.15,
              position: startPosition,
            }),
            new RotationTransition({
              gameObject: attackedCard.gameObject,
              duration: 0.2,
              rotation: targetRotation,
            })
          ),
          new CallbackTransition(() => {
            attackedCard.showCardStats();
          })
        ))
      }
      newRotation.z = angle;

      sequence.addMultiple(
        new MultipleTasks(
          new PositionTransition({
            gameObject: card.gameObject,
            position: goingInPosition,
            duration: 0.5,
            ease: Ease.easeInOut,
          }),
          new RotationTransition({
            gameObject: card.gameObject,
            rotation: newRotation,
            duration: 0.25,
            ease: Ease.easeOutSine
          })
        ),
        new PositionTransition({
          gameObject: card.gameObject,
          position: targetAttackedPosition.clone(),
          duration: 0.25,
          ease: Ease.easeInOut,
        }),
        new CallbackTransition(() => {
          const position = targetAttackedPosition.clone();
          position.z += 0.2;
          this.createAttackCollistionEffect({ startTask, position });
        }),
        new PositionTransition({
          gameObject: card.gameObject,
          position: goingOutPosition,
          duration: 0.4,
          ease: Ease.easeInOut,
        }),
        new MultipleTasks(
          new PositionTransition({
            gameObject: card.gameObject,
            position: originalPosition,
            duration: 0.2,
            ease: Ease.easeInOut,
          }),
          new RotationTransition({
            gameObject: card.gameObject,
            rotation: originalRotation,
            duration: 0.2,
            ease: Ease.easeOutSine
          })
        )
      )
    } else {
      const offset = 5;
      const gameHandZone = duel.fields[1 - event.player].hand.gameHandZone;
      const direction = new THREE.Vector3()
        .subVectors(card.gameObject.position, gameHandZone.gameObject.position)
        .normalize();
      const goingInPosition = card.gameObject.position.clone().addScaledVector(direction, offset);
      const goingOutPosition = card.gameObject.position.clone().addScaledVector(direction, offset / 2);
      goingInPosition.z += 3;
      goingOutPosition.z += 1.5;

      const tempDirection = new THREE.Vector3().subVectors(card.gameObject.position, gameHandZone.gameObject.position);
      const angle = Math.atan2(tempDirection.x, -tempDirection.y);
      const newRotation = card.gameObject.rotation.clone();
      newRotation.z = angle;

      sequence.addMultiple(
        new MultipleTasks(
          new PositionTransition({
            gameObject: card.gameObject,
            position: goingInPosition,
            duration: 0.5,
            ease: Ease.easeInOut,
          }),
          new RotationTransition({
            gameObject: card.gameObject,
            rotation: newRotation,
            duration: 0.25,
            ease: Ease.easeOutSine
          })
        ),
        new PositionTransition({
          gameObject: card.gameObject,
          position: gameHandZone.gameObject.position.clone(),
          duration: 0.25,
          ease: Ease.easeInOut,
        }),
        new CallbackTransition(() => {
          const position = gameHandZone.gameObject.position.clone();
          position.z += 0.2;
          this.createAttackCollistionEffect({ startTask, position });
        }),
        new PositionTransition({
          gameObject: card.gameObject,
          position: goingOutPosition,
          duration: 0.4,
          ease: Ease.easeInOut,
        }),
        new MultipleTasks(
          new PositionTransition({
            gameObject: card.gameObject,
            position: originalPosition,
            duration: 0.2,
            ease: Ease.easeInOut,
          }),
          new RotationTransition({
            gameObject: card.gameObject,
            rotation: originalRotation,
            duration: 0.2,
            ease: Ease.easeOutSine
          })
        )
      )
    }

    sequence.add(new CallbackTransition(() => {
      card.gameObject.position.copy(originalPosition);

      onCompleted();
    }));

    startTask(sequence);
  }

  public finish(): void {
  }

  private createAttackCollistionEffect({ startTask, position }: any) {
    const { duel } = this.props;
    const circleTexture = duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/circle_03.png"));
    const circle = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: circleTexture,
        transparent: true,
      })
    );
    duel.core.scene.add(circle);
    const circleLarge = new THREE.Mesh(
      new THREE.PlaneGeometry(35, 35),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: circleTexture,
        transparent: true,
      })
    );
    duel.core.scene.add(circleLarge);
    const flare = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 15, 15),
      new THREE.MeshBasicMaterial({
        color: 0xFFDE21,
        transparent: true,
        map: duel.core.textureLoader.load(duel.createCdnUrl("/images/particles/star_07.png"))
      })
    );
    duel.core.scene.add(flare);

    circle.scale.set(0, 0, 0);
    circle.position.copy(position);
    circle.material.opacity = 0;

    circleLarge.scale.set(0, 0, 0);
    circleLarge.position.copy(position);
    circleLarge.position.z -= 0.1;
    circleLarge.material.opacity = 0;

    flare.position.copy(position);
    flare.position.z += 0.1;
    flare.scale.set(0.5, 0.5, 0.5);
    flare.rotateZ(THREE.MathUtils.randInt(0, 360))
    flare.material.opacity = 0;

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: flare,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.15
        }),
        new MaterialOpacityTransition({
          material: flare.material,
          duration: 0.1,
          opacity: 1
        })
      ),
      new MultipleTasks(
        new ScaleTransition({
          gameObject: flare,
          scale: new THREE.Vector3(0.5, 0.5, 0.5),
          duration: 0.1
        }),
        new MaterialOpacityTransition({
          material: flare.material,
          duration: 0.1,
          opacity: 0
        })
      ),
      new WaitForSeconds(0.5),
      new CallbackTransition(() => {
        duel.core.scene.remove(circle);
        duel.core.scene.remove(circleLarge);
        duel.core.scene.remove(flare);
      })
    ));

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: circle,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.2
        }),
        new MaterialOpacityTransition({
          material: circle.material,
          duration: 0.1,
          opacity: 0.5
        })
      ),
      new WaitForSeconds(0.15),
      new MaterialOpacityTransition({
        material: circle.material,
        duration: 0.2,
        opacity: 0
      })
    ));

    startTask(new YGOTaskSequence(
      new MultipleTasks(
        new ScaleTransition({
          gameObject: circleLarge,
          scale: new THREE.Vector3(1, 1, 1),
          duration: 0.15
        }),
        new MaterialOpacityTransition({
          material: circleLarge.material,
          duration: 0.1,
          opacity: 0.5
        })
      ),
      new MultipleTasks(
        new ScaleTransition({
          gameObject: circleLarge,
          scale: new THREE.Vector3(1.5, 1.5, 1.5),
          duration: 0.2
        }),
        new MaterialOpacityTransition({
          material: circleLarge.material,
          duration: 0.2,
          opacity: 0
        })
      ),
    ));
  }
}
