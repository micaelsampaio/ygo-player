import { describe, expect, it } from "vitest";
import { damageText } from "./DamageNumbers";

describe("damageText", () => {
  it("shows damage as a negative number, gains with a plus, nothing for no change", () => {
    expect(damageText(8000, 6800)).toBe("-1200");
    expect(damageText(4000, 4500)).toBe("+500");
    expect(damageText(8000, 8000)).toBe("");
  });
});
