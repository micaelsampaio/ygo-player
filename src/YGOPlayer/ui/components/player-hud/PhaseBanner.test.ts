import { describe, expect, it } from "vitest";
import { showsPhaseBanner } from "./PhaseBanner";

describe("showsPhaseBanner", () => {
  it("shows a phase change within the turn", () => {
    expect(showsPhaseBanner({ turn: 2, phase: "Main Phase 1" }, { turn: 2, phase: "Battle Phase" }, true)).toBe(true);
  });
  it("not a new turn's Draw Phase, the first render, the same phase, or for spectators and replays", () => {
    expect(showsPhaseBanner({ turn: 2, phase: "End Phase" }, { turn: 3, phase: "Draw Phase" }, true)).toBe(false);
    expect(showsPhaseBanner(null, { turn: 2, phase: "Main Phase 1" }, true)).toBe(false);
    expect(showsPhaseBanner({ turn: 2, phase: "Main Phase 1" }, { turn: 2, phase: "Main Phase 1" }, true)).toBe(false);
    expect(showsPhaseBanner({ turn: 2, phase: "Main Phase 1" }, { turn: 2, phase: "Battle Phase" }, false)).toBe(false);
  });
});
