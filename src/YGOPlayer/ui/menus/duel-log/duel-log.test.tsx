import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { YGODuelEvents } from "ygo-core";
import { EventBus } from "../../../scripts/event-bus";
import type { YGODuelUIEvents } from "../../../core/YGODuelUIEvents";
import type { YGODuel } from "../../../core/YGODuel";
import { subscribeDuelLogs } from "./duel-log-subscription";
import { DefaultLogRow } from "./default-log";
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
