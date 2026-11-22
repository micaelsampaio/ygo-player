import { describe, expect, it } from "vitest";
import {
  candidateWhere, decodeDescription, LOC_DECK, LOC_EXTRA, LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_REMOVED, LOC_SZONE,
  completesSelection, doubleClickPosition, doublePickAnswer, hiddenCardName, isCandidateVisible, locationLabel, PromptData, promptAsSeen, singlePromptAnswer,
} from "./assist-prompt";

describe("locationLabel", () => {
  it("names each ocgcore location", () => {
    expect(locationLabel(LOC_HAND)).toBe("Hand");
    expect(locationLabel(LOC_MZONE)).toBe("Field");
    expect(locationLabel(LOC_SZONE)).toBe("Field");
    expect(locationLabel(LOC_GRAVE)).toBe("GY");
    expect(locationLabel(LOC_REMOVED)).toBe("Banished");
    expect(locationLabel(LOC_EXTRA)).toBe("Extra Deck");
    expect(locationLabel(LOC_DECK)).toBe("Deck");
  });

  it("is undefined for no known bit", () => {
    expect(locationLabel(0)).toBeUndefined();
    expect(locationLabel(0x100)).toBeUndefined();
  });
});

describe("candidateWhere", () => {
  const ref = { code: 1, ctrl: 1, loc: LOC_GRAVE, seq: 0, pos: 0 };

  it("prefixes the opponent's cards", () => {
    expect(candidateWhere(ref, 1)).toBe("GY");
    expect(candidateWhere(ref, 0)).toBe("Opponent's GY");
  });

  it("marks an unknown location", () => {
    expect(candidateWhere({ ...ref, loc: 0 }, 1)).toBe("?");
  });
});

describe("decodeDescription", () => {
  it("splits aux.Stringid(code, n)", () => {
    const desc = ((BigInt(89631139) << 20n) | 2n).toString();
    expect(decodeDescription(desc)).toEqual({ code: 89631139, index: 2 });
  });

  it("is null for system strings and junk", () => {
    expect(decodeDescription(undefined)).toBeNull();
    expect(decodeDescription("1160")).toBeNull();
    expect(decodeDescription("not a number")).toBeNull();
  });
});

describe("singlePromptAnswer", () => {
  const base: PromptData = { player: 0, msg: 15, kind: "tribute" };
  const cand = (code: number) => ({ code, ctrl: 0, loc: LOC_MZONE, seq: 0, pos: 1 });

  it("answers a Tribute prompt with one valid candidate", () => {
    expect(singlePromptAnswer({ ...base, min: 1, max: 1, candidates: [cand(1)] })).toEqual({ indices: [0] });
  });

  it("has no single answer for a yes/no prompt", () => {
    expect(singlePromptAnswer({ ...base, kind: "effectYesNo" })).toBeNull();
  });
});

describe("doublePickAnswer", () => {
  const cand = (code: number, loc = LOC_HAND) => ({ code, ctrl: 0, loc, seq: 0 });
  const prompt = (o: Partial<PromptData>): PromptData =>
    ({ player: 0, msg: 15, kind: "card", min: 1, max: 1, candidates: [cand(1), cand(2), cand(3)], ...o }) as PromptData;

  it("single pick: picks the card and confirms", () => {
    expect(doublePickAnswer(prompt({}), [0], 2)).toEqual({ selected: [2], confirm: true });
  });

  it("multi pick: toggles once from before the gesture, confirming when that completes the count", () => {
    const two = prompt({ min: 2, max: 2 });
    expect(doublePickAnswer(two, [], 0)).toEqual({ selected: [0], confirm: false });
    expect(doublePickAnswer(two, [0], 1)).toEqual({ selected: [0, 1], confirm: true });
    // Double-clicking a picked card unpicks it, like a click.
    expect(doublePickAnswer(two, [0, 1], 1)).toEqual({ selected: [0], confirm: false });
    // 1 to 3: reaching the required count confirms.
    expect(doublePickAnswer(prompt({ min: 1, max: 3 }), [], 2)).toEqual({ selected: [2], confirm: true });
  });

  it("groups of copies (dialog thumbnails) add the next copy", () => {
    const p = prompt({ min: 2, max: 2, candidates: [cand(1, LOC_GRAVE), cand(1, LOC_GRAVE), cand(2, LOC_GRAVE)] });
    expect(doublePickAnswer(p, [0], { key: "1", indices: [0, 1] })).toEqual({ selected: [0, 1], confirm: true });
  });

  it("Tributes confirm once they are enough", () => {
    const tribute = prompt({ kind: "tribute", min: 2, max: 2, candidates: [{ ...cand(1, LOC_MZONE), release: 2 }, cand(2, LOC_MZONE), cand(3, LOC_MZONE)] as PromptData["candidates"] });
    expect(doublePickAnswer(tribute, [], 0)).toEqual({ selected: [0], confirm: true });
    expect(doublePickAnswer(tribute, [], 1)).toEqual({ selected: [1], confirm: false });
    expect(completesSelection(tribute, [1, 2])).toBe(true);
  });
});

describe("doubleClickPosition", () => {
  it("face-up Attack when offered, else the only position, else nothing", () => {
    expect(doubleClickPosition(0x1 | 0x4)).toBe(0x1);
    expect(doubleClickPosition(0x1 | 0x8)).toBe(0x1);
    expect(doubleClickPosition(0x4)).toBe(0x4);
    expect(doubleClickPosition(0x4 | 0x8)).toBeNull();
    expect(doubleClickPosition(0)).toBeNull();
    expect(doubleClickPosition(undefined)).toBeNull();
  });
});

describe("promptAsSeen / isCandidateVisible", () => {
  const FACEUP = 0x1;
  const FACEDOWN = 0x8;
  const prompt: PromptData = {
    player: 0, msg: 15, kind: "card",
    candidates: [
      { code: 11, ctrl: 1, loc: LOC_MZONE, seq: 0, pos: FACEDOWN },
      { code: 12, ctrl: 1, loc: LOC_MZONE, seq: 1, pos: FACEUP },
      { code: 13, ctrl: 1, loc: LOC_HAND, seq: 0, pos: 0 },
      { code: 14, ctrl: 1, loc: LOC_DECK, seq: 0, pos: 0 },
      { code: 15, ctrl: 1, loc: LOC_GRAVE, seq: 0, pos: 0 },
      { code: 16, ctrl: 1, loc: LOC_EXTRA, seq: 0, pos: FACEDOWN },
      { code: 17, ctrl: 0, loc: LOC_SZONE, seq: 0, pos: FACEDOWN },
      { code: 18, ctrl: 0, loc: LOC_DECK, seq: 0, pos: 0 },
    ],
  };

  it("keeps the codes of the player's own cards, the GY and face-up cards; the opponent's Set, hand, Deck and face-down Extra Deck cards are 0", () => {
    expect(promptAsSeen(prompt, false).candidates!.map((c) => c.code)).toEqual([0, 12, 0, 0, 15, 0, 17, 18]);
  });

  it("changes nothing when the duel shows the opponent's cards, or nothing is hidden", () => {
    expect(promptAsSeen(prompt, true)).toBe(prompt);
    const open = { ...prompt, candidates: prompt.candidates!.slice(1, 2) };
    expect(promptAsSeen(open, false)).toBe(open);
  });

  it("hides the prompt's subject card too", () => {
    const p: PromptData = { player: 0, msg: 19, kind: "position", code: 21, card: { code: 21, ctrl: 1, loc: LOC_SZONE, seq: 0, pos: FACEDOWN } };
    expect(promptAsSeen(p, false)).toMatchObject({ code: 0, card: { code: 0 } });
  });

  it("names a hidden field card a Set card, else a hidden card", () => {
    expect(hiddenCardName({ loc: LOC_MZONE })).toBe("Set card");
    expect(hiddenCardName({ loc: LOC_SZONE })).toBe("Set card");
    expect(hiddenCardName({ loc: LOC_HAND })).toBe("Hidden card");
    expect(isCandidateVisible({ ctrl: 1, loc: LOC_REMOVED, pos: FACEDOWN }, 0)).toBe(false);
    expect(isCandidateVisible({ ctrl: 1, loc: LOC_REMOVED, pos: FACEUP }, 0)).toBe(true);
  });
});
