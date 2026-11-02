import { describe, expect, it } from "vitest";
import { staleOwnTurnOptions } from "./stale-own-turn";

describe("staleOwnTurnOptions", () => {
  it("drops your Main / Battle Phase options in the bot's turn", () => {
    expect(staleOwnTurnOptions({ available: true, pending: "idle" }, { botDuel: true, isLocalTurn: false })).toBe(true);
    expect(staleOwnTurnOptions({ available: true, pending: "battle" }, { botDuel: true, isLocalTurn: false })).toBe(true);
  });

  it("keeps your chain windows in its turn, your own turn's options, and every other duel", () => {
    expect(staleOwnTurnOptions({ available: true, pending: "chain" }, { botDuel: true, isLocalTurn: false })).toBe(false);
    expect(staleOwnTurnOptions({ available: true, pending: "prompt" }, { botDuel: true, isLocalTurn: false })).toBe(false);
    expect(staleOwnTurnOptions({ available: true, pending: "idle" }, { botDuel: true, isLocalTurn: true })).toBe(false);
    expect(staleOwnTurnOptions({ available: true, pending: "idle" }, { botDuel: false, isLocalTurn: false })).toBe(false);
  });
});
