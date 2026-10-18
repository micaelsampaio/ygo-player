import { describe, expect, it } from "vitest";
import { LOC_MZONE, LOC_SZONE } from "./assist-prompt";
import { emzIndexFor, emzSeqFor, placeToYgoZone, samePlace, selectionOpacity, ygoZoneToPlace } from "./assist-zones";

describe("Extra Monster Zone numbering", () => {
  it("player 0's seq 5 is the left zone, player 1's is the right one", () => {
    expect(emzIndexFor(0, 5)).toBe(1);
    expect(emzIndexFor(0, 6)).toBe(2);
    expect(emzIndexFor(1, 5)).toBe(2);
    expect(emzIndexFor(1, 6)).toBe(1);
  });

  it("emzSeqFor is the inverse of emzIndexFor", () => {
    for (const player of [0, 1]) {
      for (const seq of [5, 6]) {
        expect(emzSeqFor(player, emzIndexFor(player, seq))).toBe(seq);
      }
    }
  });
});

describe("placeToYgoZone / ygoZoneToPlace", () => {
  const zones = [
    "M-1", "M-5", "S-1", "S-5", "F", "EMZ-1", "EMZ-2",
    "M2-1", "M2-5", "S2-3", "F2", "EMZ2-1", "EMZ2-2",
  ];

  it("round-trips every field zone from both seats", () => {
    for (const me of [0, 1]) {
      for (const promptPlayer of [0, 1]) {
        for (const zone of zones) {
          const place = ygoZoneToPlace(zone, promptPlayer, me);
          expect(place, zone).not.toBeNull();
          expect(placeToYgoZone(place!, promptPlayer, me)).toBe(zone);
        }
      }
    }
  });

  it("has no field zone for the Pendulum seqs or a bad zone id", () => {
    expect(placeToYgoZone({ player: 0, loc: LOC_SZONE, seq: 6 }, 0, 0)).toBeNull();
    expect(placeToYgoZone({ player: 0, loc: LOC_MZONE, seq: 7 }, 0, 0)).toBeNull();
    expect(placeToYgoZone({ player: 0, loc: LOC_MZONE, seq: -1 }, 0, 0)).toBeNull();
    expect(ygoZoneToPlace("M-6", 0, 0)).toBeNull();
    expect(ygoZoneToPlace("F-1", 0, 0)).toBeNull();
    expect(ygoZoneToPlace("GY", 0, 0)).toBeNull();
  });
});

describe("samePlace", () => {
  it("compares player, location and sequence", () => {
    const a = { player: 0, loc: LOC_MZONE, seq: 2 };
    expect(samePlace(a, { ...a })).toBe(true);
    expect(samePlace(a, { ...a, player: 1 })).toBe(false);
    expect(samePlace(a, { ...a, loc: LOC_SZONE })).toBe(false);
    expect(samePlace(a, { ...a, seq: 3 })).toBe(false);
  });
});

describe("selectionOpacity", () => {
  it("pulses between min and max", () => {
    expect(selectionOpacity(-Math.PI / 2, false)).toBeCloseTo(0.3);
    expect(selectionOpacity(Math.PI / 2, false)).toBeCloseTo(1);
    expect(selectionOpacity(0, false, 0, 1)).toBeCloseTo(0.5);
  });
});
