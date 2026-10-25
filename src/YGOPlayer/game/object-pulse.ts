import * as THREE from "three";
import { prefersReducedMotion } from "../duel-events/utils/battle-fx";

/**
 * A brief scale pulse on a board object (Assisted Mode's double-click quick action, ui/quick-action.ts).
 *
 * The pulse always ends on the object's REST scale: a pulse started while another one runs (a
 * second double-click within 240 ms) starts over from the first one's rest scale instead of
 * capturing the enlarged scale it is at, and anything that sets the object's scale for good (the
 * hand re-laying out, a drag lifting the card) stops the pulse first (stopPulse). Before, an
 * overlapping pulse or a drag started mid-pulse left the card enlarged for good — and the
 * Assisted Mode frame around it, sized from the card when it was created, no longer matched.
 */
interface Pulse {
  base: THREE.Vector3;
  frame: number;
}

const pulses = new WeakMap<THREE.Object3D, Pulse>();

function cancelFrame(id: number) {
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(id);
}

export function pulseObject(object: THREE.Object3D | null | undefined, { durationMs = 240, amount = 0.12 } = {}) {
  if (!object || prefersReducedMotion() || typeof requestAnimationFrame !== "function") return;
  const running = pulses.get(object);
  if (running) cancelFrame(running.frame);
  const pulse: Pulse = { base: running ? running.base : object.scale.clone(), frame: 0 };
  pulses.set(object, pulse);
  const start = performance.now();
  const step = (now: number) => {
    if (pulses.get(object) !== pulse) return;
    const t = Math.min(1, Math.max(0, (now - start) / durationMs));
    if (t < 1) {
      object.scale.copy(pulse.base).multiplyScalar(1 + amount * Math.sin(Math.PI * t));
      pulse.frame = requestAnimationFrame(step);
    } else {
      object.scale.copy(pulse.base);
      pulses.delete(object);
    }
  };
  pulse.frame = requestAnimationFrame(step);
}

/** Whether a pulse is running on the object. */
export function isPulsing(object: THREE.Object3D): boolean {
  return pulses.has(object);
}

/**
 * Ends a running pulse at once, the object back at its rest scale. Returns that rest scale (a
 * copy), or null when no pulse was running.
 */
export function stopPulse(object: THREE.Object3D | null | undefined): THREE.Vector3 | null {
  if (!object) return null;
  const running = pulses.get(object);
  if (!running) return null;
  pulses.delete(object);
  cancelFrame(running.frame);
  object.scale.copy(running.base);
  return running.base.clone();
}
