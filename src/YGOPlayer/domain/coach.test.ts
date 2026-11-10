import { describe, expect, it } from "vitest";
import { coachResponsesOf, deniesFor, opponentChainTop, responseTags, stopsText } from "./coach";
import { canPreview, coachHintsOf, coachTags, decisionKey, deepEqual, endBoardText, hintFor, lpText, parsePreview, parseSuggestion, winRateText } from "./coach";

const activate = { commandType: "Activate Card", data: { code: 14558127, loc: 2, seq: 1 } };
const summon = { commandType: "Normal Summon", data: { code: 1, loc: 2, seq: 0 } };

describe("coach hint matching", () => {
  it("deep-equals actions whatever their key order", () => {
    expect(deepEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it("finds the hint for a row's choose action, and only that one", () => {
    const result = { available: true, pending: "idle", coach: { model: "replays", hints: [{ action: { commandType: "Activate Card", data: { seq: 1, loc: 2, code: 14558127 } }, share: 0.62 }] } };
    const hints = coachHintsOf(result);
    expect(hintFor(hints, activate)?.share).toBe(0.62);
    expect(hintFor(hints, summon)).toBeNull();
    expect(hintFor(hints, { ...activate, data: { ...activate.data, seq: 2 } })).toBeNull();
  });

  it("matches the server's exact-copy actions to rows that send fewer fields (grouped copies, no effect desc)", () => {
    const hints = coachHintsOf({ coach: { model: "replays", hints: [
      { action: { commandType: "Normal Summon", data: { id: 7, ctrl: 0, loc: 2, seq: 3 } }, share: 0.5 },
      { action: { commandType: "Attack", data: { attackingId: 9, ctrl: 0, loc: 4, seq: 1 } }, share: 0.3 },
      { action: { commandType: "Activate", data: { id: 5, ctrl: 0, loc: 2, seq: 0, desc: "123", nth: 0 } }, share: 0.2 },
    ] } });
    expect(hintFor(hints, { commandType: "Normal Summon", data: { id: 7 } })?.share).toBe(0.5);
    expect(hintFor(hints, { commandType: "Attack", data: { attackingId: 9 } })?.share).toBe(0.3);
    expect(hintFor(hints, { commandType: "Activate", data: { id: 5, ctrl: 0, loc: 2, seq: 0 } })?.share).toBe(0.2);
    expect(hintFor(hints, { commandType: "Normal Summon", data: { id: 8 } })).toBeNull();
    expect(hintFor(hints, { commandType: "Activate", data: { id: 5, ctrl: 0, loc: 16, seq: 0 } })).toBeNull();
  });

  it("ignores a missing or malformed coach field", () => {
    expect(coachHintsOf({ available: true })).toBeNull();
    expect(coachHintsOf({ coach: { hints: [{ share: 0.5 }, { action: activate, share: "x" }] } })).toBeNull();
  });

  it("tags rows with the share, then the preview's LP and what it opens", () => {
    const hints = [{ action: activate, share: 0.618 }];
    const preview = parsePreview({ available: true, options: [{ action: activate, lp: { self: 0, opp: -1850 }, opens: [{ code: 1, name: "Garunix" }, { code: 1, name: "Garunix" }] }] });
    expect(coachTags(activate, hints, preview)).toEqual(["~62% pick this in similar replays", "them −1850 LP", "opens Garunix"]);
    expect(coachTags(summon, hints, preview)).toEqual([]);
    const quiet = parsePreview({ available: true, options: [{ action: summon, lp: { self: 0, opp: 0 }, opens: [] }] });
    // Nothing happens to them: no tag (no "opens nothing").
    expect(coachTags(summon, null, quiet)).toEqual([]);
    expect(coachTags(activate, hints, { available: false })).toEqual(["~62% pick this in similar replays"]);
  });

  it("the interruptions an option may meet, from what it does and what they may hold", () => {
    const search = { commandType: "Activate", data: { id: 5, ctrl: 0, loc: 0x02, seq: 0 } };
    const field = { commandType: "Activate", data: { id: 6, ctrl: 0, loc: 0x04, seq: 0 } };
    const preview = parsePreview({ available: true, options: [
      { action: search, lp: { self: 0, opp: 0 }, opens: [], does: { fromDeck: 1, toHand: 1, summons: 0 } },
      { action: field, lp: { self: 0, opp: 0 }, opens: [], does: { fromDeck: 0, toHand: 0, summons: 1 } },
    ] });
    const held = [{ name: "Ash Blossom & Joyous Spring", chance: 0.28 }, { name: "Droll & Lock Bird", chance: 0.1 }, { name: "Infinite Impermanence", chance: 0.3 }, { name: "Mulcharmy Fuwalos", chance: 0.02 }];
    expect(coachTags(search, null, preview, held)).toEqual(["may meet Ash Blossom & Joyous Spring 28%", "may meet Droll & Lock Bird 10%"]);
    // A monster effect on the field: Impermanence; the summon meets Fuwalos only below 5%: left out.
    expect(coachTags(field, null, preview, held)).toEqual(["may meet Infinite Impermanence 30%"]);
    expect(coachTags(search, null, preview, null)).toEqual([]);
  });

  it("formats LP changes, win rates and the end board", () => {
    expect(lpText(-1850)).toBe("−1850 LP");
    expect(lpText(500)).toBe("+500 LP");
    expect(winRateText({ games: 1234, wins: 642 })).toBe("52% of 1,234");
    expect(winRateText({ games: 0, wins: 0 })).toBe("no games yet");
    expect(endBoardText({ interruptions: 3, now: 1 })).toBe("End board: 3 interruptions (now 1)");
    expect(endBoardText({ interruptions: 1, now: 0 })).toBe("End board: 1 interruption (now 0)");
  });
});

describe("coach preview / suggestion acks", () => {
  it("keys a decision by its options, not its hints", () => {
    const a = { available: true, pending: "idle", options: { toEnd: true } };
    expect(decisionKey({ ...a, coach: { hints: [], model: "replays" } })).toBe(decisionKey(a));
    expect(decisionKey({ ...a, options: { toEnd: false } })).not.toBe(decisionKey(a));
    expect(decisionKey({ available: false })).toBeNull();
  });

  it("previews only idle and battle decisions", () => {
    const ref = { code: 1, ctrl: 0, loc: 2, seq: 0, pos: 0 };
    expect(canPreview({ available: true, pending: "idle", options: { activatable: [ref] } })).toBe(true);
    expect(canPreview({ available: true, pending: "battle", options: { activatable: [], attackable: [ref] } })).toBe(true);
    // Only Next Phase / summons: nothing the server previews.
    expect(canPreview({ available: true, pending: "idle", options: { activatable: [], summonable: [ref] } })).toBe(false);
    expect(canPreview({ available: true, pending: "idle" })).toBe(false);
    expect(canPreview({ available: true, pending: "chain" })).toBe(false);
    expect(canPreview({ available: false })).toBe(false);
  });

  it("reads the suggestion, or its reason", () => {
    expect(parseSuggestion({ available: true, steps: ["Normal Summon Lukias"], end: { interruptions: 2, now: 0 }, ms: 900 }))
      .toEqual({ available: true, steps: ["Normal Summon Lukias"], end: { interruptions: 2, now: 0 }, ms: 900 });
    expect(parseSuggestion({ available: false, reason: "The coach is busy, try again in a moment" }))
      .toEqual({ available: false, reason: "The coach is busy, try again in a moment" });
    expect(parseSuggestion(null).available).toBe(false);
    expect(parsePreview({ available: false })).toEqual({ available: false });
  });
});

describe("a row matching several server entries", () => {
  const copy = (seq: number) => ({ commandType: "Normal Summon", data: { id: 7, ctrl: 0, loc: 2, seq } });
  const row = { commandType: "Normal Summon", data: { id: 7 } };

  it("hints: an exact match wins, otherwise the shares add up", () => {
    expect(hintFor([{ action: copy(0), share: 0.3 }, { action: copy(1), share: 0.2 }], row)?.share).toBeCloseTo(0.5);
    expect(hintFor([{ action: copy(0), share: 0.3 }, { action: row, share: 0.4 }], row)?.share).toBe(0.4);
    expect(hintFor([{ action: copy(0), share: 0.7 }, { action: copy(1), share: 0.6 }], row)?.share).toBe(1);
  });

  it("preview: tags only when the matches agree, or the exact one", () => {
    const attack = (target: number) => ({ commandType: "Attack", data: { attackingId: 5, target } });
    const attackRow = { commandType: "Attack", data: { attackingId: 5 } };
    const opt = (action: { commandType: string; data: unknown }, opp: number) => ({ action, lp: { self: 0, opp }, opens: [] });
    const agree = parsePreview({ available: true, options: [opt(attack(0), -1000), opt(attack(1), -1000)] });
    expect(coachTags(attackRow, null, agree)).toEqual(["them \u22121000 LP"]);
    const differ = parsePreview({ available: true, options: [opt(attack(0), -1000), opt(attack(1), -2500)] });
    expect(coachTags(attackRow, null, differ)).toEqual([]);
    const withExact = parsePreview({ available: true, options: [opt(attack(0), -1000), opt(attackRow, -2500)] });
    expect(coachTags(attackRow, null, withExact)).toEqual(["them \u22122500 LP"]);
  });
});

describe("response tips on the bot's turn", () => {
  const ash = 14558127, faimena = 900, other = 901;
  const opp = {
    deckType: "Dracotail",
    clean: { games: 100, wins: 61 },
    chokePoints: [{ code: other, name: "Lukias", games: 50, wins: 19 }],
    answers: [{ answer: { code: ash, name: "Ash Blossom" }, target: { code: faimena, name: "Faimena" }, games: 230, wins: 94 }],
  };

  it("finds the opponent's card on top of the chain, not the human's", () => {
    const chain = (ctrl: number) => ({ available: true, pending: "chain", respond: { chain: [{ code: 1, ctrl: 0 }, { code: faimena, ctrl }] } });
    expect(opponentChainTop(chain(1), 0)).toEqual({ code: faimena, ctrl: 1 });
    expect(opponentChainTop(chain(0), 0)).toBeNull();
    expect(opponentChainTop({ available: true, pending: "idle" }, 0)).toBeNull();
  });

  it("the bot going first: the engine numbers it 0, so the human's own cards tell who is who", () => {
    // Board: human 0, bot 1; engine (turn order): bot 0, human 1. The bot's Mululu is chain link 1.
    const r = { available: true, pending: "chain", respond: { activatable: [{ code: ash, ctrl: 1, loc: 2, seq: 0, pos: 0 }], chain: [{ code: faimena, ctrl: 0 }] } };
    expect(opponentChainTop(r, 0)).toEqual({ code: faimena, ctrl: 0 });
    const own = { ...r, respond: { ...r.respond, chain: [{ code: ash, ctrl: 1 }] } };
    expect(opponentChainTop(own, 0)).toBeNull();
  });

  it("answer stats first, with the clean win rate, and that it's where players usually use it; never \"stops them X%\"", () => {
    const tags = responseTags(ash, faimena, opp, null);
    expect(tags).toEqual([
      "they won 41% when Ash Blossom answered Faimena (230 games) · 61% uninterrupted",
      "vs Dracotail, this is where players usually use Ash Blossom (230 games)",
    ]);
    expect(tags.join(" ")).not.toMatch(/stops them \d+%/);
  });

  it("else the choke point and the usual target, plus what the engine says chaining it stops", () => {
    expect(responseTags(ash, other, opp, { denies: 2, stops: { hand: 1, field: 0, deck: 1 } })).toEqual([
      "Lukias is their choke point: 38% when answered",
      "vs Dracotail, players usually use Ash Blossom on Faimena (230 games)",
      "stops 1 card from their Deck to their hand",
    ]);
    // An older server (a count only).
    expect(responseTags(ash, 999, null, 1)).toEqual(["they end this chain with 1 card fewer"]);
    expect(responseTags(ash, faimena, null, null)).toEqual([]);
  });

  it("says what chaining it stops, in words", () => {
    expect(stopsText({ denies: 3, stops: { hand: 0, field: 2, deck: 2 } })).toBe("stops 2 cards on their field");
    expect(stopsText({ denies: 2, stops: { hand: 2, field: 0, deck: 0 } })).toBe("stops 2 cards to their hand");
    expect(stopsText({ denies: 2, stops: { hand: 1, field: 1, deck: 3 } })).toBe("stops 1 card from their Deck to their hand, 1 card on their field, 1 card out of their Deck");
    expect(stopsText({ denies: 0 })).toBeNull();
  });

  it("reads the server's denial checks and matches them to rows", () => {
    const action = { commandType: "Activate", data: { id: ash, ctrl: 0, loc: 2, seq: 0 } };
    const responses = coachResponsesOf({ coach: { hints: [], model: "replays", responses: [{ action, denies: 1 }, { action, denies: 0 }] } });
    expect(responses).toHaveLength(1);
    expect(deniesFor(responses, action)).toBe(1);
    expect(deniesFor(responses, { commandType: "Activate", data: { id: 5 } })).toBeNull();
  });
});


describe("coach pick on card choices", () => {
  it("reads the query's pick and tags the cards it includes", async () => {
    const { coachPickOf, pickTag } = await import("./coach");
    const pick = coachPickOf({ coach: { hints: [], model: "replays", pick: { indices: [2], source: "line" } } });
    expect(pick).toEqual({ indices: [2], source: "line" });
    expect(pickTag(pick, [1, 2])).toBe("in the suggested line");
    expect(pickTag(pick, [0])).toBeUndefined();
    expect(pickTag({ indices: [0], source: "coach" }, [0])).toBe("coach pick");
    expect(coachPickOf({ coach: { pick: { indices: [], source: "coach" } } })).toBeNull();
    expect(coachPickOf({ coach: { pick: { indices: [1], source: "players" } } })).toBeNull();
    expect(coachPickOf(null)).toBeNull();
  });
});
