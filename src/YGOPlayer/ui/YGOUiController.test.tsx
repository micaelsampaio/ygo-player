import { describe, expect, it, vi } from "vitest";
import type { SetStateAction } from "react";
import { EventBus } from "../scripts/event-bus";
import type { YGODuelUIEvents } from "../core/YGODuelUIEvents";
import type { YGODuel } from "../core/YGODuel";
import { bindUiControllerEvents, nextMenus } from "./YGOUiController";
import type { UiActionState, UiGameConfig, UiMenuState } from "./ui-types";

const menu = (group: string, type: string, visible = true): UiMenuState => ({ group, type, visible });

describe("nextMenus — menu visibility", () => {
  const menus = [menu("game-overlay", "duel-log"), menu("game-popup", "gy"), menu("game-popup", "banish")];

  it("changes every menu of the group", () => {
    const next = nextMenus(menus, { kind: "visibility", group: "game-popup", visibility: false });
    expect(next.map(m => m.visible)).toEqual([true, false, false]);
  });

  it("changes the menu of that type when no group is given", () => {
    const next = nextMenus(menus, { kind: "visibility", type: "duel-log", visibility: false });
    expect(next.map(m => m.visible)).toEqual([false, true, true]);
  });

  it("keeps the same array when neither group nor type is given (used to return an object)", () => {
    const next = nextMenus(menus, { kind: "visibility", visibility: false });
    expect(next).toBe(menus);
    expect(Array.isArray(next)).toBe(true);
  });
});

describe("nextMenus — open, toggle, close", () => {
  it("set replaces the menu in the same group", () => {
    const next = nextMenus([menu("game-popup", "gy")], { kind: "set", menu: { group: "game-popup", type: "banish" } });
    expect(next).toEqual([menu("game-popup", "banish")]);
  });

  it("toggle closes an open menu and opens a closed one", () => {
    const open = [menu("game-overlay", "duel-log")];
    expect(nextMenus(open, { kind: "toggle", menu: { group: "game-overlay", type: "duel-log" } })).toEqual([]);
    expect(nextMenus(open, { kind: "toggle", menu: { group: "game-overlay", type: "controls-menu" } }))
      .toEqual([menu("game-overlay", "controls-menu")]);
  });

  it("close removes by group, else by type, else nothing", () => {
    const open = [menu("game-overlay", "duel-log"), menu("game-popup", "gy")];
    expect(nextMenus(open, { kind: "close", group: "game-popup" })).toEqual([menu("game-overlay", "duel-log")]);
    expect(nextMenus(open, { kind: "close", type: "duel-log" })).toEqual([menu("game-popup", "gy")]);
    expect(nextMenus(open, { kind: "close" })).toBe(open);
  });
});

/** The controller's state, held in plain variables (setters apply updaters like React does). */
function fakeUi() {
  const state = {
    action: { type: "", data: null } as UiActionState,
    menus: [] as UiMenuState[],
    config: { actions: true, startReplay: false } as UiGameConfig,
  };
  const apply = <T,>(prev: T, next: SetStateAction<T>): T => (typeof next === "function" ? (next as (p: T) => T)(prev) : next);
  const ui = {
    setAction: vi.fn((next: SetStateAction<UiActionState>) => { state.action = apply(state.action, next); }),
    setMenus: vi.fn((next: SetStateAction<UiMenuState[]>) => { state.menus = apply(state.menus, next); }),
    setGameConfig: vi.fn((next: SetStateAction<UiGameConfig>) => { state.config = apply(state.config, next); }),
  };
  return { state, ui };
}

function fakeDuel() {
  const events = new EventBus<YGODuelUIEvents>();
  const actionManager = { clearAction: vi.fn() };
  return { events, actionManager } as unknown as Pick<YGODuel, "events" | "actionManager"> & { events: EventBus<YGODuelUIEvents> };
}

/** How many listeners the bus holds, over all events. */
function listenerCount(events: EventBus<YGODuelUIEvents>): number {
  const map = (events as unknown as { events: Map<string, unknown[]> }).events;
  return [...map.values()].reduce((n, list) => n + list.length, 0);
}

describe("bindUiControllerEvents — listener cleanup", () => {
  it("drives the controller state from the duel's events", () => {
    const duel = fakeDuel();
    const { state, ui } = fakeUi();
    bindUiControllerEvents(duel, ui);

    duel.events.dispatch("set-ui-menu", { group: "game-overlay", type: "duel-log" });
    duel.events.dispatch("set-ui-menu-visibility", { visibility: false });
    expect(state.menus).toEqual([menu("game-overlay", "duel-log")]);

    duel.events.dispatch("set-ui-action", { type: "card-hand-menu", data: { a: 1 } });
    expect(state.action).toEqual({ type: "card-hand-menu", data: { a: 1 } });
    duel.events.dispatch("clear-ui-action");
    expect(state.action.type).toBe("");
    expect(duel.actionManager.clearAction).toHaveBeenCalled();

    duel.events.dispatch("disable-game-actions");
    expect(state.config.actions).toBe(false);
    duel.events.dispatch("update-game-ui-config", { startReplay: true, actions: true });
    expect(state.config).toEqual({ actions: true, startReplay: true });
  });

  it("removes every handler it added on cleanup (unmount)", () => {
    const duel = fakeDuel();
    const other = vi.fn();
    duel.events.on("set-ui-menu", other); // someone else's listener survives
    const { ui } = fakeUi();

    const cleanup = bindUiControllerEvents(duel, ui);
    expect(listenerCount(duel.events)).toBeGreaterThan(1);
    cleanup();
    expect(listenerCount(duel.events)).toBe(1);

    duel.events.dispatch("set-ui-menu", { group: "g", type: "t" });
    duel.events.dispatch("set-ui-action", { type: "deck-menu" });
    duel.events.dispatch("enable-game-actions");
    expect(ui.setMenus).not.toHaveBeenCalled();
    expect(ui.setAction).not.toHaveBeenCalled();
    expect(ui.setGameConfig).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
  });

  it("does not stack handlers when remounted for the same duel", () => {
    const duel = fakeDuel();
    const first = fakeUi();
    bindUiControllerEvents(duel, first.ui)();
    const second = fakeUi();
    bindUiControllerEvents(duel, second.ui);

    duel.events.dispatch("set-ui-menu", { group: "g", type: "t" });
    expect(first.ui.setMenus).not.toHaveBeenCalled();
    expect(second.ui.setMenus).toHaveBeenCalledTimes(1);
  });
});
