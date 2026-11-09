import { describe, expect, it } from "vitest";
import { coachResponsesOf, deniesFor, opponentChainTop, responseTags } from "./coach";
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
    expect(coachTags(activate, hints, preview)).toEqual(["players chose this 62%", "them −1850 LP", "opens Garunix"]);
    expect(coachTags(summon, hints, preview)).toEqual([]);
    const quiet = parsePreview({ available: true, options: [{ action: summon, lp: { self: 0, opp: 0 }, opens: [] }] });
    expect(coachTags(summon, null, quiet)).toEqual(["opens nothing"]);
    expect(coachTags(activate, hints, { available: false })).toEqual(["players chose this 62%"]);
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
    expect(canPreview({ available: true, pending: "idle" })).toBe(true);
    expect(canPreview({ available: true, pending: "battle" })).toBe(true);
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

  it("answer stats first, with the clean win rate; never \"stops them\"", () => {
    const tags = responseTags(ash, faimena, opp, null);
    expect(tags).toEqual(["they won 41% when Ash Blossom answered Faimena (230 games) · 61% uninterrupted"]);
    expect(tags.join(" ")).not.toContain("stops");
  });

  it("else the choke point, plus the engine's denials", () => {
    expect(responseTags(ash, other, opp, 2)).toEqual(["Lukias is their choke point: 38% when answered", "denies them 2 cards"]);
    expect(responseTags(ash, 999, opp, 1)).toEqual(["denies them 1 card"]);
    expect(responseTags(ash, faimena, null, null)).toEqual([]);
  });

  it("reads the server's denial checks and matches them to rows", () => {
    const action = { commandType: "Activate", data: { id: ash, ctrl: 0, loc: 2, seq: 0 } };
    const responses = coachResponsesOf({ coach: { hints: [], model: "replays", responses: [{ action, denies: 1 }, { action, denies: 0 }] } });
    expect(responses).toHaveLength(1);
    expect(deniesFor(responses, action)).toBe(1);
    expect(deniesFor(responses, { commandType: "Activate", data: { id: 5 } })).toBeNull();
  });
});

