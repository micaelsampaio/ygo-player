import { describe, expect, it } from "vitest";
import { chainAheadOfBoard } from "./assist-query";

const chainWindow = (chainLength?: number) => ({ available: true, pending: "chain", respond: { activatable: [], canPass: true, forced: false, chainLength } }) as never;

describe("chainAheadOfBoard", () => {
  it("waits while the engine's chain is longer than what the board has shown", () => {
    expect(chainAheadOfBoard(chainWindow(1), 0)).toBe(true);
    expect(chainAheadOfBoard(chainWindow(2), 1)).toBe(true);
  });
  it("shows once the board caught up, for an empty chain, and for anything that isn't a chain window", () => {
    expect(chainAheadOfBoard(chainWindow(1), 1)).toBe(false);
    expect(chainAheadOfBoard(chainWindow(0), 0)).toBe(false);
    expect(chainAheadOfBoard(chainWindow(undefined), 0)).toBe(false);
    expect(chainAheadOfBoard({ available: true, pending: "idle" } as never, 0)).toBe(false);
    expect(chainAheadOfBoard(null, 0)).toBe(false);
  });
});
