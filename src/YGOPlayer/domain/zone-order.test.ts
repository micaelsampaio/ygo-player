import { describe, expect, it } from "vitest";
import { leftmostZone } from "./zone-order";

const z = (...ids: string[]) => ids.map((zone) => ({ zone }));

describe("leftmostZone", () => {
  it("takes the lowest-numbered free zone", () => {
    expect(leftmostZone(z("M-4", "M-2", "M-5")).zone).toBe("M-2");
    expect(leftmostZone(z("M2-3", "M2-1")).zone).toBe("M2-1");
  });

  it("prefers a Main Monster Zone over an Extra Monster Zone", () => {
    expect(leftmostZone(z("EMZ-1", "M-3")).zone).toBe("M-3");
    expect(leftmostZone(z("EMZ-2", "EMZ-1")).zone).toBe("EMZ-1");
  });
});
