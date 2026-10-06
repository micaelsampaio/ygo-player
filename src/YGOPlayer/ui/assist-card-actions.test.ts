import { describe, expect, it } from "vitest";
import { cardActionRows, isMasterDuelStyle, rowMatchesCard } from "./assist-card-actions";
import { LOC_EXTRA, LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_SZONE } from "./assist-prompt";

const CARDS: Record<number, { name: string; type: string }> = {
  100: { name: "Chamber Dragonmaid", type: "Effect Monster" },
  200: { name: "Striker Dragon", type: "Link Monster" },
  300: { name: "Dragonmaid Changeover", type: "Spell Card" },
};
const duel: any = { ygo: { state: { getCardData: (code: number) => CARDS[code] } } };
const ref = (code: number, loc: number, seq = 0) => ({ code, ctrl: 0, loc, seq });

const idle = (o: Partial<Record<string, unknown[]>>) => ({
  available: true, pending: "idle",
  options: { summonable: [], spSummon: [], reposition: [], mset: [], sset: [], activatable: [], toBattle: true, toEnd: true, ...o },
  nextPhase: "Battle",
}) as any;

describe("cardActionRows", () => {
  it("lists only the clicked card's moves, summons first, labelled for a menu", () => {
    const result = idle({ summonable: [ref(100, LOC_HAND)], mset: [ref(100, LOC_HAND)], activatable: [ref(300, LOC_HAND)] });
    expect(cardActionRows(duel, result, 100, "H-1").map((r) => r.label)).toEqual(["Normal Summon", "Set"]);
    expect(cardActionRows(duel, result, 300, "H-2").map((r) => r.label)).toEqual(["Activate"]);
  });

  it("names the Extra Deck summon kind and only offers it from the Extra Deck", () => {
    const result = idle({ spSummon: [ref(200, LOC_EXTRA)] });
    expect(cardActionRows(duel, result, 200, "ED")).toMatchObject([{ label: "Link Summon", commandType: "Special Summon", data: { id: 200, loc: LOC_EXTRA } }]);
    expect(cardActionRows(duel, result, 200, "GY")).toEqual([]);
  });

  it("tells field copies apart by zone", () => {
    const result = idle({ activatable: [ref(100, LOC_MZONE, 2)] });
    expect(cardActionRows(duel, result, 100, "M-3").map((r) => r.label)).toEqual(["Activate"]);
    expect(cardActionRows(duel, result, 100, "M-1")).toEqual([]);
  });

  it("says a chain window's activation chains, and offers nothing while a prompt is held", () => {
    const chain = { available: true, pending: "chain", respond: { activatable: [ref(100, LOC_GRAVE)], canPass: true, forced: false, chainLength: 1 } } as any;
    expect(cardActionRows(duel, chain, 100, "GY").map((r) => r.label)).toEqual(["Chain: Activate"]);
    expect(cardActionRows(duel, { available: true, pending: "prompt", prompt: { kind: "yesNo" } } as any, 100, "GY")).toEqual([]);
    expect(cardActionRows(duel, null, 100, "GY")).toEqual([]);
  });
});

describe("rowMatchesCard", () => {
  it("matches code-only rows (Normal Summon, Set) to hand cards only", () => {
    expect(rowMatchesCard({ code: 1, data: { id: 1 } }, 1, "H-3")).toBe(true);
    expect(rowMatchesCard({ code: 1, data: { id: 1 } }, 1, "M-1")).toBe(false);
  });
});

describe("isMasterDuelStyle", () => {
  it("is on for assisted bot duels only", () => {
    expect(isMasterDuelStyle({ assist: {}, ygo: { options: { assistedMode: true, botDuel: true } } } as any)).toBe(true);
    expect(isMasterDuelStyle({ assist: {}, ygo: { options: { assistedMode: true } } } as any)).toBe(false);
    expect(isMasterDuelStyle({ ygo: { options: { assistedMode: true, botDuel: true } } } as any)).toBe(false);
  });
});

describe("cardActionRows on Set Spells/Traps", () => {
  it("offers Activate on a Set card in its Spell/Trap zone, as the engine lists it", () => {
    const result = idle({ activatable: [{ code: 300, ctrl: 0, loc: LOC_SZONE, seq: 0, pos: 10 }] });
    expect(cardActionRows(duel, result, 300, "S-1").map((r) => r.label)).toEqual(["Activate"]);
    expect(cardActionRows(duel, result, 300, "S-2")).toEqual([]);
  });
});
