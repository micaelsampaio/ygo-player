import { describe, expect, it, vi } from "vitest";
import { pileCardActions, pileMenuActions, pileOriginZone, type PileSource } from "./pile-card-actions";

const monster = { id: 1, originalOwner: 0, frameType: "effect", type: "Effect Monster", typeline: ["Effect"], isMainDeckCard: true };
const linkMonster = { id: 2, originalOwner: 0, frameType: "link", type: "Link Monster", typeline: ["Link", "Effect"], isMainDeckCard: false };
const fieldSpell = { id: 3, originalOwner: 0, type: "Spell Card", race: "Field", frameType: "spell", isMainDeckCard: true };
const trap = { id: 4, originalOwner: 1, type: "Trap Card", race: "Normal", frameType: "trap", isMainDeckCard: true };
const xyzMonster = { id: 5, originalOwner: 0, type: "XYZ Monster", typeline: ["Xyz", "Effect"], isMainDeckCard: false };
const synchroMonster = { id: 6, originalOwner: 0, type: "Synchro Monster", typeline: ["Synchro"], isMainDeckCard: false };

function fakeDuel({ xyzOnField = false } = {}) {
  const field = () => ({
    monsterZone: [xyzOnField ? xyzMonster : null, null, null, null, null],
    extraMonsterZone: [null, null],
    graveyard: [] as any[],
    banishedZone: [] as any[],
    extraDeck: [] as any[],
    mainDeck: [] as any[],
  });
  const fields = [field(), field()];
  const gameActions = new Proxy({} as Record<string, any>, {
    get: (target, name: string) => (target[name] ??= vi.fn()),
  });
  const duel: any = {
    ygo: { state: { fields }, getField: (p: number) => fields[p] },
    gameActions,
    events: { dispatch: vi.fn() },
  };
  return { duel, fields, gameActions };
}

const labels = (source: PileSource, card: any, opts?: { xyzOnField?: boolean }) =>
  pileCardActions(fakeDuel(opts).duel, card, "Z" as any, { source, closeViewer: () => {} }).map((a) => a.label);

describe("pileCardActions — which entries show", () => {
  it("Graveyard", () => {
    expect(labels("GY", monster)).toEqual(["SS ATK", "SS DEF", "Activate", "Target", "TO ST", "To Hand", "Banish", "Banish FD", "To Top Deck", "To Bottom Deck", "Negate"]);
    expect(labels("GY", linkMonster)).toEqual(["SS ATK", "Activate", "Target", "TO ST", "Banish", "Banish FD", "To Extra Deck", "Negate"]);
    expect(labels("GY", fieldSpell)).toEqual(["Activate Field Spell", "Set Field Spell", "Activate", "Target", "TO ST", "To Hand", "Banish", "Banish FD", "To Top Deck", "To Bottom Deck", "Negate"]);
    expect(labels("GY", monster, { xyzOnField: true })).toContain("Attach Material to XYZ");
  });

  it("Banished", () => {
    expect(labels("B", monster)).toEqual(["SS ATK", "SS DEF", "Activate", "To Grave", "Target", "TO ST", "To Hand", "To Top Deck", "To Bottom Deck", "Negate"]);
    expect(labels("B", linkMonster, { xyzOnField: true })).toEqual(["SS ATK", "Activate", "To Grave", "Target", "TO ST", "To Extra Deck", "Attach Material to XYZ", "Negate"]);
  });

  it("Deck", () => {
    expect(labels("D", monster)).toEqual(["SS ATK", "SS DEF", "To Hand", "To GY", "To ST (Face up)", "Banish", "Banish FD", "Reveal", "Destroy"]);
    // A Link card in the Deck still offers SS DEF (as before).
    expect(labels("D", linkMonster)).toContain("SS DEF");
    expect(labels("D", fieldSpell)).toEqual(["To Hand", "To GY", "Place Field Spell", "Place Field Spell FD", "To ST (Face up)", "Set (FD)", "Banish", "Banish FD", "Reveal", "Destroy"]);
    expect(labels("D", trap)).toEqual(["To Hand", "To GY", "To ST (Face up)", "Set (FD)", "Banish", "Banish FD", "Reveal", "Destroy"]);
  });

  it("Extra Deck", () => {
    expect(labels("ED", linkMonster)).toEqual(["Link Summon", "SS ATK", "To Grave", "Banish", "Banish FD", "Reveal"]);
    expect(labels("ED", xyzMonster, { xyzOnField: true })).toEqual([
      "XYZ Summon ATK", "XYZ Summon DEF", "XYZ Overlay ATK", "XYZ Overlay DEF", "Attach Material to XYZ",
      "SS ATK", "SS DEF", "To Grave", "Banish", "Banish FD", "Reveal",
    ]);
    expect(labels("ED", synchroMonster)).toEqual(["Synchro Summon ATK", "Synchro Summon DEF", "SS ATK", "SS DEF", "To Grave", "Banish", "Banish FD", "Reveal"]);
    expect(labels("ED", { ...synchroMonster, typeline: ["Fusion"] }).slice(0, 2)).toEqual(["Fusion Summon ATK", "Fusion Summon DEF"]);
  });
});

/** label → [gameActions method, args, closes viewer first] */
type Expectation = Record<string, [string, any, boolean]>;

function expectRuns(source: PileSource, card: any, expected: Expectation) {
  for (const [label, [method, args, closes]] of Object.entries(expected)) {
    const { duel, gameActions } = fakeDuel({ xyzOnField: true });
    const order: string[] = [];
    const closeViewer = vi.fn(() => order.push("close"));
    const action = pileCardActions(duel, card, "Z" as any, { source, closeViewer }).find((a) => a.label === label);
    expect(action, `${source}: ${label}`).toBeDefined();
    gameActions[method].mockImplementation(() => order.push(method));
    action!.run();
    expect(gameActions[method], `${source}: ${label}`).toHaveBeenCalledWith(args);
    expect(order, `${source}: ${label}`).toEqual(closes ? ["close", method] : [method]);
  }
}

describe("pileCardActions — what each entry does", () => {
  const c = { card: monster, originZone: "Z" };

  it("Graveyard: zone-picking moves close the viewer first", () => {
    expectRuns("GY", monster, {
      "SS ATK": ["specialSummon", { ...c, position: "faceup-attack" }, true],
      "SS DEF": ["specialSummon", { ...c, position: "faceup-defense" }, true],
      "TO ST": ["toST", c, true],
      "Attach Material to XYZ": ["attachMaterial", c, true],
      "Activate": ["activateCard", { ...c, selectZone: false }, false],
      "Target": ["targetCard", c, false],
      "To Hand": ["toHand", c, false],
      "Banish": ["banish", { ...c, position: "faceup" }, false],
      "Banish FD": ["banish", { ...c, position: "facedown" }, false],
      "To Top Deck": ["toDeck", { ...c, position: "top" }, false],
      "To Bottom Deck": ["toDeck", { ...c, position: "bottom" }, false],
      "Negate": ["negateCard", c, false],
    });
    expectRuns("GY", fieldSpell, {
      "Activate Field Spell": ["fieldSpell", { card: fieldSpell, originZone: "Z", position: "faceup" }, false],
      "Set Field Spell": ["fieldSpell", { card: fieldSpell, originZone: "Z", position: "facedown" }, false],
    });
    expectRuns("GY", linkMonster, {
      "To Extra Deck": ["toExtraDeck", { card: linkMonster, originZone: "Z" }, false],
    });
  });

  it("Banished: the same zone-picking moves close the banish viewer too", () => {
    expectRuns("B", monster, {
      "SS ATK": ["specialSummon", { ...c, position: "faceup-attack" }, true],
      "SS DEF": ["specialSummon", { ...c, position: "faceup-defense" }, true],
      "TO ST": ["toST", c, true],
      "Attach Material to XYZ": ["attachMaterial", c, true],
      "To Grave": ["sendToGy", c, false],
      "To Hand": ["toHand", c, false],
    });
  });

  it("Deck: closes the viewer for everything but To Hand / To GY", () => {
    expectRuns("D", monster, {
      "SS ATK": ["specialSummon", { ...c, position: "faceup-attack" }, true],
      "SS DEF": ["specialSummon", { ...c, position: "faceup-defense" }, true],
      "To Hand": ["toHand", { ...c, reveal: true }, false],
      "To GY": ["sendToGy", c, false],
      "To ST (Face up)": ["toST", c, true],
      "Banish": ["banish", { ...c, position: "faceup" }, true],
      "Banish FD": ["banish", { ...c, position: "facedown" }, true],
      "Reveal": ["revealCard", c, true],
      "Destroy": ["destroyCard", c, true],
    });
    const f = { card: fieldSpell, originZone: "Z" };
    expectRuns("D", fieldSpell, {
      "Place Field Spell": ["fieldSpell", { ...f, position: "faceup" }, true],
      "Place Field Spell FD": ["fieldSpell", { ...f, position: "facedown" }, true],
      "Set (FD)": ["setCard", { ...f, reveal: false }, true],
    });
  });

  it("Extra Deck: summons and attach close the viewer; To Grave / Banish / Reveal don't", () => {
    expectRuns("ED", xyzMonster, {
      "XYZ Summon ATK": ["xyzSummon", { card: xyzMonster, position: "faceup-attack" }, true],
      "XYZ Summon DEF": ["xyzSummon", { card: xyzMonster, position: "faceup-defense" }, true],
      "XYZ Overlay ATK": ["xyzOverlaySummon", { card: xyzMonster, position: "faceup-attack" }, true],
      "XYZ Overlay DEF": ["xyzOverlaySummon", { card: xyzMonster, position: "faceup-defense" }, true],
      "Attach Material to XYZ": ["attachMaterial", { card: xyzMonster, originZone: "Z" }, true],
      "SS ATK": ["specialSummon", { card: xyzMonster, originZone: "Z", position: "faceup-attack" }, true],
      "SS DEF": ["specialSummon", { card: xyzMonster, originZone: "Z", position: "faceup-defense" }, true],
      "To Grave": ["sendToGy", { card: xyzMonster, originZone: "Z" }, false],
      "Banish": ["banish", { card: xyzMonster, originZone: "Z", position: "faceup" }, false],
      "Banish FD": ["banish", { card: xyzMonster, originZone: "Z", position: "facedown" }, false],
      "Reveal": ["revealCard", { card: xyzMonster, originZone: "Z" }, false],
    });
    expectRuns("ED", linkMonster, { "Link Summon": ["linkSummon", { card: linkMonster }, true] });
    expectRuns("ED", synchroMonster, {
      "Synchro Summon ATK": ["synchroSummon", { card: synchroMonster, position: "faceup-attack" }, true],
      "Synchro Summon DEF": ["synchroSummon", { card: synchroMonster, position: "faceup-defense" }, true],
    });
    const fusion = { ...synchroMonster, typeline: ["Fusion"] };
    expectRuns("ED", fusion, {
      "Fusion Summon ATK": ["fusionSummon", { card: fusion, position: "faceup-attack" }, true],
      "Fusion Summon DEF": ["fusionSummon", { card: fusion, position: "faceup-defense" }, true],
    });
  });
});

describe("pileOriginZone / pileMenuActions", () => {
  it("finds the card's 1-based index in its pile", () => {
    const { duel, fields } = fakeDuel();
    fields[0].graveyard.push({}, monster);
    fields[1].banishedZone.push(trap);
    fields[0].extraDeck.push(linkMonster);
    fields[0].mainDeck.push({}, {}, monster);
    expect(pileOriginZone(duel, monster as any, "GY")).toBe("GY-2");
    expect(pileOriginZone(duel, trap as any, "B")).toBe("B2-1");
    expect(pileOriginZone(duel, linkMonster as any, "ED")).toBe("ED-1");
    expect(pileOriginZone(duel, monster as any, "D")).toBe("D-3");
  });

  it("closes the matching viewer and passes the derived origin zone", () => {
    const cases: [PileSource, string, any][] = [
      ["GY", "GY-1", { group: "game-overlay", type: "graveyard" }],
      ["B", "B-1", { group: "game-overlay", type: "banish" }],
      ["ED", "ED-1", { group: "game-overlay", type: "extra-deck" }],
      ["D", "D-1", { type: "view-main-deck" }],
    ];
    for (const [source, zone, closeEvent] of cases) {
      const { duel, fields, gameActions } = fakeDuel();
      const pile = { GY: "graveyard", B: "banishedZone", ED: "extraDeck", D: "mainDeck" }[source] as "graveyard";
      fields[0][pile].push(monster);
      pileMenuActions(duel, monster as any, source).find((a) => a.label === "SS ATK")!.run();
      expect(duel.events.dispatch).toHaveBeenCalledWith("close-ui-menu", closeEvent);
      expect(gameActions.specialSummon).toHaveBeenCalledWith({ card: monster, originZone: zone, position: "faceup-attack" });
    }
  });
});
