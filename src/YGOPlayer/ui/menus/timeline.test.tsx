import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { YGOCommandScope, type Command } from "ygo-core";
import { EventBus } from "../../scripts/event-bus";
import type { YGODuelUIEvents } from "../../core/YGODuelUIEvents";
import type { YGODuel } from "../../core/YGODuel";
import { TimeLine } from "./timeline";
import { getCommandClass, sameTimelineRow, subscribeTimeline, timelineSnapshot } from "./timeline/timeline-state";
import { DefaultTimelineCommand } from "./timeline/commands/default-command";
import type { TimelineCommandProps } from "./timeline/types";

const command = (commandId: number, type = "Move Card"): Command =>
  ({ commandId, type, scope: YGOCommandScope.GAME, data: {} }) as unknown as Command;

function fakeDuel(count: number, index: number) {
  const list = Array.from({ length: count }, (_, i) => command(i + 1));
  const commands = {
    index,
    get length() { return list.length; },
    at: (i: number) => list[i],
    map: <T,>(fn: (c: Command, i: number, a: Command[]) => T) => list.map(fn),
  };
  const getCardData = vi.fn(() => null);
  const duel = {
    events: new EventBus<YGODuelUIEvents>(),
    ygo: { commands, state: { getCardData }, options: {}, duelLog: { logs: [] } },
    serverActions: { controls: { goToCommand: vi.fn() } },
  };
  return { duel: duel as unknown as YGODuel, list, commands, getCardData };
}

/** The props the timeline gives each row when `current` is the current command. */
function rowProps(duel: YGODuel, list: Command[], current: number, onCommandClick: (c: Command) => void): TimelineCommandProps[] {
  return list.map((c, index) => ({ duel, command: c, index, commandClass: getCommandClass(index, current), onCommandClick }));
}

describe("timeline rows", () => {
  it("are memoised with sameTimelineRow", () => {
    expect((DefaultTimelineCommand as unknown as { compare: unknown }).compare).toBe(sameTimelineRow);
  });

  it("a step re-renders only the old and the new current row", () => {
    const { duel, list } = fakeDuel(50, 20);
    const onClick = () => {};
    const before = rowProps(duel, list, 20, onClick);
    const after = rowProps(duel, list, 21, onClick);
    const rerendered = before.map((prev, i) => !sameTimelineRow(prev, after[i])).flatMap((changed, i) => (changed ? [i] : []));
    expect(rerendered).toEqual([20, 21]);
  });

  it("a row re-renders when its command is replaced", () => {
    const { duel, list } = fakeDuel(3, 2);
    const onClick = () => {};
    const [prev] = rowProps(duel, list, 2, onClick);
    expect(sameTimelineRow(prev, { ...prev, command: command(99) })).toBe(false);
  });
});

describe("timeline subscription", () => {
  it("snapshot changes only with the current index or the command list", () => {
    const { duel, commands, list } = fakeDuel(4, 1);
    const first = timelineSnapshot(duel);
    expect(timelineSnapshot(duel)).toBe(first);
    commands.index = 2;
    const moved = timelineSnapshot(duel);
    expect(moved).not.toBe(first);
    list.push(command(5));
    expect(timelineSnapshot(duel)).not.toBe(moved);
    list[list.length - 1] = command(6); // undo + a new command: same count
    expect(timelineSnapshot(duel)).not.toBe(moved);
  });

  it("listens to render-ui and unsubscribes cleanly", () => {
    const { duel } = fakeDuel(1, 0);
    const onChange = vi.fn();
    const off = subscribeTimeline(duel, onChange);
    duel.events.dispatch("render-ui");
    duel.events.dispatch("logs-updated", []);
    expect(onChange).toHaveBeenCalledTimes(2);
    off();
    duel.events.dispatch("render-ui");
    duel.events.dispatch("commands-process-completed");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("renders a row per game command with its class", () => {
    const { duel } = fakeDuel(3, 1);
    const html = renderToStaticMarkup(<TimeLine duel={duel} />);
    expect(html.match(/class="command (\w+)"/g)).toEqual([
      'class="command prev"', 'class="command current"', 'class="command next"',
    ]);
  });
});
