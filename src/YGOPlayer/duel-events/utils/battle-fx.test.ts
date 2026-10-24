import { afterEach, describe, expect, it } from "vitest";
import { animationsReducedBySetting, prefersReducedMotion, setReducedAnimations } from "./battle-fx";

describe("Reduce animations setting", () => {
  afterEach(() => setReducedAnimations(false));

  it("turns the reduced-motion path on, like the OS setting", () => {
    setReducedAnimations(true);
    expect(animationsReducedBySetting()).toBe(true);
    expect(prefersReducedMotion()).toBe(true);
    setReducedAnimations(false);
    expect(animationsReducedBySetting()).toBe(false);
  });
});
