import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { YGODuelPhase } from "ygo-core";
import { DuelPhaseActionsMenu } from "./actions/duel-phase-menu";
import { CardZoneMenu } from "./actions/card-zone-menu";
import { pileCardActions } from "./actions/pile-card-actions";
import { chainLinkResolvedText } from "./menus/duel-log/chain-link-resolved-log";

/** Chain mode (domain/chain-mode.ts) as the menus show it. */
const link = (n: number) => ({ link: n, player: 0, id: 1, zone: "M-1" });
const emptyField = () => ({
  monsterZone: [null, null, null, null, null],
  spellTrapZone: [null, null, null, null, null],
  extraMonsterZone: [null, null],
  graveyard: [] as any[],
  banishedZone: [] as any[],
  extraDeck: [] as any[],
  mainDeck: [] as any[],
});

function fakeDuel(chain: any[], { options = {}, chainMode }: { options?: Record<string, unknown>; chainMode?: boolean } = {}): any {
  const fields = [emptyField(), emptyField()];
  return {
    ygo: { options, state: { chain, phase: YGODuelPhase.Main1, turn: 2, fields }, getField: (p: number) => fields[p] },
    settings: { getConfigFromPath: (key: string) => (key === "chainMode" ? chainMode : undefined) },
    config: {},
    perspective: { isPlayer: () => true, isPlayerPOV: () => true, getPlayerCssIndex: (p: number) => p },
    events: { dispatch: vi.fn() },
    gameActions: { activateCard: vi.fn(), negateCard: vi.fn() },
    getActivePlayer: () => 0,
  };
}

describe("phase menu — resolve control", () => {
  const html = (duel: any) => renderToStaticMarkup(<DuelPhaseActionsMenu duel={duel} transform={{} as any} />);

  it("shows Resolve link N / Resolve all while a chain is open", () => {
    const out = html(fakeDuel([link(1), link(2)]));
    expect(out).toContain("Resolve link 2");
    expect(out).toContain("Resolve all");
  });

  it("is hidden with no chain, with chain mode off, and in engine rooms", () => {
    expect(html(fakeDuel([]))).not.toContain("Resolve");
    expect(html(fakeDuel([link(1)], { chainMode: false }))).not.toContain("Resolve");
    expect(html(fakeDuel([link(1)], { options: { assistedMode: true } }))).not.toContain("Resolve");
  });
});

describe("card zone menu — chain labels", () => {
  const spell = { id: 10, owner: 0, originalOwner: 0, type: "Spell Card", frameType: "spell", race: "Normal", position: "faceup", typeline: [], isMainDeckCard: true };
  const html = (duel: any) =>
    renderToStaticMarkup(<CardZoneMenu duel={duel} card={spell as any} zone={"S-1" as any} gameCard={{} as any} clearAction={() => {}} mouseEvent={{} as any} />);

  it("Activate with no chain", () => {
    const out = html(fakeDuel([]));
    expect(out).toContain(">Activate<");
    expect(out).not.toContain("Activate as new chain");
    expect(out).not.toContain("Negate link");
  });

  it("Chain (link N) and Negate link N with a chain open, no Activate as new chain", () => {
    const out = html(fakeDuel([link(1), link(2)]));
    expect(out).toContain("Chain (link 3)");
    expect(out).not.toContain("Activate as new chain");
    expect(out).toContain("Negate link 1");
    expect(out).toContain("Negate link 2");
  });
});

describe("pile card menus — chain labels", () => {
  const monster = { id: 1, originalOwner: 0, frameType: "effect", type: "Effect Monster", typeline: ["Effect"], isMainDeckCard: true };
  const labels = (duel: any) => pileCardActions(duel, monster as any, "GY-1" as any, { source: "GY", closeViewer: () => {} }).map((a) => a.label);

  it("adds the chain entries next to Activate / Negate while a chain is open", () => {
    expect(labels(fakeDuel([link(1)]))).toEqual([
      "SS ATK", "SS DEF", "Chain (link 2)", "Target", "TO ST", "To Hand", "Banish", "Banish FD",
      "To Top Deck", "To Bottom Deck", "Negate", "Negate link 1",
    ]);
  });

  it("Negate link N names the link", () => {
    const duel = fakeDuel([link(1), link(2)]);
    pileCardActions(duel, monster as any, "GY-1" as any, { source: "GY", closeViewer: () => {} }).find((a) => a.label === "Negate link 2")!.run();
    expect(duel.gameActions.negateCard).toHaveBeenCalledWith({ card: monster, originZone: "GY-1", negatedLink: 2 });
  });
});

describe("duel log — ChainLinkResolved", () => {
  it("reads 'Chain Link N resolves: <card>'", () => {
    expect(chainLinkResolvedText({ link: 2 }, "Ash Blossom & Joyous Spring")).toBe("Chain Link 2 resolves: Ash Blossom & Joyous Spring");
    expect(chainLinkResolvedText({ link: 1 }, undefined)).toBe("Chain Link 1 resolves");
  });
});
