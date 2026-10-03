/* eslint-disable @typescript-eslint/no-explicit-any -- the duel is a hand-rolled stub */
import { describe, expect, it, vi } from "vitest";

vi.mock("../scripts/ygo-utils", () => ({
  getCardZones: (_duel: any, players: number[], types: string[]) =>
    players.flatMap((p) => types.map((t) => ({ zone: `free:${t}:${p}` }))),
  getMonstersZones: () => [],
  getXyzMonstersZones: () => [],
  getGameZone: () => null,
}));
vi.mock("../actions/ActionSelectCard", () => ({ ActionCardSelection: class {} }));

import { YGOCommands } from "ygo-core";
import { YGOGameActions } from "./YGOGameActions";

const commandName = (cmd: any) =>
  Object.keys(YGOCommands).find((k) => (YGOCommands as any)[k] === cmd.constructor) ?? "?";

function setup({ showCards = true, pov = 0 }: { showCards?: boolean; pov?: number } = {}) {
  const duel: any = {
    gameController: { getComponent: () => ({ startSelection: vi.fn(), startMultipleSelection: vi.fn() }) },
    events: { dispatch: vi.fn() },
    serverActions: { getActivePlayer: () => 1 },
    execCommand: vi.fn(),
    perspective: { isPlayerPOV: (p: number) => p === pov },
    ygo: {
      state: { fields: [{ extraDeck: [] }, { extraDeck: [] }], getCardFromZone: () => ({ currentAtk: 1800 }) },
      options: {},
      getField: () => ({ state: "idle" }),
    },
    fields: [{ fieldZone: { zone: "F" }, settings: { showCards } }, { fieldZone: { zone: "F2" }, settings: { showCards } }],
  };
  const actions = new YGOGameActions(duel);
  const commands = () => duel.execCommand.mock.calls.map((c: any[]) => [commandName(c[0]), c[0].data]);
  const dispatched = () => duel.events.dispatch.mock.calls.map((c: any[]) => c[0]);
  return { duel, actions, commands, dispatched };
}

describe("YGOGameActions — battle", () => {
  it("attack with damage to the attacked player and both destroyed", () => {
    const s = setup();
    s.actions.attack({ attackingId: 1, attackingZone: "M-1", attackedId: 2, attackedZone: "M2-3", battleDamage: 500, destroyAttacking: true, destroyAttacked: true });
    expect(s.commands()).toEqual([
      ["AttackCommand", { player: 0, attackedId: 2, attackedZone: "M2-3", attackingId: 1, attackingZone: "M-1" }],
      ["LifePointsTransactionCommand", { player: 1, value: "-500" }],
      ["DestroyCardCommand", { player: 0, id: 1, originZone: "M-1" }],
      ["DestroyCardCommand", { player: 1, id: 2, originZone: "M2-3" }],
    ]);
  });

  it("attack with negative damage hits the attacking player", () => {
    const s = setup();
    s.actions.attack({ attackingId: 1, attackingZone: "M-1", attackedId: 2, attackedZone: "M2-3", battleDamage: -300 });
    expect(s.commands()).toEqual([
      ["AttackCommand", { player: 0, attackedId: 2, attackedZone: "M2-3", attackingId: 1, attackingZone: "M-1" }],
      ["LifePointsTransactionCommand", { player: 0, value: "-300" }],
    ]);
  });

  it("attackDirectly takes the attacker's ATK from the opponent", () => {
    const s = setup();
    s.actions.attackDirectly({ id: 4, originZone: "M2-2" });
    expect(s.commands()).toEqual([
      ["AttackDirectlyCommand", { player: 1, id: 4, originZone: "M2-2" }],
      ["LifePointsTransactionCommand", { player: 0, value: "-1800" }],
    ]);
  });
});

describe("YGOGameActions — turn, phase and player commands", () => {
  it.each([
    ["setDuelPhase", { phase: "Battle Phase" }, "DuelPhaseCommand"],
    ["drawFromDeck", { player: 0 }, "DrawFromDeckCommand"],
    ["milFromDeck", { player: 1 }, "MillFromDeckCommand"],
    ["milFromDeck", { player: 1, numberOfCards: 3 }, "MillFromDeckCommand"],
    ["lifePointsTransaction", { player: 0, value: "+100" }, "LifePointsTransactionCommand"],
    ["swapPlayerHand", { player: 1 }, "SwapHandCommand"],
    ["shuffleDeck", { player: 0 }, "ShuffleDeckCommand"],
    ["shuffleHand", { player: 0 }, "ShuffleHandCommand"],
    ["showHand", { player: 1 }, "ShowHandCommand"],
    ["showExtraDeck", { player: 1 }, "ShowExtraDeckCommand"],
    ["diceRoll", { player: 0 }, "DiceRollCommand"],
    ["admitDefeat", { player: 1 }, "AdmitDefeatCommand"],
    ["flipCoin", { player: 0 }, "CoinFlipCommand"],
    ["addDuelNote", { note: "hi", duration: 5 }, "NoteCommand"],
    ["addDuelNote", { player: 0, note: "hi", duration: NaN }, "NoteCommand"],
    ["setPlayerState", { player: 0, state: "thinking" }, "PlayerStateCommand"],
    ["setPlayerState", { player: 0, currentState: "waiting", state: "thinking" }, "PlayerStateCommand"],
  ])("%s(%j) execs %s", (method, args, command) => {
    const s = setup();
    (s.actions as any)[method](args);
    const [[name, data]] = s.commands();
    expect(name).toBe(command);
    expect(data).toMatchSnapshot();
    expect(s.dispatched()).toEqual([]);
  });

  it("nextDuelturn execs DuelTurnCommand", () => {
    const s = setup();
    s.actions.nextDuelturn();
    expect(s.commands().map((c: any[]) => c[0])).toEqual(["DuelTurnCommand"]);
  });

  it("goToPhaseAssisted is null outside Assisted Mode", () => {
    const s = setup();
    expect(s.actions.goToPhaseAssisted(["Battle Phase" as any])).toBeNull();
  });
});

describe("YGOGameActions — card destinations", () => {
  const card = (extra: any = {}) => ({ id: 7, owner: 1, originalOwner: 1, isMainDeckCard: true, typeline: ["Effect"], ...extra });

  it("toHand of a Main Deck card", () => {
    const s = setup();
    s.actions.toHand({ card: card() as any, originZone: "GY2-1" as any, reveal: true });
    expect(s.dispatched()).toEqual(["clear-ui-action"]);
    expect(s.commands()).toEqual([["ToHandCommand", { player: 1, id: 7, originZone: "GY2-1", reveal: true }]]);
  });

  it("toHand of an Extra Deck card goes to the Extra Deck, owner's zone", () => {
    const s = setup();
    s.actions.toHand({ card: card({ isMainDeckCard: false }) as any, originZone: "GY-2" as any });
    expect(s.dispatched()).toEqual(["clear-ui-action", "clear-ui-action"]);
    expect(s.commands()).toEqual([["ToExtraDeckCommand", { player: 1, id: 7, originZone: "GY2-2" }]]);
  });

  it("toDeck of an Extra Deck card goes to the Extra Deck", () => {
    const s = setup();
    s.actions.toDeck({ card: card({ isMainDeckCard: false }) as any, originZone: "M2-1" as any, position: "top" });
    expect(s.commands().map((c: any[]) => c[0])).toEqual(["ToExtraDeckCommand"]);
  });

  it("fieldSpell goes to the owner's field zone", () => {
    const s = setup();
    s.actions.fieldSpell({ card: card() as any, originZone: "H2-1" as any, position: "facedown" });
    expect(s.commands()).toEqual([["FieldSpellCommand", { player: 1, id: 7, originZone: "H2-1", zone: "F2", position: "facedown" }]]);
  });

  it("destroyAllCards clears and execs", () => {
    const s = setup();
    s.actions.destroyAllCards({ zone: "spell" });
    expect(s.dispatched()).toEqual(["clear-ui-action"]);
    expect(s.commands()).toEqual([["DestroyAllCardsOnFieldCommand", { player: 1, zone: "spell" }]]);
  });

  it("detachMaterial execs with the material's id", () => {
    const s = setup();
    s.actions.detachMaterial({ card: card({ materials: [{ id: 50 }, { id: 51 }] }) as any, originZone: "M-1" as any, materialIndex: 1 });
    expect(s.commands()).toEqual([["XYZDetachMaterialCommand", { player: 1, id: 51, originZone: "M-1", materialIndex: 1 }]]);
  });
});

describe("YGOGameActions — setSelectedCard", () => {
  const card = { id: 1, originalOwner: 1, position: "facedown" } as any;
  it("hides the opponent's face-down card when cards are hidden", () => {
    const s = setup({ showCards: false });
    s.actions.setSelectedCard({ card, player: 1 });
    expect(s.dispatched()).toEqual([]);
  });
  it.each([
    ["forced", { showCards: false }, true],
    ["cards are shown", { showCards: true }, false],
    ["it is the POV player's own card", { showCards: false, pov: 1 }, false],
  ])("shows it when %s", (_why, options, force) => {
    const s = setup(options);
    s.actions.setSelectedCard({ card, player: 1, force });
    expect(s.dispatched()).toEqual(["set-selected-card"]);
  });
  it("without a player it always shows", () => {
    const s = setup({ showCards: false });
    s.actions.setSelectedCard({ card });
    expect(s.duel.events.dispatch).toHaveBeenCalledWith("set-selected-card", { card, player: undefined });
  });
});
