import { describe, expect, it } from "vitest";
import { ANSWER_PROMPT_FIRST_NOTICE, assistPhaseRouteFor, assistRouteFor, RESPOND_FIRST_NOTICE } from "./assist-routing";

const LACRIMA = 28803166;
const inHand = { code: LACRIMA, ctrl: 0, loc: 0x02, seq: 0 };
const idle = { available: true, pending: "idle", options: { summonable: [inHand], spSummon: [], reposition: [], mset: [], sset: [], activatable: [] } };
const openWindow = { available: true, pending: "chain", respond: { activatable: [{ code: 1, ctrl: 0, loc: 0x02, seq: 0 }], canPass: true, forced: false, chainLength: 0 } };
const responding = { ...openWindow, respond: { ...openWindow.respond, chainLength: 1 } };

describe("assistRouteFor", () => {
  it("goes through the engine when it lists the move", () => {
    expect(assistRouteFor(idle, "Normal Summon", LACRIMA, "H-1")).toEqual({ kind: "choose", ref: inHand });
  });

  it("continues past the player's open window (no chain yet) before a summon", () => {
    expect(assistRouteFor(openWindow, "Normal Summon", LACRIMA, "H-1")).toEqual({ kind: "continueFirst" });
  });

  it("blocks a move while a chain waits for a response — the engine would reject it", () => {
    expect(assistRouteFor(responding, "Normal Summon", LACRIMA, "H-1")).toEqual({ kind: "blocked", message: RESPOND_FIRST_NOTICE });
  });

  it("falls back to a free-form move otherwise (an older server without the chain length, a forced window, no options)", () => {
    const old = { ...openWindow, respond: { ...openWindow.respond, chainLength: undefined } };
    expect(assistRouteFor(old, "Normal Summon", LACRIMA, "H-1")).toEqual({ kind: "freeForm" });
    expect(assistRouteFor({ ...openWindow, respond: { ...openWindow.respond, canPass: false } }, "Normal Summon", LACRIMA, "H-1")).toEqual({ kind: "freeForm" });
    expect(assistRouteFor({ available: false }, "Normal Summon", LACRIMA, "H-1")).toEqual({ kind: "freeForm" });
  });
});

describe("assistPhaseRouteFor", () => {
  const idle = (ygoPhase: string, nextPhase: string | null) => ({ available: true, pending: "idle", options: {}, nextPhase, ygoPhase });

  it("takes the phase the engine offers next, and End straight from Main Phase 1 / Battle", () => {
    expect(assistPhaseRouteFor(idle("Main Phase 1", "Battle"), "Battle")).toEqual({ kind: "choose" });
    expect(assistPhaseRouteFor(idle("Main Phase 1", "Battle"), "End")).toEqual({ kind: "choose" });
    expect(assistPhaseRouteFor(idle("Draw", "Standby"), "Standby")).toEqual({ kind: "choose" });
    expect(assistPhaseRouteFor(idle("Draw", "Standby"), "Main Phase 1")).toEqual({ kind: "freeForm" });
  });

  it("passes the player's open window first, and waits on a response or an effect's choice", () => {
    const window = (chainLength: number) => ({ available: true, pending: "chain", respond: { activatable: [], canPass: true, chainLength } });
    expect(assistPhaseRouteFor(window(0), "Battle")).toEqual({ kind: "continueFirst" });
    expect(assistPhaseRouteFor(window(1), "Battle")).toEqual({ kind: "blocked", message: RESPOND_FIRST_NOTICE });
    expect(assistPhaseRouteFor({ available: true, pending: "prompt" }, "End")).toEqual({ kind: "blocked", message: ANSWER_PROMPT_FIRST_NOTICE });
    expect(assistPhaseRouteFor({ available: false }, "End")).toEqual({ kind: "freeForm" });
  });
});
