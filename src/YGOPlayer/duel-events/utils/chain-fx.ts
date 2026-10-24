import * as THREE from "three";
import type { YGOTask } from "../../core/components/tasks/YGOTask";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { createHighlightFrame, HIGHLIGHT_COLOR } from "../../game/meshes/highlight-frame";
import { disposeEffectMesh } from "../../game/meshes/mesh-utils";
import { Ease } from "../../scripts/ease";
import { prefersReducedMotion } from "./battle-fx";
import { CallbackTransition } from "./callback";
import { MaterialOpacityTransition } from "./material-opacity";
import { MultipleTasks } from "./multiple-tasks";
import { ScaleTransition } from "./scale-transition";
import { UpdateTask } from "./update-task";
import { WaitForSeconds } from "./wait-for-seconds";

/** How much bigger a chain link's card grows while it is lifted (Master Duel's "presented" card). */
export const CHAIN_LIFT_SCALE = 1.18;
/** The slight tilt a lifted chain link card takes (radians around its own normal). */
export const CHAIN_LIFT_TILT = THREE.MathUtils.degToRad(4);

/**
 * The extra beat a chain link's activation gets on top of the regular
 * activation lift (ActivateCardHandler.createActivationEffect lifts the card
 * toward the camera, holds, then settles it back): while it rises the card
 * also grows and tilts a little, and a golden rim flashes around it. These
 * tasks run alongside the lift / settle, so the timing stays the handler's.
 *
 * `lift` runs with the rise (`liftDuration` s), `settle` with the return
 * (`settleDuration` s). With reduced motion the card neither grows nor tilts:
 * only the rim shows, briefly.
 */
export function chainLinkLiftTasks(
  card: THREE.Object3D,
  { liftDuration, holdDuration, settleDuration }: { liftDuration: number; holdDuration: number; settleDuration: number },
): { lift: YGOTask; settle: YGOTask } {
  const reduced = prefersReducedMotion();
  const baseScale = card.scale.clone();

  // The rim: a child of the card, so it rides the lift; its own scale undoes
  // the card's (the frame is already sized to the card's world size).
  const rim = createHighlightFrame(card, 0, HIGHLIGHT_COLOR);
  const worldScale = card.getWorldScale(new THREE.Vector3());
  rim.scale.set(1 / (worldScale.x || 1), 1 / (worldScale.y || 1), 1);
  card.add(rim);
  const rimMaterial = rim.material as THREE.Material;

  const rimFlash = new YGOTaskSequence(
    new MaterialOpacityTransition({ material: rimMaterial, opacity: 1, duration: liftDuration * 0.8, ease: Ease.easeOutCubic }),
    new WaitForSeconds(Math.max(0, holdDuration * 0.5)),
    new MaterialOpacityTransition({ material: rimMaterial, opacity: 0.35, duration: holdDuration * 0.5 }),
  );

  const liftTasks: YGOTask[] = [rimFlash];
  const settleTasks: YGOTask[] = [
    new MaterialOpacityTransition({ material: rimMaterial, opacity: 0, duration: settleDuration }),
  ];
  if (!reduced) {
    liftTasks.push(
      new ScaleTransition({ gameObject: card, scale: baseScale.clone().multiplyScalar(CHAIN_LIFT_SCALE), duration: liftDuration, ease: Ease.easeOutBack }),
      tiltTask(card, CHAIN_LIFT_TILT, liftDuration),
    );
    settleTasks.push(new ScaleTransition({ gameObject: card, scale: baseScale, duration: settleDuration, ease: Ease.easeInOutQuad }));
  }

  return {
    lift: new MultipleTasks(...liftTasks),
    settle: new YGOTaskSequence(
      new MultipleTasks(...settleTasks),
      new CallbackTransition(() => {
        card.scale.copy(baseScale);
        disposeEffectMesh(rim);
      }),
    ),
  };
}

/** Turns the card by `angle` around its own normal, from wherever it is when
 * the task starts (a hand card may have just flipped face-up). */
function tiltTask(card: THREE.Object3D, angle: number, duration: number): YGOTask {
  const from = new THREE.Quaternion();
  const to = new THREE.Quaternion();
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
  let elapsed = 0;
  const task: UpdateTask = new UpdateTask({
    onStart: () => {
      elapsed = 0;
      from.copy(card.quaternion);
      to.copy(from).multiply(turn);
    },
    onUpdate: (dt) => {
      elapsed += dt;
      const t = Math.min(elapsed / duration, 1);
      card.quaternion.slerpQuaternions(from, to, Ease.easeOutCubic(t));
      if (t >= 1) task.setTaskCompleted();
    },
  });
  return task;
}
