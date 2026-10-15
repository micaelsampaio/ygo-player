import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../scripts/ygo-utils", () => ({
  getCardZones: (_duel: any, players: number[], types: string[]) =>
    players.flatMap((p) => types.map((t) => ({ zone: `free:${t}:${p}` }))),
  getMonstersZones: () => [],
  getXyzMonstersZones: () => [],
  getGameZone: () => null,
}));
vi.mock("../actions/ActionSelectCard", () => ({ ActionCardSelection: class {} }));

import { YGOCommands, YGODuelPhase } from "ygo-core";
import { YGOGameActions } from "./YGOGameActions";

// ygo-core ships minified, so name a command by the YGOCommands export it is.
const commandName = (cmd: any) =>
  Object.keys(YGOCommands).find((k) => (YGOCommands as any)[k] === cmd.constructor) ?? "?";

const card = { id: 77, originalOwner: 0, owner: 0, position: "faceup", typeline: [], isMainDeckCard: true };

/**
 * Chain mode (domain/chain-mode.ts) in manual duels: the game actions number
 * activations and resolve the chain. state.chain is set by hand here — in a
 * real duel it changes when ygo-core runs the commands.
 */
function setup({ options = {}, chainMode, gameMode }: { options?: Record<string, unknown>; chainMode?: boolean; gameMode?: string } = {}) {
  const cardSelection = { startSelection: vi.fn(), startMultipleSelection: vi.fn() };
  const state: any = { chain: [], fields: [{ extraDeck: [] }, { extraDeck: [] }] };
  const duel: any = {
    gameController: { getComponent: () => cardSelection },
    events: { dispatch: vi.fn() },
    serverActions: { getActivePlayer: () => 0 },
    execCommand: vi.fn(),
    ygo: { state, options },
    config: { gameMode },
    settings: { getConfigFromPath: (key: string) => (key === "chainMode" ? chainMode : undefined) },
    fields: [{ fieldZone: { zone: "F" } }, { fieldZone: { zone: "F2" } }],
  };
  const actions = new YGOGameActions(duel);
  const commands = () => duel.execCommand.mock.calls.map((c: any[]) => ({ name: commandName(c[0]), data: c[0].data }));
  const link = (n: number, id = 77) => ({ link: n, player: 0, id, zone: "M-1" });
  return { actions, duel, state, cardSelection, commands, link };
}

describe("chain mode — activation numbering", () => {
  it("numbers each activation as the next link (state.chain.length + 1)", () => {
    const s = setup();
    s.actions.activateCard({ card: card as any, originZone: "M-1" as any });
    s.state.chain.push(s.link(1));
    s.actions.activateCard({ card: card as any, originZone: "M-1" as any });
    expect(s.commands().map((c: any) => c.data.chainLink)).toEqual([1, 2]);
  });

  it("numbers a zone-picked activation when the zone is picked", () => {
    const s = setup();
    s.state.chain.push(s.link(1), s.link(2));
    s.actions.activateCard({ card: card as any, originZone: "H-1" as any, selectZone: true });
    s.cardSelection.startSelection.mock.calls[0][0].onSelectionCompleted({ zone: "S-1" });
    expect(s.commands()).toEqual([{ name: "ActivateCardCommand", data: { player: 0, id: 77, originZone: "H-1", zone: "S-1", chainLink: 3 } }]);
  });

  it("'Activate as new chain' resolves the open chain (newest first), then starts at link 1", () => {
    const s = setup();
    s.state.chain.push(s.link(1), s.link(2));
    s.actions.activateCard({ card: card as any, originZone: "M-1" as any, newChain: true });
    expect(s.commands()).toEqual([
      { name: "ResolveChainLinkCommand", data: { player: 0, link: 2 } },
      { name: "ResolveChainLinkCommand", data: { player: 0, link: 1 } },
      { name: "ActivateCardCommand", data: { player: 0, id: 77, zone: "M-1", chainLink: 1 } },
    ]);
  });

  it.each([
    ["the setting is off", { chainMode: false }],
    ["Assisted Mode", { options: { assistedMode: true } }],
    ["a bot duel", { options: { botDuel: true } }],
    ["a replay", { gameMode: "REPLAY" }],
  ])("adds no chain link when %s", (_why, opts) => {
    const s = setup(opts as any);
    s.state.chain.push(s.link(1));
    s.actions.activateCard({ card: card as any, originZone: "M-1" as any, newChain: true });
    expect(s.commands()).toEqual([{ name: "ActivateCardCommand", data: { player: 0, id: 77, zone: "M-1" } }]);
  });
});

describe("chain mode — resolving", () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  it("resolveChainLink resolves the newest link only", () => {
    s.state.chain.push(s.link(1), s.link(2));
    s.actions.resolveChainLink();
    expect(s.commands()).toEqual([{ name: "ResolveChainLinkCommand", data: { player: 0, link: 2 } }]);
  });

  it("resolveChainLink / resolveChain do nothing with no chain", () => {
    s.actions.resolveChainLink();
    s.actions.resolveChain();
    expect(s.duel.execCommand).not.toHaveBeenCalled();
  });

  it("resolveChain sends one command per link, newest first, and not twice for the same pending chain", () => {
    s.state.chain.push(s.link(1), s.link(2), s.link(3));
    s.actions.resolveChain();
    s.actions.resolveChain(); // the first batch hasn't come back from the server yet
    expect(s.commands().map((c: any) => c.data.link)).toEqual([3, 2, 1]);
  });

  it("a phase change resolves an open chain first", () => {
    s.state.chain.push(s.link(1), s.link(2));
    s.actions.setDuelPhase({ phase: YGODuelPhase.Battle });
    expect(s.commands().map((c: any) => c.name)).toEqual(["ResolveChainLinkCommand", "ResolveChainLinkCommand", "DuelPhaseCommand"]);
  });

  it("a turn change resolves an open chain first", () => {
    s.state.chain.push(s.link(1));
    s.actions.nextDuelturn();
    expect(s.commands().map((c: any) => c.name)).toEqual(["ResolveChainLinkCommand", "DuelTurnCommand"]);
  });

  it("a phase change with no chain just changes phase", () => {
    s.actions.setDuelPhase({ phase: YGODuelPhase.Battle });
    expect(s.commands().map((c: any) => c.name)).toEqual(["DuelPhaseCommand"]);
  });

  it("engine rooms never auto-resolve (the engine reports the chain)", () => {
    const e = setup({ options: { assistedMode: true } });
    e.state.chain.push(e.link(1));
    e.actions.setDuelPhase({ phase: YGODuelPhase.Battle });
    expect(e.commands().map((c: any) => c.name)).toEqual(["DuelPhaseCommand"]);
  });

  it("negateCard can name the chain link it negates", () => {
    s.actions.negateCard({ card: card as any, originZone: "M-1" as any, negatedLink: 2 });
    expect(s.commands()).toEqual([{ name: "NegateCommand", data: { player: 0, id: 77, originZone: "M-1", negatedLink: 2 } }]);
  });
});
