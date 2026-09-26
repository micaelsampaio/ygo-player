import { describe, expect, it } from "vitest";
import { allowedExtraMonsterZones } from "./extra-monster-zones";

const empty = () => ({ monsterZone: [null, null, null, null, null] as any[], extraMonsterZone: [null, null] as any[] });

describe("allowedExtraMonsterZones", () => {
  it("offers both free EMZs to a player who holds neither", () => {
    expect(allowedExtraMonsterZones([empty(), empty()], 0)).toEqual([1, 2]);
  });

  it("never offers the EMZ the opponent holds (EMZ-1 and EMZ2-1 are one zone)", () => {
    const opp = empty();
    opp.extraMonsterZone[0] = { id: 1 };
    expect(allowedExtraMonsterZones([empty(), opp], 0)).toEqual([2]);
  });

  it("offers a second EMZ only when one of your Link Arrows points to it", () => {
    const me = empty();
    me.extraMonsterZone[0] = { id: 1 };
    expect(allowedExtraMonsterZones([me, empty()], 0)).toEqual([]);
    me.monsterZone[3] = { linkmarkers: ["Top", "Bottom"] };
    expect(allowedExtraMonsterZones([me, empty()], 0)).toEqual([2]);
  });

  it("reads player 1's arrows from their side: their Top arrow in M2-2 points to EMZ2-2", () => {
    const them = empty();
    them.extraMonsterZone[0] = { id: 1 };
    them.monsterZone[1] = { linkmarkers: ["Top"] };
    expect(allowedExtraMonsterZones([empty(), them], 1)).toEqual([2]);
  });
});
