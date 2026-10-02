import { describe, expect, it } from "vitest";
import { chainTopName, sectionsFor, spaceRow, type AssistQueryResult } from "./assist-sections";
import { LOC_EXTRA, LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_SZONE } from "./assist-prompt";

const CARDS: Record<number, { name: string; type?: string }> = {
  1: { name: "Ash Blossom" },
  2: { name: "Bonfire" },
  3: { name: "Knightmare Unicorn", type: "Link Monster" },
  4: { name: "Baronne", type: "Synchro Tuner Effect Monster" },
  5: { name: "Lurrie" },
};
const duel: any = { ygo: { state: { getCardData: (code: number) => CARDS[code] } } };
const ref = (code: number, loc: number, seq = 0, ctrl = 0) => ({ code, ctrl, loc, seq });

const idle = (options: Partial<Record<string, any>>, nextPhase: string | null = null): AssistQueryResult => ({
  available: true,
  pending: "idle",
  nextPhase,
  options: {
    summonable: [], spSummon: [], reposition: [], mset: [], sset: [], activatable: [],
    toBattle: false, toEnd: false,
    ...options,
  } as any,
});

describe("sectionsFor", () => {
  it("has nothing for an unavailable result or a held prompt", () => {
    expect(sectionsFor(duel, { available: false })).toEqual([]);
    expect(sectionsFor(duel, { available: true, pending: "prompt", prompt: { kind: "yesNo" } as any })).toEqual([]);
  });

  it("keys Activate rows per copy location (field copies per zone) and sends that copy's ref", () => {
    const sections = sectionsFor(duel, idle({
      activatable: [ref(1, LOC_HAND), ref(1, LOC_HAND, 1), ref(1, LOC_GRAVE), ref(2, LOC_SZONE, 2), ref(2, LOC_SZONE, 3)],
    }));
    expect(sections.map((s) => s.title)).toEqual(["Activate"]);
    expect(sections[0].rows).toEqual([
      { key: `Activate:1:0:${LOC_HAND}`, label: "Ash Blossom", commandType: "Activate", data: { id: 1, ctrl: 0, loc: LOC_HAND, seq: 0 }, code: 1, where: "Hand", count: 2, highlight: true, tone: "play" },
      { key: `Activate:1:0:${LOC_GRAVE}`, label: "Ash Blossom", commandType: "Activate", data: { id: 1, ctrl: 0, loc: LOC_GRAVE, seq: 0 }, code: 1, where: "GY", count: 1, highlight: true, tone: "play" },
      { key: `Activate:2:0:${LOC_SZONE}:2`, label: "Bonfire", commandType: "Activate", data: { id: 2, ctrl: 0, loc: LOC_SZONE, seq: 2 }, code: 2, where: expect.any(String), count: 1, highlight: true, tone: "play" },
      { key: `Activate:2:0:${LOC_SZONE}:3`, label: "Bonfire", commandType: "Activate", data: { id: 2, ctrl: 0, loc: LOC_SZONE, seq: 3 }, code: 2, where: expect.any(String), count: 1, highlight: true, tone: "play" },
    ]);
  });

  it("merges two effects of one copy into one row with a count, taking the quick tone", () => {
    const sections = sectionsFor(duel, idle({
      activatable: [ref(5, LOC_HAND), ref(5, LOC_HAND)],
      activatableSpeed: [1, 2],
    }));
    expect(sections[0].rows).toHaveLength(1);
    expect(sections[0].rows[0]).toMatchObject({ count: 2, tone: "quick" });
  });

  it("lists idle sections in order, grouping Special Summons by origin with Extra Deck summon tags", () => {
    const sections = sectionsFor(duel, idle({
      spSummon: [ref(5, LOC_HAND), ref(3, LOC_EXTRA), ref(4, LOC_EXTRA, 1)],
      summonable: [ref(1, LOC_HAND), ref(1, LOC_HAND, 1)],
      mset: [ref(1, LOC_HAND)],
      sset: [ref(2, LOC_HAND)],
      reposition: [ref(5, LOC_MZONE, 2)],
    }, "Battle"));
    expect(sections.map((s) => s.title)).toEqual([
      "Special Summon · Extra Deck",
      "Special Summon · Hand",
      "Normal Summon",
      "Set Monster",
      "Set Spell/Trap",
      "Change Position",
      "Next Phase",
    ]);
    const [ed, hand, normal] = sections;
    expect(ed.rows.map((r) => [r.label, r.where, r.highlight, r.tone, r.data])).toEqual([
      ["Knightmare Unicorn", "Link", false, undefined, { id: 3, ctrl: 0, loc: LOC_EXTRA, seq: 0 }],
      ["Baronne", "Synchro", false, undefined, { id: 4, ctrl: 0, loc: LOC_EXTRA, seq: 1 }],
    ]);
    expect(hand.rows[0].where).toBeUndefined();
    // Non-exact rows collapse every copy by code and send only the code.
    expect(normal.rows).toEqual([
      { key: "Normal Summon:1", label: "Ash Blossom", commandType: "Normal Summon", data: { id: 1 }, code: 1, where: undefined, count: 2, highlight: false, tone: undefined },
    ]);
    expect(sections[3].rows[0].commandType).toBe("Set Monster");
    expect(sections[4].rows[0].commandType).toBe("Set ST");
    expect(sections[5].rows[0].commandType).toBe("Change Card Position");
    expect(sections[6].rows).toEqual([
      { key: "phase:Battle", label: expect.any(String), commandType: "Duel Phase", data: { phase: "Battle" }, count: 1, highlight: false },
    ]);
  });

  it("falls back to #code for a card with no data", () => {
    const sections = sectionsFor(duel, idle({ summonable: [ref(999, LOC_HAND)] }));
    expect(sections[0].rows[0].label).toBe("#999");
  });

  it("Battle Phase: Activate rows are always quick, attacks keyed by attackingId", () => {
    const sections = sectionsFor(duel, {
      available: true,
      pending: "battle",
      nextPhase: null,
      options: { activatable: [ref(1, LOC_HAND)], attackable: [ref(5, LOC_MZONE, 1)], toMain2: true, toEnd: true },
    });
    expect(sections.map((s) => s.title)).toEqual(["Activate", "Attack"]);
    expect(sections[0].rows[0].tone).toBe("quick");
    expect(sections[1].rows[0]).toMatchObject({ key: "Attack:5", commandType: "Attack", data: { attackingId: 5 }, highlight: false });
  });

  it("chain window: quick Activate rows plus a Pass row; Space takes the Pass row", () => {
    const sections = sectionsFor(duel, {
      available: true,
      pending: "chain",
      respond: { activatable: [ref(1, LOC_HAND)], canPass: true, forced: false, chainLength: 1, chain: [ref(2, LOC_SZONE, 0, 1)] },
    });
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Respond to Bonfire (chain link 1)");
    expect(sections[0].rows.map((r) => [r.key, r.label, r.commandType, r.tone])).toEqual([
      [`Activate:1:0:${LOC_HAND}`, "Ash Blossom", "Activate", "quick"],
      ["pass", "Don't respond", "Pass", undefined],
    ]);
    expect(spaceRow(sections)?.key).toBe("pass");
  });

  it("open chain window (length 0): Activate now / Continue; no Pass when it can't pass", () => {
    const open = sectionsFor(duel, {
      available: true,
      pending: "chain",
      respond: { activatable: [], canPass: true, forced: false, chainLength: 0 },
    });
    expect(open).toEqual([{ title: "Activate now", rows: [{ key: "pass", label: "Continue", commandType: "Pass", data: {}, count: 1, highlight: false }] }]);
    const forced = sectionsFor(duel, {
      available: true,
      pending: "chain",
      respond: { activatable: [ref(1, LOC_HAND)], canPass: false, forced: true },
    });
    expect(forced[0].title).toBe("Respond");
    expect(forced[0].rows.map((r) => r.commandType)).toEqual(["Activate"]);
  });
});

describe("spaceRow / chainTopName", () => {
  it("Space takes the only row there is, else nothing", () => {
    const one = sectionsFor(duel, idle({ summonable: [ref(1, LOC_HAND)] }));
    expect(spaceRow(one)?.key).toBe("Normal Summon:1");
    const two = sectionsFor(duel, idle({ summonable: [ref(1, LOC_HAND), ref(5, LOC_HAND)] }));
    expect(spaceRow(two)).toBeNull();
  });

  it("names the card on top of the chain", () => {
    expect(chainTopName(duel, [ref(1, LOC_HAND), ref(2, LOC_SZONE)])).toBe("Bonfire");
    expect(chainTopName(duel, [])).toBeUndefined();
    expect(chainTopName(duel, undefined)).toBeUndefined();
  });
});
