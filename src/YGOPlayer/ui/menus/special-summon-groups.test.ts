import { describe, expect, it } from "vitest";
import { extraDeckSummonKind, groupSpecialSummons } from "./special-summon-groups";

const ref = (code: number, loc: number, seq = 0) => ({ code, ctrl: 0, loc, seq, pos: 0 });

describe("groupSpecialSummons", () => {
  it("groups by origin, the Extra Deck first, and drops empty origins", () => {
    const groups = groupSpecialSummons([ref(1, 0x10), ref(2, 0x40), ref(3, 0x02), ref(4, 0x40, 1)]);
    expect(groups.map((g) => [g.label, g.refs.map((r) => r.code)])).toEqual([
      ["Extra Deck", [2, 4]],
      ["Hand", [3]],
      ["GY", [1]],
    ]);
  });

  it("keeps two copies of a card in different places apart (hand and GY)", () => {
    const groups = groupSpecialSummons([ref(7, 0x02), ref(7, 0x10)]);
    expect(groups.map((g) => g.label)).toEqual(["Hand", "GY"]);
  });

  it("is empty without options", () => {
    expect(groupSpecialSummons([])).toEqual([]);
  });
});

describe("extraDeckSummonKind", () => {
  it("names the summon an Extra Deck monster needs", () => {
    expect(extraDeckSummonKind("Link Monster")).toBe("Link");
    expect(extraDeckSummonKind("XYZ Pendulum Effect Monster")).toBe("Xyz");
    expect(extraDeckSummonKind("Synchro Tuner Monster")).toBe("Synchro");
    expect(extraDeckSummonKind("Fusion Monster")).toBe("Fusion");
    expect(extraDeckSummonKind("Effect Monster")).toBeUndefined();
    expect(extraDeckSummonKind(undefined)).toBeUndefined();
  });
});
