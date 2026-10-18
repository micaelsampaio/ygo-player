import { describe, expect, it } from "vitest";
import {
  candidateWhere, decodeDescription, LOC_DECK, LOC_EXTRA, LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_REMOVED, LOC_SZONE,
  locationLabel, PromptData, singlePromptAnswer,
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
