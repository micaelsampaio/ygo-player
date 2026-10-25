import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { isPulsing, pulseObject, stopPulse } from "./object-pulse";

let frames: Array<(now: number) => void> = [];
let now = 0;

beforeEach(() => {
  frames = [];
  now = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: (now: number) => void) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(performance, "now").mockImplementation(() => now);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Runs the queued animation frames at time `t` (ms). */
function advance(t: number) {
  now = t;
  const queued = frames;
  frames = [];
  queued.forEach((cb) => cb(t));
}

describe("pulseObject", () => {
  it("ends on the rest scale", () => {
    const object = new THREE.Object3D();
    object.scale.set(0.98, 0.98, 1);
    pulseObject(object);
    advance(120);
    expect(object.scale.x).toBeGreaterThan(1.05);
    advance(300);
    expect(object.scale.toArray()).toEqual([0.98, 0.98, 1]);
    expect(isPulsing(object)).toBe(false);
  });

  it("a second pulse started mid-pulse still ends on the original rest scale (no enlarged card left)", () => {
    const object = new THREE.Object3D();
    pulseObject(object);
    advance(120); // at its peak: 1.12
    pulseObject(object); // a second double-click
    advance(200);
    advance(500);
    expect(object.scale.x).toBeCloseTo(1, 10);
    expect(object.scale.y).toBeCloseTo(1, 10);
  });

  it("stopPulse puts the object back on its rest scale at once and returns it", () => {
    const object = new THREE.Object3D();
    pulseObject(object);
    advance(120);
    expect(stopPulse(object)?.x).toBe(1);
    expect(object.scale.x).toBe(1);
    advance(150); // the stale frame does nothing
    expect(object.scale.x).toBe(1);
    expect(stopPulse(object)).toBeNull();
  });
});
