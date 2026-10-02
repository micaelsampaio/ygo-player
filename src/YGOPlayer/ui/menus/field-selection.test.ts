import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ZONES = new Map<string, any>();
vi.mock("../../scripts/ygo-utils", () => ({
  getGameZone: (_duel: any, zoneData: any) => ZONES.get(`${zoneData.zone}${zoneData.player === 1 ? "2" : ""}-${zoneData.zoneIndex}`) ?? null,
}));

import { startFieldSelection } from "./field-selection";

function fakeDuel() {
  const listeners = new Map<string, Set<() => void>>();
  let nextId = 0;
  let active: { id: number; opts: any } | null = null;
  const selection = {
    startSelection: vi.fn((opts: any) => { active = { id: ++nextId, opts }; return nextId; }),
    isSelecting: (id: number) => active?.id === id,
  };
  const duel: any = {
    gameController: { getComponent: () => selection },
    events: {
      on: (e: string, f: () => void) => { if (!listeners.has(e)) listeners.set(e, new Set()); listeners.get(e)!.add(f); },
      off: (e: string, f: () => void) => listeners.get(e)?.delete(f),
    },
    actionManager: { clearAction: vi.fn(() => { active = null; }) },
  };
  return {
    duel,
    selection,
    active: () => active,
    // An animation cleared the field action, then re-enabled game actions.
    animate: () => { active = null; listeners.get("enable-game-actions")?.forEach((f) => f()); },
    cancel: () => { const a = active; active = null; a?.opts.onCanceled?.(); },
    listenerCount: () => listeners.get("enable-game-actions")?.size ?? 0,
  };
}

describe("startFieldSelection", () => {
  const m1 = { zone: "M-1", getCardReference: () => ({ id: 1 }) };
  const m2 = { zone: "M-2", getCardReference: () => null };
  beforeEach(() => {
    vi.useFakeTimers();
    ZONES.clear();
    ZONES.set("M-1", m1);
    ZONES.set("M-2", m2);
  });
  afterEach(() => vi.useRealTimers());

  it("zone mode: glows every resolvable zone and answers a click with its value", () => {
    const f = fakeDuel();
    const onPick = vi.fn();
    startFieldSelection(f.duel, [{ zone: "M-1", value: "a" }, { zone: "M-2", value: "b" }, { zone: "S-9", value: "x" }], { selectionType: "zone", onPick });
    const opts = f.selection.startSelection.mock.calls[0][0];
    expect(opts.selectionType).toBe("zone");
    expect(opts.zones).toEqual([m1, m2]);
    opts.onSelectionCompleted(m2);
    expect(onPick).toHaveBeenCalledWith("b");
  });

  it("card mode: only zones holding a card; nothing starts when none do", () => {
    const f = fakeDuel();
    startFieldSelection(f.duel, [{ zone: "M-1", value: 0 }, { zone: "M-2", value: 1 }], { selectionType: "card", onPick: vi.fn() });
    expect(f.selection.startSelection.mock.calls[0][0].zones).toEqual([m1]);
    const g = fakeDuel();
    startFieldSelection(g.duel, [{ zone: "M-2", value: 1 }], { selectionType: "card", onPick: vi.fn() });
    expect(g.selection.startSelection).not.toHaveBeenCalled();
  });

  it("puts the glow back after an animation (next tick), not while it is still showing", () => {
    const f = fakeDuel();
    startFieldSelection(f.duel, [{ zone: "M-1", value: 0 }], { selectionType: "card", onPick: vi.fn() });
    expect(f.selection.startSelection).toHaveBeenCalledTimes(1);
    f.animate();
    expect(f.selection.startSelection).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(f.selection.startSelection).toHaveBeenCalledTimes(2);
  });

  it("without onDismiss a dismissed glow has no cancel handler and comes back after the next animation", () => {
    const f = fakeDuel();
    startFieldSelection(f.duel, [{ zone: "M-1", value: 0 }], { selectionType: "card", onPick: vi.fn() });
    expect(f.selection.startSelection.mock.calls[0][0].onCanceled).toBeUndefined();
    f.cancel();
    f.animate();
    vi.runAllTimers();
    expect(f.selection.startSelection).toHaveBeenCalledTimes(2);
  });

  it("with onDismiss, a cancel reports it", () => {
    const f = fakeDuel();
    const onDismiss = vi.fn();
    startFieldSelection(f.duel, [{ zone: "M-1", value: 0 }], { selectionType: "zone", onPick: vi.fn(), onDismiss });
    f.cancel();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("cleanup takes a still-showing glow down, stops listening, and ignores late picks", () => {
    const f = fakeDuel();
    const onPick = vi.fn();
    const onDismiss = vi.fn();
    const dispose = startFieldSelection(f.duel, [{ zone: "M-1", value: 7 }], { selectionType: "zone", onPick, onDismiss });
    const opts = f.selection.startSelection.mock.calls[0][0];
    expect(f.listenerCount()).toBe(1);
    dispose();
    expect(f.duel.actionManager.clearAction).toHaveBeenCalledTimes(1);
    expect(f.listenerCount()).toBe(0);
    opts.onSelectionCompleted(m1);
    opts.onCanceled();
    expect(onPick).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("cleanup leaves the field action alone when the glow is no longer showing", () => {
    const f = fakeDuel();
    const dispose = startFieldSelection(f.duel, [{ zone: "M-1", value: 7 }], { selectionType: "zone", onPick: vi.fn() });
    f.cancel();
    dispose();
    expect(f.duel.actionManager.clearAction).not.toHaveBeenCalled();
  });
});
