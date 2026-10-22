import { describe, expect, it } from "vitest";
import { isOwnMovePrompt } from "./assisted-options-panel";

describe("isOwnMovePrompt", () => {
  it("is the zone or position of the move just chosen", () => {
    expect(isOwnMovePrompt({ available: true, pending: "prompt", prompt: { kind: "place" } } as never)).toBe(true);
    expect(isOwnMovePrompt({ available: true, pending: "prompt", prompt: { kind: "position" } } as never)).toBe(true);
  });

  it("is not a card pick, a chain window or the idle options (they still settle after a choice)", () => {
    expect(isOwnMovePrompt({ available: true, pending: "prompt", prompt: { kind: "card" } } as never)).toBe(false);
    expect(isOwnMovePrompt({ available: true, pending: "chain" } as never)).toBe(false);
    expect(isOwnMovePrompt({ available: true, pending: "idle" } as never)).toBe(false);
    expect(isOwnMovePrompt(null)).toBe(false);
  });
});
