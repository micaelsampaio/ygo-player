import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card } from "ygo-core";
import type { YGODuel } from "../core/YGODuel";
import {
  calculateBattleInfo, createOffsetPositionInMultipleEvents, fisherYatesShuffle, getCardZones, getMonstersZones,
  getXyzMonstersZones, randomIntFromInterval,
} from "./ygo-utils";

afterEach(() => {
  vi.restoreAllMocks();
});

const monster = (position: string, atk: number, def: number, extra: Partial<Card> = {}) =>
  ({ position, currentAtk: atk, currentDef: def, typeline: ["Effect"], originalOwner: 0, ...extra } as unknown as Card);

describe("calculateBattleInfo", () => {
  it("attack vs attack: the weaker monster is destroyed, the difference is damage", () => {
    expect(calculateBattleInfo(monster("faceup-attack", 2500, 0), monster("faceup-attack", 2000, 0)))
      .toEqual({ attacking: { destroyed: false }, attacked: { destroyed: true }, battleDamage: 500 });
    expect(calculateBattleInfo(monster("faceup-attack", 1500, 0), monster("faceup-attack", 2000, 0)))
      .toEqual({ attacking: { destroyed: true }, attacked: { destroyed: false }, battleDamage: -500 });
  });

  it("attack vs defense: no damage to the defender's controller, the attacker takes the rebound", () => {
    expect(calculateBattleInfo(monster("faceup-attack", 2500, 0), monster("faceup-defense", 0, 2000)))
      .toEqual({ attacking: { destroyed: false }, attacked: { destroyed: true }, battleDamage: 0 });
    expect(calculateBattleInfo(monster("faceup-attack", 1000, 0), monster("facedown", 0, 2000)))
      .toEqual({ attacking: { destroyed: false }, attacked: { destroyed: false }, battleDamage: -1000 });
  });

  it("a 0-ATK attacker is not destroyed by its own attack", () => {
    expect(calculateBattleInfo(monster("faceup-attack", 0, 0), monster("faceup-attack", 1000, 0)).attacking.destroyed).toBe(false);
  });
});

describe("randomIntFromInterval", () => {
  it("includes both ends", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.9999);
    expect(randomIntFromInterval(3, 5)).toBe(3);
    expect(randomIntFromInterval(3, 5)).toBe(5);
  });
});

describe("fisherYatesShuffle", () => {
  it("shuffles in place and keeps every item", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = fisherYatesShuffle(items);
    expect(shuffled).toBe(items);
    expect([...shuffled].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("follows Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    // j is always 0: each step swaps the last unsorted item to the front.
    expect(fisherYatesShuffle([1, 2, 3])).toEqual([2, 3, 1]);
  });
});

describe("createOffsetPositionInMultipleEvents", () => {
  const duel = { perspective: { isPlayerPOV: (player: number) => player === 0 } } as unknown as YGODuel;
  const end = new THREE.Vector3(0, 0, 0);

  it("leaves the first card where it is", () => {
    expect(createOffsetPositionInMultipleEvents(duel, 0, 0, end).toArray()).toEqual([0, 0, 0]);
    expect(createOffsetPositionInMultipleEvents(duel, 0, undefined, end).toArray()).toEqual([0, 0, 0]);
  });

  it("fans later cards out towards each player's own side", () => {
    expect(createOffsetPositionInMultipleEvents(duel, 0, 2, end).toArray()).toEqual([-3, 0, 0.4]);
    expect(createOffsetPositionInMultipleEvents(duel, 1, 2, end).toArray()).toEqual([3, 0, 0.4]);
  });
});

/** A CardZone stand-in: a card (or not) and its zone data. */
function fakeZone(card: Card | null, zoneIndex = 1, player = 0) {
  return {
    card,
    zone: "",
    zoneData: { zone: "EMZ", player, zoneIndex },
    hasCard: () => !!card,
    isEmpty: () => !card,
    getCardReference: () => card,
  };
}

function fakeDuel({ monsters = [[], []] as (Card | null)[][], emz = [null, null] as (Card | null)[], fieldSpell = [null, null] as (Card | null)[] } = {}) {
  const extraMonsterZone = emz.map((c, i) => fakeZone(c, i + 1));
  const fields = [0, 1].map(player => ({
    monsterZone: [0, 1, 2, 3, 4].map(i => fakeZone(monsters[player][i] ?? null, i + 1, player)),
    spellTrapZone: [0, 1, 2, 3, 4].map(i => fakeZone(null, i + 1, player)),
    fieldZone: fakeZone(fieldSpell[player]),
    extraMonsterZone,
  }));
  const coreFields = [0, 1].map(player => ({
    monsterZone: monsters[player],
    extraMonsterZone: player === 0 ? emz : [null, null],
  }));
  return { fields, ygo: { state: { fields: coreFields } } } as unknown as YGODuel;
}

describe("getMonstersZones / getXyzMonstersZones", () => {
  const xyz = monster("faceup-attack", 2500, 2000, { typeline: ["Xyz", "Effect"] });
  const plain = monster("faceup-attack", 1000, 1000);
  const opponentsInEmz = monster("faceup-attack", 1000, 1000, { originalOwner: 1 });

  it("lists occupied Monster Zones, and the EMZ only for the monster's owner", () => {
    const duel = fakeDuel({ monsters: [[plain, null, xyz], []], emz: [opponentsInEmz, null] });
    expect(getMonstersZones(duel, [0]).map(z => z.getCardReference())).toEqual([plain, xyz]);
    expect(getMonstersZones(duel, [1]).map(z => z.getCardReference())).toEqual([opponentsInEmz]);
  });

  it("keeps only Xyz Monsters", () => {
    const duel = fakeDuel({ monsters: [[plain, null, xyz], []] });
    expect(getXyzMonstersZones(duel, [0, 1]).map(z => z.getCardReference())).toEqual([xyz]);
  });
});

describe("getCardZones", () => {
  it("lists the empty zones of the kinds asked for", () => {
    const plain = monster("faceup-attack", 1000, 1000);
    const duel = fakeDuel({ monsters: [[plain, plain, null, plain, null], []] });
    expect(getCardZones(duel, [0], ["M"]).map(z => z.zoneData.zoneIndex)).toEqual([3, 5]);
    expect(getCardZones(duel, [0], ["S"])).toHaveLength(5);
    expect(getCardZones(duel, [0], ["F"])).toHaveLength(1);
  });

  it("offers a free EMZ to a player holding none, renamed to their side", () => {
    const duel = fakeDuel();
    const zones = getCardZones(duel, [1], ["EMZ"]);
    expect(zones.map(z => z.zone)).toEqual(["EMZ2-1", "EMZ2-2"]);
    expect(zones.every(z => z.zoneData.player === 1)).toBe(true);
  });

  it("skips a taken Field Zone", () => {
    const duel = fakeDuel({ fieldSpell: [monster("faceup", 0, 0), null] });
    expect(getCardZones(duel, [0, 1], ["F"])).toHaveLength(1);
  });
});
