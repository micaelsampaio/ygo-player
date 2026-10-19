import { describe, expect, it } from "vitest";
import { isWaitingOnOpponent } from "./WaitingBanner";

const base = { isPlayerClient: true, gameActive: true, turn: 3, hasPriority: false, controlsBoth: false };

describe("isWaitingOnOpponent", () => {
  it("waits while the opponent holds priority mid-duel", () => {
    expect(isWaitingOnOpponent(base)).toBe(true);
  });
  it("not with priority, before turn 1, after the duel, for spectators or when controlling both sides", () => {
    expect(isWaitingOnOpponent({ ...base, hasPriority: true })).toBe(false);
    expect(isWaitingOnOpponent({ ...base, turn: 0 })).toBe(false);
    expect(isWaitingOnOpponent({ ...base, gameActive: false })).toBe(false);
    expect(isWaitingOnOpponent({ ...base, isPlayerClient: false })).toBe(false);
    expect(isWaitingOnOpponent({ ...base, controlsBoth: true })).toBe(false);
  });
});
