import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { Card, FieldZoneData } from "ygo-core";
import type { YGODuel } from "../core/YGODuel";
import {
  getCardRotationFromFieldZoneData, getCardRotationFromPlayerIndex, getGameZone, getZonePositionFromZoneData,
  isCardTransformFlipDown, isFieldZone,
} from "./zone-transforms";

const deg = THREE.MathUtils.degToRad;

/** A zone object that only has a position, tagged so getGameZone's pick can be told apart. */
const zoneAt = (tag: string, x: number) => ({ tag, position: new THREE.Vector3(x, 0, 0), gameObject: { position: new THREE.Vector3(x, 1, 0) } });

function fakeField(player: number) {
  const p = player * 100;
  const pile = (x: number, rotation = new THREE.Euler()) => {
    const object = new THREE.Object3D();
    object.position.set(x, 0, 0);
    object.rotation.copy(rotation);
    return { getCardTransform: () => object };
  };
  return {
    settings: { showCards: false },
    monsterZone: [1, 2, 3, 4, 5].map(i => zoneAt(`M${i}`, p + i)),
    spellTrapZone: [1, 2, 3, 4, 5].map(i => zoneAt(`S${i}`, p + 10 + i)),
    extraMonsterZone: [1, 2].map(i => zoneAt(`EMZ${i}`, p + 20 + i)),
    fieldZone: zoneAt("F", p + 30),
    graveyard: { cardPosition: new THREE.Vector3(p + 40, 0, 0) },
    banishedZone: { cardPosition: new THREE.Vector3(p + 50, 0, 0) },
    mainDeck: pile(p + 60, new THREE.Euler(0, deg(180), deg(-15))),
    extraDeck: pile(p + 70, new THREE.Euler(0, 0, deg(15))),
    hand: { getCard: (index: number) => index === 0 ? { gameObject: { position: new THREE.Vector3(p + 80, 0, 0) } } : undefined },
  };
}

/** Player 0 sits at the bottom of the screen. */
function fakeDuel(): YGODuel {
  return {
    fields: [fakeField(0), fakeField(1)],
    perspective: { isPlayerPOV: (player: number) => player === 0 },
  } as unknown as YGODuel;
}

const zone = (z: string, player = 0, zoneIndex = 1) => ({ zone: z, player, zoneIndex } as FieldZoneData);
const card = (position: string, typeline: string[] = ["Effect"]) => ({ position, typeline } as unknown as Card);
const angles = (e: THREE.Euler) => [e.x, e.y, e.z].map(a => Math.round(THREE.MathUtils.radToDeg(a)));

describe("getCardRotationFromFieldZoneData", () => {
  const duel = fakeDuel();

  it("turns monsters by battle position", () => {
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup-attack"), zone("M")))).toEqual([0, 0, 0]);
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup-defense"), zone("M")))).toEqual([0, 0, 90]);
    expect(angles(getCardRotationFromFieldZoneData(duel, card("facedown"), zone("M")))).toEqual([0, 180, -90]);
  });

  it("never turns a Link Monster sideways", () => {
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup-defense", ["Link"]), zone("EMZ")))).toEqual([0, 0, 0]);
  });

  it("flips face-down Spells/Traps and Field Spells, and lays banished cards sideways", () => {
    expect(angles(getCardRotationFromFieldZoneData(duel, card("facedown"), zone("S")))).toEqual([0, 180, 0]);
    expect(angles(getCardRotationFromFieldZoneData(duel, card("facedown"), zone("F")))).toEqual([0, 180, 0]);
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup"), zone("B")))).toEqual([0, 0, 90]);
    expect(angles(getCardRotationFromFieldZoneData(duel, card("facedown"), zone("B")))).toEqual([0, -180, 90]);
  });

  it("turns the opponent's cards around, except in the Decks", () => {
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup-attack"), zone("M", 1)))).toEqual([0, 0, 180]);
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup"), zone("D", 1)))).toEqual([0, 180, -15]);
  });

  it("takes the Extra Deck pile's rotation, but tilts face-up Pendulums", () => {
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup"), zone("ED")))).toEqual([0, 0, 15]);
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup", ["Pendulum"]), zone("ED")))).toEqual([0, 0, -15]);
  });

  it("hides the opponent's hand cards unless their cards are shown", () => {
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup"), zone("H", 1)))).toEqual([0, 180, 180]);
    duel.fields[1].settings.showCards = true;
    expect(angles(getCardRotationFromFieldZoneData(duel, card("faceup"), zone("H", 1)))).toEqual([0, 0, 180]);
  });

  it("returns a new Euler, never the pile's own", () => {
    const pileRotation = duel.fields[0].mainDeck.getCardTransform().rotation;
    expect(getCardRotationFromFieldZoneData(duel, card("faceup"), zone("D"))).not.toBe(pileRotation);
  });
});

describe("getCardRotationFromPlayerIndex", () => {
  it("is upside down for the opponent only", () => {
    const duel = fakeDuel();
    expect(angles(getCardRotationFromPlayerIndex(duel, 0))).toEqual([0, 0, 0]);
    expect(angles(getCardRotationFromPlayerIndex(duel, 1))).toEqual([0, 0, 180]);
  });
});

describe("getZonePositionFromZoneData", () => {
  const duel = fakeDuel();
  const x = (z: FieldZoneData) => getZonePositionFromZoneData(duel, z).x;

  it("finds each zone's position on the right player's field", () => {
    expect(x(zone("M", 0, 3))).toBe(3);
    expect(x(zone("S", 1, 2))).toBe(112);
    expect(x(zone("EMZ", 0, 2))).toBe(22);
    expect(x(zone("F", 1))).toBe(130);
    expect(x(zone("GY", 0))).toBe(40);
    expect(x(zone("B", 1))).toBe(150);
    expect(x(zone("D", 0))).toBe(60);
    expect(x(zone("ED", 0))).toBe(70);
    expect(x(zone("H", 0, 1))).toBe(80);
  });

  it("raises the Extra Deck spot and falls back to the first Monster Zone for a missing hand card", () => {
    expect(getZonePositionFromZoneData(duel, zone("ED", 0)).z).toBeCloseTo(0.2);
    expect(x(zone("H", 0, 4))).toBe(1);
  });

  it("returns a copy", () => {
    const position = getZonePositionFromZoneData(duel, zone("M", 0, 1));
    position.x = 999;
    expect(x(zone("M", 0, 1))).toBe(1);
  });
});

describe("getGameZone / isFieldZone", () => {
  const duel = fakeDuel();
  const tag = (z: FieldZoneData) => (getGameZone(duel, z) as unknown as { tag: string } | null)?.tag;

  it("maps on-field zones (and Xyz material slots) to their CardZone", () => {
    expect(tag(zone("M", 0, 4))).toBe("M4");
    expect(tag(zone("ORU", 0, 2))).toBe("M2");
    expect(tag(zone("S", 1, 5))).toBe("S5");
    expect(tag(zone("F", 0))).toBe("F");
    expect(tag(zone("EMZ", 0, 2))).toBe("EMZ2");
    expect(tag(zone("ORUEMZ", 0, 1))).toBe("EMZ1");
  });

  it("has no CardZone for piles and the hand", () => {
    for (const z of ["GY", "B", "D", "ED", "H"]) {
      expect(isFieldZone(zone(z))).toBe(false);
      expect(getGameZone(duel, zone(z))).toBeNull();
    }
  });
});

describe("isCardTransformFlipDown", () => {
  const at = (yDeg: number) => {
    const object = new THREE.Object3D();
    object.rotation.y = deg(yDeg);
    return object;
  };

  it("is true for a card turned over (within the tolerance)", () => {
    expect(isCardTransformFlipDown(at(180))).toBe(true);
    expect(isCardTransformFlipDown(at(-180))).toBe(true);
    expect(isCardTransformFlipDown(at(175))).toBe(true);
    expect(isCardTransformFlipDown(at(185))).toBe(true);
    expect(isCardTransformFlipDown(at(179.9999))).toBe(true);
    expect(isCardTransformFlipDown(at(-540))).toBe(true);
  });

  it("is false for a face-up card", () => {
    expect(isCardTransformFlipDown(at(0))).toBe(false);
    expect(isCardTransformFlipDown(at(150))).toBe(false);
    expect(isCardTransformFlipDown(at(360))).toBe(false);
    expect(isCardTransformFlipDown(at(-200))).toBe(false);
  });

  it("treats a missing object as face-down", () => {
    expect(isCardTransformFlipDown(null)).toBe(true);
  });
});
