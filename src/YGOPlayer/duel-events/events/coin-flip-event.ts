import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { CallbackTransition } from "../utils/callback";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { UpdateTask } from "../utils/update-task";
import { getCardPositionInFrontOfCamera } from "../../scripts/ygo-utils";
import { WaitForSeconds } from "../utils/wait-for-seconds";
import { MultipleTasks } from "../utils/multiple-tasks";
import { MaterialOpacityTransition } from "../utils/material-opacity";
import { ScaleTransition } from "../utils/scale-transition";

interface CoinFlipEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.CoinFlip;
}

const HEAD = new THREE.Euler(Math.PI / 2, 0, 0);
const TAILS = new THREE.Euler(Math.PI + Math.PI / 2, 0, 0);
export class CoinFlipEventHandler extends YGOCommandHandler {
  private props: CoinFlipEventHandlerProps;

  constructor(props: CoinFlipEventHandlerProps) {
    super("coin_flip_command");
    this.props = props;
  }

  public start(): void {
    const { event, duel } = this.props;
    const coin = duel.duelScene.coinObject;
    const side = event.result[0];
    const startPosition = getCardPositionInFrontOfCamera({ camera: duel.core.camera, distance: 8 });
    coin.position.copy(startPosition);
    coin.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);
    coin.visible = true;

    const midAirPosition = startPosition.clone().add(new THREE.Vector3(0, 2, 0));
    const endPosition = startPosition.clone();
    const flips = 2 + Math.floor(Math.random() * 2);
    const duration = 1;
    let elapsed = 0;

    const targetRotation = side ? HEAD : TAILS;

    const update = new UpdateTask({
      onUpdate: (dt) => {
        elapsed += dt;
        const t = Math.min(elapsed / duration, 1);

        coin.position.lerpVectors(
          startPosition,
          midAirPosition,
          Math.sin(t * Math.PI)
        );
        coin.position.y += 0.5 * Math.sin(t * Math.PI);

        coin.rotation.x = THREE.MathUtils.lerp(
          THREE.MathUtils.degToRad(90),
          targetRotation.x + flips * Math.PI * 2,
          t
        );

        if (t >= 1) {
          coin.position.copy(endPosition);
          coin.rotation.copy(targetRotation);
          update.setTaskCompleted();
        }
      },
    });

    const particleTexture = duel.core.textureLoader.load(
      duel.createCdnUrl("/images/particles/star_07.png")
    );
    const sequence = new YGOTaskSequence();
    sequence.add(update);

    sequence.add(new CallbackTransition(() => {
      if (side) {
        const particleCount = 4 + Math.floor(Math.random() * 5);

        for (let i = 0; i < particleCount; ++i) {
          const offsetX = (Math.random() - 0.5) * 3;
          const offsetY = (Math.random() - 0.5) * 3;
          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: particleTexture,
            color: 0xFFDE21,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          });

          const particle = new THREE.Mesh(geometry, material);

          particle.position.set(
            coin.position.x + offsetX,
            coin.position.y + offsetY,
            coin.position.z + 0.5
          );

          particle.scale.set(0, 0, 0);

          duel.core.scene.add(particle);

          const particleSequence = new YGOTaskSequence(
            new MultipleTasks(
              new MaterialOpacityTransition({
                material: particle.material,
                opacity: 1,
                duration: 0.1,
              }),
              new ScaleTransition({
                gameObject: particle,
                scale: new THREE.Vector3(0.5, 0.5, 0.5),
                duration: 0.1,
              })
            ),
            new MultipleTasks(
              new MaterialOpacityTransition({
                material: particle.material,
                opacity: 0,
                duration: 0.1,
              }),
              new ScaleTransition({
                gameObject: particle,
                scale: new THREE.Vector3(1, 1, 1),
                duration: 0.1,
              })
            ),
            new CallbackTransition(() => {
              duel.core.scene.remove(particle);
            })
          );

          this.props.startTask(particleSequence);
        }
      }
    }));

    sequence.add(new WaitForSeconds(0.5));

    sequence.add(
      new CallbackTransition(() => {
        coin.visible = false;
        coin.position.set(0, 0, -10);
        this.props.onCompleted();
      })
    );

    this.props.startTask(sequence);
  }
}
