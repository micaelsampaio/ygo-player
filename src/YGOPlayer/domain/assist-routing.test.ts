import { describe, expect, it } from "vitest";
import type { AssistQueryResult } from "./assist-query";
import { assistPhaseRouteFor, assistRouteFor, findAssistOption, RESPOND_FIRST_NOTICE, zoneToLocation } from "./assist-routing";
import { LOC_DECK, LOC_EXTRA, LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_REMOVED, LOC_SZONE } from "./assist-prompt";

const CODE = 1000;
const ref = (loc: number, seq: number, code = CODE) => ({ code, ctrl: 0, loc, seq, pos: 0 });
const idleOptions = { summonable: [], spSummon: [], reposition: [], mset: [], sset: [], activatable: [], toBattle: true, toEnd: true };

describe("zoneToLocation", () => {
  it("maps every ygo-core zone to its ocgcore location", () => {
    expect(zoneToLocation("H-3")).toEqual({ loc: LOC_HAND, seq: null });
    expect(zoneToLocation("M-2")).toEqual({ loc: LOC_MZONE, seq: 1 });
    expect(zoneToLocation("M2-5")).toEqual({ loc: LOC_MZONE, seq: 4 });
    expect(zoneToLocation("S-1")).toEqual({ loc: LOC_SZONE, seq: 0 });
    expect(zoneToLocation("F")).toEqual({ loc: LOC_SZONE, seq: 5 });
    expect(zoneToLocation("F2")).toEqual({ loc: LOC_SZONE, seq: 5 });
    expect(zoneToLocation("GY")).toEqual({ loc: LOC_GRAVE, seq: null });
    expect(zoneToLocation("B2")).toEqual({ loc: LOC_REMOVED, seq: null });
    expect(zoneToLocation("ED")).toEqual({ loc: LOC_EXTRA, seq: null });
    expect(zoneToLocation("D")).toEqual({ loc: LOC_DECK, seq: null });
  });

  it("numbers the Extra Monster Zones from each player's own side", () => {
    expect(zoneToLocation("EMZ-1")).toEqual({ loc: LOC_MZONE, seq: 5 });
    expect(zoneToLocation("EMZ-2")).toEqual({ loc: LOC_MZONE, seq: 6 });
    expect(zoneToLocation("EMZ2-1")).toEqual({ loc: LOC_MZONE, seq: 6 });
    expect(zoneToLocation("EMZ-3")).toEqual({ loc: LOC_MZONE, seq: null });
  });

  it("has no location for a missing or unknown zone", () => {
    expect(zoneToLocation(null)).toBeNull();
    expect(zoneToLocation("")).toBeNull();
    expect(zoneToLocation("X-1")).toBeNull();
  });
});

describe("findAssistOption", () => {
  it("prefers the exact zone when the ygo zone names one, else the first copy there", () => {
    const result: AssistQueryResult = {
      available: true, pending: "idle",
      options: { ...idleOptions, activatable: [ref(LOC_SZONE, 0), ref(LOC_SZONE, 2)] },
    };
    expect(findAssistOption(result, "Activate", CODE, "S-3")).toEqual(ref(LOC_SZONE, 2));
    expect(findAssistOption(result, "Activate", CODE, "S-2")).toEqual(ref(LOC_SZONE, 0));
    expect(findAssistOption(result, "Activate", CODE, "M-1")).toBeNull();
    expect(findAssistOption(result, "Activate", CODE + 1, "S-1")).toBeNull();
  });

  it("reads the battle and chain lists for Activate only", () => {
    const battle: AssistQueryResult = {
      available: true, pending: "battle",
      options: { attackable: [], activatable: [ref(LOC_HAND, 0)], toMain2: true, toEnd: true },
    };
    expect(findAssistOption(battle, "Activate", CODE, "H-1")).toEqual(ref(LOC_HAND, 0));
    expect(findAssistOption(battle, "Normal Summon", CODE, "H-1")).toBeNull();

    const chain: AssistQueryResult = {
      available: true, pending: "chain",
      respond: { activatable: [ref(LOC_GRAVE, 0)], canPass: true, forced: false, chainLength: 1 },
    };
    expect(findAssistOption(chain, "Activate", CODE, "GY")).toEqual(ref(LOC_GRAVE, 0));
  });

  it("finds nothing before the first query", () => {
    expect(findAssistOption(null, "Activate", CODE, "H-1")).toBeNull();
    expect(findAssistOption(undefined, "Activate", CODE, "H-1")).toBeNull();
  });
});

describe("chain window without a chain length", () => {
  // Older servers don't send chainLength: neither "nothing chained yet" nor "something to respond to" can be told.
  const chain = { available: true, pending: "chain", respond: { activatable: [], canPass: true, forced: false } } as AssistQueryResult;

  it("falls back to a free-form card move", () => {
    expect(assistRouteFor(chain, "Normal Summon", CODE, "H-1")).toEqual({ kind: "freeForm" });
  });

  it("blocks a phase change", () => {
    expect(assistPhaseRouteFor(chain, "Battle")).toEqual({ kind: "blocked", message: RESPOND_FIRST_NOTICE });
  });

  it("treats a missing respond block like a window that can't be passed", () => {
    const bare = { available: true, pending: "chain" } as AssistQueryResult;
    expect(assistRouteFor(bare, "Normal Summon", CODE, "H-1")).toEqual({ kind: "freeForm" });
    expect(assistPhaseRouteFor(bare, "Battle")).toEqual({ kind: "blocked", message: RESPOND_FIRST_NOTICE });
  });
});

describe("assistPhaseRouteFor in the Battle Phase", () => {
  it("lets the engine skip from the Battle Phase straight to the End Phase", () => {
    const battle: AssistQueryResult = {
      available: true, pending: "battle", nextPhase: "Main Phase 2", ygoPhase: "Battle",
      options: { attackable: [], activatable: [], toMain2: true, toEnd: true },
    };
    expect(assistPhaseRouteFor(battle, "Main Phase 2")).toEqual({ kind: "choose" });
    expect(assistPhaseRouteFor(battle, "End")).toEqual({ kind: "choose" });
    expect(assistPhaseRouteFor({ ...battle, ygoPhase: "Main Phase 2" }, "End")).toEqual({ kind: "freeForm" });
  });
});
