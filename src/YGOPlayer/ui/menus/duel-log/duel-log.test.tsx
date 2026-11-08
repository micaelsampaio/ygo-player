import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { YGODuelEvents } from "ygo-core";
import { EventBus } from "../../../scripts/event-bus";
import type { YGODuelUIEvents } from "../../../core/YGODuelUIEvents";
import type { YGODuel } from "../../../core/YGODuel";
import { subscribeDuelLogs } from "./duel-log-subscription";
import { DefaultLogRow } from "./default-log";
import { isPartOfItsActivation, isSetByMove } from "./duel-log";
import { DuelPerspectiveContext } from "../../duel-perspective";

const duelWithBus = () => ({ events: new EventBus<YGODuelUIEvents>() });

describe("duel log subscription", () => {
  it("passes the core's own log array (no copy) and stops on cleanup", () => {
    const duel = duelWithBus();
    const onLogs = vi.fn();
    const off = subscribeDuelLogs(duel, onLogs);
    const logs: YGODuelEvents.DuelLog[] = [{ type: YGODuelEvents.LogType.Note, player: 0, commandId: 1 }];

    duel.events.dispatch("logs-updated", logs);
    expect(onLogs).toHaveBeenCalledWith(logs);
    expect(onLogs.mock.calls[0][0]).toBe(logs);

    off();
    duel.events.dispatch("logs-updated", logs);
    expect(onLogs).toHaveBeenCalledTimes(1);
  });
});

describe("duel log subscription, opened again", () => {
  it("passes the logs the duel already has (a refresh replayed them before the menu mounted)", () => {
    const logs: YGODuelEvents.DuelLog[] = [{ type: YGODuelEvents.LogType.Note, player: 0, commandId: 1 }];
    const duel = { ...duelWithBus(), ygo: { duelLog: { logs } } };
    const onLogs = vi.fn();
    subscribeDuelLogs(duel, onLogs);
    expect(onLogs).toHaveBeenCalledWith(logs);
  });
});

describe("DefaultLogRow", () => {
  const perspective = { getPlayerCssIndex: (p: number) => p };
  const render = (log: Parameters<typeof DefaultLogRow>[0]["log"], card: object | null) => {
    const ygo = { state: { getCardData: vi.fn(() => card) } };
    const duel = { createCdnUrl: (p: string) => p, events: { dispatch: vi.fn() }, gameActions: { setSelectedCard: vi.fn() } };
    const html = renderToStaticMarkup(
      <DuelPerspectiveContext.Provider value={perspective as never}>
        <DefaultLogRow log={log} duel={duel as unknown as YGODuel} ygo={ygo as never} />
      </DuelPerspectiveContext.Provider>,
    );
    return { html, getCardData: ygo.state.getCardData };
  };

  it("shows just the type when the log has no card", () => {
    const { html, getCardData } = render({ type: YGODuelEvents.LogType.ShuffleDeck, player: 0, commandId: 1 }, null);
    expect(html).toContain("Shuffle Deck");
    expect(getCardData).not.toHaveBeenCalled();
  });

  it("shows the card and both zones of a move", () => {
    const card = { name: "Dark Magician", images: { small_url: "dm.jpg" } };
    const { html } = render({ type: "Send To GY", player: 0, commandId: 2, id: 46986414, originZone: "M-1", zone: "GY" }, card);
    expect(html).toContain("Dark Magician");
    expect(html).toContain("dm.jpg");
    expect(html).toContain("ygo-icon-game-zone-arrow");
  });
});

describe("isRevealOfItsToHand", () => {
  it("hides a search's reveal right after its To Hand, nothing else", async () => {
    const { isRevealOfItsToHand } = await import("./duel-log");
    const logs = [
      { type: "To Hand", id: 1 },
      { type: "Reveal", id: 1 },
      { type: "Reveal", id: 1 },
      { type: "To Hand", id: 2 },
      { type: "Reveal", id: 3 },
    ] as any[];
    expect(logs.map((_, i) => isRevealOfItsToHand(logs, i))).toEqual([false, true, false, false, false]);
  });
});

describe("isPartOfItsActivation", () => {
  it("hides a Spell's move to its zone right before it activates there, and a Set card's flip right after", async () => {
    const { isPartOfItsActivation } = await import("./duel-log");
    const logs = [
      { type: "Move Card", id: 6153210, originZone: "H-1", zone: "S-1" }, // Ketu Dracotail from the hand
      { type: "Activate", id: 6153210, originZone: "H-1", zone: "S-1" },
      { type: "Activate", id: 5431722, zone: "S-2" }, // Dracotail Flame, Set
      { type: "Change Card Position", id: 5431722, originZone: "S-2" },
      { type: "Send To GY", id: 5431722, originZone: "S-2", zone: "GY" },
    ] as any[];
    expect(logs.map((_, i) => isPartOfItsActivation(logs, i))).toEqual([true, false, false, true, false]);
  });

  it("keeps a move or flip that isn't that card's activation", async () => {
    const { isPartOfItsActivation } = await import("./duel-log");
    const logs = [
      { type: "Move Card", id: 1, originZone: "H-1", zone: "S-1" },
      { type: "Activate", id: 2, zone: "S-3" }, // another card
      { type: "Change Card Position", id: 3, originZone: "M-1" }, // not right after its activation
      { type: "Move Card", id: 4, originZone: "H-2", zone: "S-4" },
      { type: "Activate", id: 4, zone: "S-5" }, // activated somewhere else
    ] as any[];
    expect(logs.map((_, i) => isPartOfItsActivation(logs, i))).toEqual([false, false, false, false, false]);
  });
});

describe("isSetByMove", () => {
  const move = { type: YGODuelEvents.LogType.MoveCard, player: 0, commandId: 1, id: 7, originZone: "GY", zone: "S-2", position: "faceup" };
  const flip = { type: YGODuelEvents.LogType.ChangeCardPosition, player: 0, commandId: 2, id: 7, originZone: "S-2", position: "facedown" };
  const logs = (...l: object[]) => l as YGODuelEvents.DuelLog[];

  it("folds an effect's Set (move face-up, then flip face-down) into the move", () => {
    expect(isSetByMove(logs(move, flip), 0)).toBe(true);
  });
  it("leaves a move and flip of different cards or zones as they are", () => {
    expect(isSetByMove(logs(move, { ...flip, id: 8 }), 0)).toBe(false);
    expect(isSetByMove(logs(move, { ...flip, originZone: "S-3" }), 0)).toBe(false);
    expect(isSetByMove(logs(move, { ...flip, position: "faceup" }), 0)).toBe(false);
    expect(isSetByMove(logs(move), 0)).toBe(false);
  });
});
