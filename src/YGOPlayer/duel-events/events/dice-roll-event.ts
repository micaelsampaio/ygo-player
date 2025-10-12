import * as THREE from "three";
import { DuelEventHandlerProps } from "..";
import { YGODuelEvents } from "ygo-core";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { CallbackTransition } from "../utils/callback";
import { YGOCommandHandler } from "../../core/components/YGOCommandHandler";
import { UpdateTask } from "../utils/update-task";
import { getCardPositionInFrontOfCamera } from "../../scripts/ygo-utils";
import { WaitForSeconds } from "../utils/wait-for-seconds";

// Dice rotations mapping (number on top)
const DICE_ROTATIONS: Record<number, THREE.Euler> = {
  1: new THREE.Euler(-Math.PI / 2, 0, 0),
  2: new THREE.Euler(0, 0, 0),
  3: new THREE.Euler(0, 0, -Math.PI / 2),
  4: new THREE.Euler(0, 0, Math.PI / 2),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
};

interface DiceRollEventHandlerProps extends DuelEventHandlerProps {
  event: YGODuelEvents.DiceRoll;
}

export class DiceRollEventHandler extends YGOCommandHandler {
  private props: DiceRollEventHandlerProps;

  constructor(props: DiceRollEventHandlerProps) {
    super("dice_roll_command");
    this.props = props;
  }

  public start(): void {
    const { event, duel } = this.props;
    const dice = duel.duelScene.diceObject; // use dice object instead of coin
    const side = event.result[0]; // 1-6
    const startPosition = getCardPositionInFrontOfCamera({ camera: duel.core.camera, distance: 10 });

    dice.position.copy(startPosition);
    dice.rotation.set(0, 0, 0);
    dice.visible = true;

    const midAirPosition = startPosition.clone().add(new THREE.Vector3(0, 2, 0));
    const endPosition = startPosition.clone();
    const flips = 2 + Math.floor(Math.random() * 2); // random flips
    const duration = 1;
    let elapsed = 0;

    const targetRotation = DICE_ROTATIONS[side];

    const update = new UpdateTask({
      onUpdate: (dt) => {
        elapsed += dt;
        const t = Math.min(elapsed / duration, 1);

        // Dice vertical movement (arc)
        dice.position.lerpVectors(
          startPosition,
          midAirPosition,
          Math.sin(t * Math.PI)
        );
        dice.position.y += 0.5 * Math.sin(t * Math.PI);

        // Dice rotation during flips
        dice.rotation.x = THREE.MathUtils.lerp(0, targetRotation.x + flips * Math.PI * 2, t);
        dice.rotation.y = THREE.MathUtils.lerp(0, targetRotation.y + flips * Math.PI * 2, t);
        dice.rotation.z = THREE.MathUtils.lerp(0, targetRotation.z + flips * Math.PI * 2, t);

        if (t >= 1) {
          dice.position.copy(endPosition);
          dice.rotation.copy(targetRotation);
          update.setTaskCompleted();
        }
      },
    });

    const sequence = new YGOTaskSequence();
    sequence.add(update);
    sequence.add(new WaitForSeconds(0.5));
    sequence.add(
      new CallbackTransition(() => {
        dice.visible = false;
        dice.position.set(0, 0, -10);
        this.props.onCompleted();
      })
    );

    this.props.startTask(sequence);
  }
}
