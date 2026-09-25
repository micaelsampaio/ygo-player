import { describe, expect, it } from "vitest";
import { PromptData } from "./assist-prompt";
import { pickZone, placeToYgoZone, promptKey, selectionOpacity, ygoZoneToPlace, zoneHighlights } from "./assist-zones";
import { BOT_UNDO_TOOLTIP, undoTooltip } from "./duel-status";

const M = 0x04;
const S = 0x08;

/** SELECT_PLACE flag with only these own-side zones free (bit SET = unavailable). */
function flagFree(zones: { loc: number; seq: number; opp?: boolean }[]): number {
  let flag = 0xffffffff;
  for (const z of zones) {
    let bit = 1 << z.seq;
    if (z.loc === S) bit <<= 8;
    if (z.opp) bit <<= 16;
    flag &= ~bit;
  }
  return flag >>> 0;
}

const place = (over: Partial<PromptData>): PromptData => ({ player: 0, msg: 18, kind: "place", count: 1, flag: 0, ...over });

describe("placeToYgoZone / ygoZoneToPlace", () => {
  it("maps the engine's zones to ygo-core's for the viewer on seat 0", () => {
    // Engine player 0 is the viewer (ygo seat 0): no suffix; the other engine player is seat 1: "2".
    expect(placeToYgoZone({ player: 0, loc: M, seq: 0 }, 0, 0)).toBe("M-1");
    expect(placeToYgoZone({ player: 0, loc: M, seq: 4 }, 0, 0)).toBe("M-5");
    expect(placeToYgoZone({ player: 0, loc: M, seq: 5 }, 0, 0)).toBe("EMZ-1");
    expect(placeToYgoZone({ player: 0, loc: M, seq: 6 }, 0, 0)).toBe("EMZ-2");
    expect(placeToYgoZone({ player: 0, loc: S, seq: 2 }, 0, 0)).toBe("S-3");
    expect(placeToYgoZone({ player: 0, loc: S, seq: 5 }, 0, 0)).toBe("F");
    expect(placeToYgoZone({ player: 1, loc: M, seq: 1 }, 0, 0)).toBe("M2-2");
    expect(placeToYgoZone({ player: 1, loc: S, seq: 5 }, 0, 0)).toBe("F2");
  });

  it("follows the seat remap when the viewer is ygo seat 1 but engine player 0 (they went first)", () => {
    // The prompt is the viewer's: engine player 0 → ygo seat 1.
    expect(placeToYgoZone({ player: 0, loc: S, seq: 0 }, 0, 1)).toBe("S2-1");
    expect(placeToYgoZone({ player: 1, loc: M, seq: 2 }, 0, 1)).toBe("M-3");
    // …and engine player 1 prompting the viewer on ygo seat 0.
    expect(placeToYgoZone({ player: 1, loc: M, seq: 3 }, 1, 0)).toBe("M-4");
    expect(placeToYgoZone({ player: 0, loc: M, seq: 3 }, 1, 0)).toBe("M2-4");
  });

  it("has no field zone for the Pendulum seqs or bad input", () => {
    expect(placeToYgoZone({ player: 0, loc: S, seq: 6 }, 0, 0)).toBeNull();
    expect(placeToYgoZone({ player: 0, loc: M, seq: 7 }, 0, 0)).toBeNull();
    expect(placeToYgoZone({ player: 0, loc: 0x10, seq: 0 }, 0, 0)).toBeNull();
  });

  it("round-trips every field zone on both seats", () => {
    for (const [promptPlayer, me] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      for (const player of [0, 1]) {
        for (const [loc, seqs] of [[M, [0, 1, 2, 3, 4, 5, 6]], [S, [0, 1, 2, 3, 4, 5]]] as const) {
          for (const seq of seqs) {
            const zone = placeToYgoZone({ player, loc, seq }, promptPlayer, me)!;
            expect(ygoZoneToPlace(zone, promptPlayer, me)).toEqual({ player, loc, seq });
          }
        }
      }
    }
    expect(ygoZoneToPlace("GY", 0, 0)).toBeNull();
    expect(ygoZoneToPlace("M-6", 0, 0)).toBeNull();
  });
});

describe("zoneHighlights", () => {
  it("lights up exactly the free zones the flag allows, own or opponent's side", () => {
    const prompt = place({ flag: flagFree([{ loc: S, seq: 0 }, { loc: S, seq: 3 }, { loc: M, seq: 2, opp: true }]) });
    const { onField, offField } = zoneHighlights(prompt, 0);
    expect(onField.map((z) => z.zone)).toEqual(["S-1", "S-4", "M2-3"]);
    expect(onField[0].place).toEqual({ player: 0, loc: S, seq: 0 });
    expect(onField[2].place).toEqual({ player: 1, loc: M, seq: 2 });
    expect(offField).toEqual([]);
  });

  it("keeps zones with no field zone (Pendulum) for the list", () => {
    const { onField, offField } = zoneHighlights(place({ flag: flagFree([{ loc: S, seq: 6 }, { loc: S, seq: 1 }]) }), 0);
    expect(onField.map((z) => z.zone)).toEqual(["S-2"]);
    expect(offField.map((z) => z.seq)).toEqual([6]);
  });

  it("drops zones already picked, and lights nothing for other prompts", () => {
    const prompt = place({ count: 2, flag: flagFree([{ loc: M, seq: 0 }, { loc: M, seq: 1 }]) });
    expect(zoneHighlights(prompt, 0, [{ player: 0, loc: M, seq: 0 }]).onField.map((z) => z.zone)).toEqual(["M-2"]);
    expect(zoneHighlights({ ...prompt, kind: "card" }, 0).onField).toEqual([]);
  });
});

describe("pickZone", () => {
  it("answers a single-zone prompt with the zone itself", () => {
    expect(pickZone(place({}), [], { player: 0, loc: S, seq: 2 })).toEqual({ done: true, data: { player: 0, loc: S, seq: 2 } });
  });

  it("collects picks until a multi-zone prompt has enough", () => {
    const prompt = place({ count: 2 });
    const first = pickZone(prompt, [], { player: 0, loc: M, seq: 0 });
    expect(first).toEqual({ done: false, picked: [{ player: 0, loc: M, seq: 0 }] });
    // The same zone twice doesn't count.
    expect(pickZone(prompt, (first as any).picked, { player: 0, loc: M, seq: 0 })).toEqual(first);
    expect(pickZone(prompt, (first as any).picked, { player: 0, loc: M, seq: 3 })).toEqual({
      done: true, data: { places: [{ player: 0, loc: M, seq: 0 }, { player: 0, loc: M, seq: 3 }] },
    });
  });
});

describe("highlight lifecycle helpers", () => {
  it("a different prompt restarts the selection; none clears it", () => {
    expect(promptKey(place({ flag: 1 }))).not.toBe(promptKey(place({ flag: 2 })));
    expect(promptKey(place({ flag: 1 }))).toBe(promptKey(place({ flag: 1 })));
    expect(promptKey(null)).toBe("");
  });

  it("pulses normally and glows steadily under prefers-reduced-motion", () => {
    const values = [0, 1, 2, 3, 4].map((t) => selectionOpacity(t, false));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0.3);
    expect(new Set(values.map((v) => v.toFixed(3))).size).toBeGreaterThan(1);
    expect([0, 1, 2, 3, 4].map((t) => selectionOpacity(t, true))).toEqual([1, 1, 1, 1, 1]);
  });
});

describe("undoTooltip", () => {
  it("explains a bot duel's undo, and stays out of the way otherwise", () => {
    expect(undoTooltip({ botDuel: true })).toBe("Undo your last play (the bot's replies are undone too)");
    expect(undoTooltip({ botDuel: true })).toBe(BOT_UNDO_TOOLTIP);
    expect(undoTooltip({ assistedMode: true })).toBeUndefined();
    expect(undoTooltip(undefined)).toBeUndefined();
  });
});
