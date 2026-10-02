import { beforeEach, describe, expect, it, vi } from "vitest";

// Zone helpers are stubbed: each returns tagged fake zones so the test can see
// exactly which zones an action offers, without a three.js field.
vi.mock("../scripts/ygo-utils", () => ({
  getCardZones: (_duel: any, players: number[], types: string[]) =>
    players.flatMap((p) => types.map((t) => ({ zone: `free:${t}:${p}` }))),
  getMonstersZones: (duel: any) => duel.__monsterZones,
  getXyzMonstersZones: (duel: any) => duel.__xyzZones,
  getGameZone: (_duel: any, zoneData: any) => ({ zone: `game:${zoneData.zone}:${zoneData.player}:${zoneData.zoneIndex}` }),
}));
vi.mock("../actions/ActionSelectCard", () => ({ ActionCardSelection: class {} }));

import { YGOCommands } from "ygo-core";
import { YGOGameActions } from "./YGOGameActions";

// ygo-core ships minified, so name a command by the YGOCommands export it is.
const commandName = (cmd: any) =>
  Object.keys(YGOCommands).find((k) => (YGOCommands as any)[k] === cmd.constructor) ?? "?";

const monster = (id: number, extra: Record<string, any> = {}) => ({
  id,
  originalOwner: 0,
  owner: 0,
  position: "faceup-attack",
  typeline: ["Effect"],
  isMainDeckCard: true,
  ...extra,
});

const fieldZone = (zone: string, card: any) => ({ zone, getCardReference: () => card });

function setup() {
  const edCard = monster(9000, { isMainDeckCard: false });
  const otherEd = monster(9001, { isMainDeckCard: false });
  const cardSelection = {
    startSelection: vi.fn(),
    startMultipleSelection: vi.fn(),
  };
  const faceUp = fieldZone("M-1", monster(1));
  const faceDown = fieldZone("M-2", monster(2, { position: "facedown-defense" }));
  const token = fieldZone("M-3", monster(3, { typeline: ["Token"] }));
  const emz = fieldZone("EMZ-1", monster(4));
  const duel: any = {
    gameController: { getComponent: () => cardSelection },
    events: { dispatch: vi.fn() },
    serverActions: { getActivePlayer: () => 0 },
    execCommand: vi.fn(),
    ygo: { state: { fields: [{ extraDeck: [otherEd, edCard] }, { extraDeck: [] }] }, options: {} },
    fields: [{ fieldZone: { zone: "F" } }, { fieldZone: { zone: "F2" } }],
    __monsterZones: [faceUp, faceDown, token, emz],
    __xyzZones: [fieldZone("M-5", monster(5)), fieldZone("M-4", null)],
  };
  const actions = new YGOGameActions(duel);
  const dispatched = () => duel.events.dispatch.mock.calls.map((c: any[]) => c[0]);
  const lastCommand = () => {
    const calls = duel.execCommand.mock.calls;
    const cmd = calls[calls.length - 1][0];
    return { name: commandName(cmd), data: cmd.data };
  };
  return { actions, duel, cardSelection, edCard, faceUp, faceDown, token, emz, dispatched, lastCommand };
}

/** Pick the given material zones, then return the landing-zone selection call. */
function pickMaterials(cardSelection: any, materials: any[]) {
  const multi = cardSelection.startMultipleSelection.mock.calls[0][0];
  multi.onSelectionCompleted(materials);
  return cardSelection.startSelection.mock.calls[0][0];
}

describe("YGOGameActions — Extra Deck material summons", () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  const cases = [
    { method: "linkSummon", command: "LinkSummonCommand", offered: ["M-1", "M-3", "EMZ-1"], position: undefined },
    { method: "xyzSummon", command: "XYZSummonCommand", offered: ["M-1", "EMZ-1"], position: "faceup-attack" },
    { method: "xyzOverlaySummon", command: "XYZOverlaySummonCommand", offered: ["M-1", "EMZ-1"], position: "faceup-attack" },
    { method: "synchroSummon", command: "SynchroSummonCommand", offered: ["M-1", "M-2", "M-3", "EMZ-1"], position: "faceup-attack" },
  ] as const;

  for (const c of cases) {
    it(`${c.method}: offers materials, then free M/EMZ + freed material zones, and execs ${c.command}`, () => {
      (s.actions as any)[c.method]({ card: s.edCard });
      expect(s.dispatched()).toEqual(["clear-ui-action"]);

      const multi = s.cardSelection.startMultipleSelection.mock.calls[0][0];
      expect(multi.selectionType).toBe("card");
      expect(multi.zones.map((z: any) => z.zone)).toEqual(c.offered);

      const single = pickMaterials(s.cardSelection, [s.faceUp, s.emz]);
      expect(single.selectionType).toBe("zone");
      expect(single.showConfirm).toBe(false);
      expect(single.zones.map((z: any) => z.zone)).toEqual(["free:M:0", "free:EMZ:0", "M-1", "EMZ-1"]);

      single.onSelectionCompleted({ zone: "M-1" });
      const { name, data } = s.lastCommand();
      expect(name).toBe(c.command);
      expect(data).toEqual({
        player: 0,
        id: 9000,
        materials: [{ id: 1, zone: "M-1" }, { id: 4, zone: "EMZ-1" }],
        originZone: "ED-2",
        zone: "M-1",
        ...(c.position ? { position: c.position } : {}),
      });
      expect(s.dispatched()).toEqual(["clear-ui-action", "clear-ui-action"]);
    });
  }

  it("xyzSummon passes a requested position through", () => {
    s.actions.xyzSummon({ card: s.edCard as any, position: "faceup-defense" });
    pickMaterials(s.cardSelection, [s.faceUp]).onSelectionCompleted({ zone: "M-1" });
    expect(s.lastCommand().data.position).toBe("faceup-defense");
  });

  it("fusionSummon: picks materials from a card menu, offers free zones + freed field monster zones (EMZ included)", () => {
    s.actions.fusionSummon({ card: s.edCard as any });
    expect(s.cardSelection.startMultipleSelection).not.toHaveBeenCalled();
    const [event, payload] = s.duel.events.dispatch.mock.calls[0];
    expect(event).toBe("toggle-ui-menu");
    expect(payload.type).toBe("select-card-menu");
    expect(payload.data.filter).toEqual({ monsters: true, field: true, hand: true, mainDeck: true });

    payload.data.onSelectCards([
      { card: { id: 1 }, zone: "M-1" },
      { card: { id: 4 }, zone: "EMZ-1" },
      { card: { id: 7 }, zone: "H-1" },
    ]);
    expect(s.duel.events.dispatch.mock.calls[1]).toEqual(["close-ui-menu", { type: "select-card-menu" }]);

    const single = s.cardSelection.startSelection.mock.calls[0][0];
    expect(single.showConfirm).toBe(false);
    expect(single.zones.map((z: any) => z.zone)).toEqual([
      "free:M:0",
      "free:EMZ:0",
      "game:M:0:1",
      "game:EMZ:0:1",
    ]);

    single.onSelectionCompleted({ zone: "EMZ-1" });
    expect(s.lastCommand()).toEqual({
      name: "FusionSummonCommand",
      data: {
        player: 0,
        id: 9000,
        materials: [{ id: 1, zone: "M-1" }, { id: 4, zone: "EMZ-1" }, { id: 7, zone: "H-1" }],
        originZone: "ED-2",
        zone: "EMZ-1",
        position: "faceup-attack",
      },
    });
    expect(s.dispatched().at(-1)).toBe("clear-ui-action");
  });

  it("tributeSummon: offers every monster, then free M + tributed zones (with confirm default)", () => {
    const card = monster(50);
    s.actions.tributeSummon({ card: card as any, originZone: "H-1" as any });
    const multi = s.cardSelection.startMultipleSelection.mock.calls[0][0];
    expect(multi.zones.map((z: any) => z.zone)).toEqual(["M-1", "M-2", "M-3", "EMZ-1"]);
    const single = pickMaterials(s.cardSelection, [s.faceDown]);
    expect(single.showConfirm).toBeUndefined();
    expect(single.zones.map((z: any) => z.zone)).toEqual(["free:M:0", "M-2"]);
    single.onSelectionCompleted({ zone: "M-2" });
    expect(s.lastCommand()).toEqual({
      name: "TributeSummonCommand",
      data: { player: 0, id: 50, tributes: [{ id: 2, zone: "M-2" }], originZone: "H-1", zone: "M-2", position: "faceup-attack" },
    });
    expect(s.dispatched()).toEqual(["clear-ui-action", "clear-ui-action"]);
  });
});

describe("YGOGameActions — single-step commands", () => {
  let s: ReturnType<typeof setup>;
  const card = monster(77);
  beforeEach(() => {
    s = setup();
  });

  const zonePicks = [
    { method: "normalSummon", args: { originZone: "H-1" }, offered: ["free:M:0"], command: "NormalSummonCommand", data: { player: 0, id: 77, originZone: "H-1", zone: "Z", position: "faceup-attack" } },
    { method: "setSummon", args: { originZone: "H-1" }, offered: ["free:M:0"], command: "SetMonsterCommand", data: { player: 0, id: 77, originZone: "H-1", zone: "Z" } },
    { method: "specialSummon", args: { originZone: "GY" }, offered: ["free:M:0"], command: "SpecialSummonCommand", data: { player: 0, id: 77, originZone: "GY", zone: "Z", position: "faceup-attack" } },
    { method: "specialSummon", args: { originZone: "ED-1", position: "faceup-defense" }, offered: ["free:M:0", "free:EMZ:0"], command: "SpecialSummonCommand", data: { player: 0, id: 77, originZone: "ED-1", zone: "Z", position: "faceup-defense" } },
    { method: "setCard", args: { originZone: "H-1" }, offered: ["free:S:0"], command: "SetCardCommand", data: { player: 0, id: 77, originZone: "H-1", zone: "Z", reveal: false } },
    { method: "activateCard", args: { originZone: "H-1", selectZone: true }, offered: ["free:S:0"], command: "ActivateCardCommand", data: { player: 0, id: 77, originZone: "H-1", zone: "Z" } },
    { method: "toST", args: { originZone: "GY" }, offered: ["free:S:0"], command: "ToSTCommand", data: { player: 0, id: 77, originZone: "GY", zone: "Z" } },
    { method: "moveCard", args: { originZone: "free:M:1" }, offered: ["free:M:0", "free:S:0", "free:S:1"], command: "MoveCardCommand", data: { player: 0, id: 77, originZone: "free:M:1", zone: "Z", type: "Move Card" } },
    { method: "attachMaterial", args: { originZone: "GY" }, offered: ["M-5", "M-4"], command: "XYZAttachMaterialCommand", data: { player: 0, id: 77, originZone: "GY", zone: "Z" } },
  ] as const;

  for (const c of zonePicks) {
    it(`${c.method}(${JSON.stringify(c.args)}) clears, offers zones and execs ${c.command}`, () => {
      (s.actions as any)[c.method]({ card, ...c.args });
      expect(s.dispatched()).toEqual(["clear-ui-action"]);
      const sel = s.cardSelection.startSelection.mock.calls[0][0];
      expect(sel.selectionType).toBe("zone");
      expect(sel.showConfirm).toBeUndefined();
      expect(sel.zones.map((z: any) => z.zone)).toEqual(c.offered);
      expect(s.duel.execCommand).not.toHaveBeenCalled();
      sel.onSelectionCompleted({ zone: "Z" });
      expect(s.lastCommand()).toEqual({ name: c.command, data: c.data });
      expect(s.dispatched()).toEqual(["clear-ui-action"]);
    });
  }

  it("createToken offers both players' free monster zones", () => {
    s.actions.createToken({ position: "faceup-defense" });
    const sel = s.cardSelection.startSelection.mock.calls[0][0];
    expect(sel.zones.map((z: any) => z.zone)).toEqual(["free:M:0", "free:M:1"]);
    sel.onSelectionCompleted({ zone: "M-2" });
    expect(s.lastCommand()).toEqual({ name: "CreateTokenCommand", data: { player: 0, originZone: "M-2", position: "faceup-defense" } });
    expect(s.dispatched()).toEqual(["clear-ui-action"]);
  });

  it("attachMaterial does nothing beyond clearing when there is no other Xyz", () => {
    s.duel.__xyzZones = [fieldZone("M-5", card)];
    s.actions.attachMaterial({ card: card as any, originZone: "GY" as any });
    expect(s.cardSelection.startSelection).not.toHaveBeenCalled();
    expect(s.dispatched()).toEqual(["clear-ui-action"]);
  });

  it("setCard / activateCard without zone pick exec straight away", () => {
    s.actions.setCard({ card: card as any, originZone: "H-1" as any, zone: "S-2" as any, selectZone: false, reveal: true });
    expect(s.lastCommand()).toEqual({ name: "SetCardCommand", data: { player: 0, id: 77, originZone: "H-1", zone: "S-2", reveal: true } });
    s.actions.activateCard({ card: card as any, originZone: "S-1" as any });
    expect(s.lastCommand()).toEqual({ name: "ActivateCardCommand", data: { player: 0, id: 77, zone: "S-1" } });
    expect(s.cardSelection.startSelection).not.toHaveBeenCalled();
    expect(s.dispatched()).toEqual(["clear-ui-action", "clear-ui-action"]);
  });

  const oneShots = [
    { method: "sendToGy", args: {}, clears: true, command: "SendCardToGYCommand", data: { player: 0, id: 77, originZone: "M-1" } },
    { method: "sendToGy", args: { player: 1 }, clears: true, command: "SendCardToGYCommand", data: { player: 1, id: 77, originZone: "M-1" } },
    { method: "revealCard", args: {}, clears: true, command: "RevealCommand", data: { player: 0, id: 77, originZone: "M-1" } },
    { method: "destroyCard", args: {}, clears: true, command: "DestroyCardCommand", data: { player: 0, id: 77, originZone: "M-1" } },
    { method: "targetCard", args: {}, clears: true, command: "TargetCommand", data: { player: 0, id: 77, originZone: "M-1" } },
    { method: "negateCard", args: {}, clears: true, command: "NegateCommand", data: { player: 0, id: 77, originZone: "M-1" } },
    { method: "banish", args: {}, clears: false, command: "BanishCommand", data: { player: 0, id: 77, originZone: "M-1", position: "faceup" } },
    { method: "banish", args: { position: "facedown" }, clears: false, command: "BanishCommand", data: { player: 0, id: 77, originZone: "M-1", position: "facedown" } },
    { method: "flip", args: {}, clears: false, command: "FlipCommand", data: { player: 0, id: 77, originZone: "M-1" } },
    { method: "changeBattlePosition", args: { position: "faceup-defense" }, clears: false, command: "ChangeCardPositionCommand", data: { player: 0, id: 77, originZone: "M-1", position: "faceup-defense" } },
    { method: "toDeck", args: { position: "bottom" }, clears: false, command: "ToDeckCommand", data: { player: 0, id: 77, originZone: "M-1", position: "bottom", shuffle: false } },
  ] as const;

  for (const c of oneShots) {
    it(`${c.method}(${JSON.stringify(c.args)}) execs ${c.command} ${c.clears ? "after" : "without"} clearing`, () => {
      (s.actions as any)[c.method]({ card, originZone: "M-1", ...c.args });
      expect(s.dispatched()).toEqual(c.clears ? ["clear-ui-action"] : []);
      expect(s.lastCommand()).toEqual({ name: c.command, data: c.data });
    });
  }

  it("disapear only acts on tokens and does not clear", () => {
    s.actions.disapear({ card: card as any, originZone: "M-1" as any });
    expect(s.duel.execCommand).not.toHaveBeenCalled();
    s.actions.disapear({ card: monster(3, { typeline: ["Token"] }) as any, originZone: "M-1" as any });
    expect(s.lastCommand()).toEqual({ name: "DisappearCommand", data: { player: 0, id: 3, originZone: "M-1" } });
    expect(s.dispatched()).toEqual([]);
  });

  it("banishMultiple does not clear", () => {
    s.actions.banishMultiple({ cards: [{ card: card as any, zone: "M-1" as any }] });
    expect(s.lastCommand()).toEqual({ name: "BanishCommand", data: { player: 0, ids: [{ id: 77, zone: "M-1" }], position: "faceup" } });
    expect(s.dispatched()).toEqual([]);
  });
});
