import * as THREE from "three";
import { YGOTask } from "../../core/components/tasks/YGOTask";
import { YGOTaskSequence } from "../../core/components/tasks/YGOTaskSequence";
import { CallbackTransition } from "./callback";
import { MaterialOpacityTransition } from "./material-opacity";
import { MultipleTasks } from "./multiple-tasks";
import { PositionTransition } from "./position-transition";
import { RotationTransition } from "./rotation-transition";
import { ScaleTransition } from "./scale-transition";
import { WaitForSeconds } from "./wait-for-seconds";

/**
 * Building blocks the duel-event handlers share: the same task trees they
 * used to spell out inline (see choreography.test.ts, which pins them).
 */

type EaseFn = (t: number) => number;

/**
 * Moves and turns (and optionally scales) `gameObject` at the same time.
 * `rotationDuration` defaults to `duration`, `rotationEase` to `ease`,
 * `scaleDuration` to `rotationDuration`.
 */
export function moveAndRotate(gameObject: THREE.Object3D, {
  position,
  rotation,
  duration,
  rotationDuration = duration,
  ease,
  rotationEase = ease,
  scale,
  scaleDuration = rotationDuration,
}: {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  duration: number;
  rotationDuration?: number;
  ease?: EaseFn;
  rotationEase?: EaseFn;
  scale?: THREE.Vector3;
  scaleDuration?: number;
}): MultipleTasks {
  const tasks: YGOTask[] = [
    new PositionTransition({ gameObject, position, duration, ease }),
    new RotationTransition({ gameObject, rotation, duration: rotationDuration, ease: rotationEase }),
  ];
  if (scale) tasks.push(new ScaleTransition({ gameObject, scale, duration: scaleDuration }));
  return new MultipleTasks(...tasks);
}

/**
 * The dark overlay behind a highlighted card: optional `delay`, fade in to
 * `opacity` (0.7) over `fadeIn`, hold, then (when `fadeOut` is given) fade
 * out and run `onDone`.
 */
export function modalOverlayFade(material: THREE.Material, {
  delay,
  opacity = 0.7,
  fadeIn,
  hold,
  fadeOut,
  onDone,
}: {
  delay?: number;
  opacity?: number;
  fadeIn: number;
  hold: number;
  fadeOut?: number;
  onDone?: () => void;
}): YGOTaskSequence {
  const sequence = new YGOTaskSequence();
  if (delay !== undefined) sequence.add(new WaitForSeconds(delay));
  sequence.add(new MaterialOpacityTransition({ material, duration: fadeIn, opacity }));
  sequence.add(new WaitForSeconds(hold));
  if (fadeOut !== undefined) sequence.add(new MaterialOpacityTransition({ material, duration: fadeOut, opacity: 0 }));
  if (onDone) sequence.add(new CallbackTransition(onDone));
  return sequence;
}

/** Lifts `gameObject` to `above`, then settles it on `position` while it turns to `rotation`. */
export function liftAndSettle(gameObject: THREE.Object3D, {
  above,
  liftDuration,
  position,
  rotation,
  settleDuration,
  rotationDuration = settleDuration,
}: {
  above: THREE.Vector3;
  liftDuration: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  settleDuration: number;
  rotationDuration?: number;
}): YGOTask[] {
  return [
    new PositionTransition({ gameObject, duration: liftDuration, position: above }),
    moveAndRotate(gameObject, { position, rotation, duration: settleDuration, rotationDuration }),
  ];
}
