import { describe, expect, it } from "vitest";
import {
  ACTIVATE_NEW_CHAIN_LABEL,
  activateLabel,
  chainMenuState,
  chainModeOn,
  chainResolveOrder,
  negateLinkLabel,
  newestChainLink,
  nextChainLink,
  resolveLinkLabel,
  showResolveAll,
} from "./chain-mode";

const link = (n: number) => ({ link: n, player: 0, id: 1, zone: "M-1" as any });
const duel = (chain: any[], { options = {}, chainMode, gameMode, client }: any = {}) => ({
  ygo: { options, state: { chain } },
  settings: { getConfigFromPath: () => chainMode },
  config: { gameMode },
  client,
});

describe("chain mode helpers", () => {
  it("is on by default, off when switched off, in engine rooms, replays and for spectators", () => {
    expect(chainModeOn(duel([]))).toBe(true);
    expect(chainModeOn(duel([], { chainMode: true }))).toBe(true);
    expect(chainModeOn(duel([], { chainMode: false }))).toBe(false);
    expect(chainModeOn(duel([], { options: { assistedMode: true } }))).toBe(false);
    expect(chainModeOn(duel([], { options: { botDuel: true } }))).toBe(false);
    expect(chainModeOn(duel([], { gameMode: "REPLAY" }))).toBe(false);
    expect(chainModeOn(duel([], { client: { type: 3 } }))).toBe(false);
    expect(chainModeOn(null)).toBe(false);
  });

  it("numbers and orders links", () => {
    expect(nextChainLink([])).toBe(1);
    expect(nextChainLink([link(1), link(2)])).toBe(3);
    expect(newestChainLink([])).toBeNull();
    expect(newestChainLink([link(1), link(2)])).toBe(2);
    expect(chainResolveOrder([link(1), link(3), link(2)])).toEqual([3, 2, 1]);
  });

  it("menu labels", () => {
    const closed = chainMenuState(duel([]));
    expect(closed).toEqual({ open: false, nextLink: 1, links: [] });
    expect(activateLabel("Activate", closed)).toBe("Activate");
    expect(activateLabel("Activate from Hand", closed)).toBe("Activate from Hand");

    const open = chainMenuState(duel([link(1), link(2)]));
    expect(open).toEqual({ open: true, nextLink: 3, links: [1, 2] });
    expect(activateLabel("Activate", open)).toBe("Chain (link 3)");
    expect(activateLabel("Activate from Hand", open)).toBe("Chain from Hand (link 3)");
    expect(negateLinkLabel(2)).toBe("Negate link 2");
    expect(ACTIVATE_NEW_CHAIN_LABEL).toBe("Activate as new chain");
    expect(resolveLinkLabel([link(1)])).toBe("Resolve");
    expect(showResolveAll([link(1)])).toBe(false);
    expect(showResolveAll([link(1), link(2)])).toBe(true);
    expect(resolveLinkLabel([link(1), link(2)])).toBe("Resolve link 2");

    // engine rooms: the menus stay as they were
    const engine = chainMenuState(duel([link(1)], { options: { assistedMode: true } }));
    expect(engine.open).toBe(false);
    expect(activateLabel("Activate", engine)).toBe("Activate");
  });
});
