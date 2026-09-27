import { describe, expect, it } from "vitest";
import { createAnimationGate } from "./animation-gate";

describe("createAnimationGate", () => {
  it("applies straight away when nothing is animating", () => {
    const applied: number[] = [];
    const gate = createAnimationGate<number>(() => false, (v) => applied.push(v));
    expect(gate.offer(1)).toBe(true);
    expect(applied).toEqual([1]);
    expect(gate.holding).toBe(false);
    expect(gate.flush()).toBe(false);
  });

  it("holds the newest value while animating and applies it once the board is still", () => {
    let animating = true;
    const applied: number[] = [];
    const gate = createAnimationGate<number>(() => animating, (v) => applied.push(v));
    expect(gate.offer(1)).toBe(false);
    expect(gate.offer(2)).toBe(false);
    expect(gate.holding).toBe(true);
    expect(gate.flush()).toBe(false); // still animating
    expect(applied).toEqual([]);
    animating = false;
    expect(gate.flush()).toBe(true);
    expect(applied).toEqual([2]);
    expect(gate.holding).toBe(false);
    expect(gate.flush()).toBe(false);
  });

  it("drops a held value when a newer one goes straight through", () => {
    let animating = true;
    const applied: number[] = [];
    const gate = createAnimationGate<number>(() => animating, (v) => applied.push(v));
    gate.offer(1);
    animating = false;
    gate.offer(2);
    expect(gate.flush()).toBe(false);
    expect(applied).toEqual([2]);
  });
});
