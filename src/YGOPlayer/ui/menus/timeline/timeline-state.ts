import type { YGODuel } from "../../../core/YGODuel";
import type { TimelineCommandClass, TimelineCommandProps } from "./types";

/** The events after which the command index or the command list may have changed. */
const TIMELINE_EVENTS = ["render-ui", "logs-updated", "commands-process-completed"] as const;

/** Calls `onChange` whenever the timeline may have moved; returns the unsubscribe. */
export function subscribeTimeline(duel: Pick<YGODuel, "events">, onChange: () => void): () => void {
  TIMELINE_EVENTS.forEach(event => duel.events.on(event, onChange));
  return () => TIMELINE_EVENTS.forEach(event => duel.events.off(event, onChange));
}

/**
 * What the timeline shows, as one comparable value: the current command
 * index, the command count and the last command (an undo + new command
 * keeps the count).
 */
export function timelineSnapshot(duel: Pick<YGODuel, "ygo">): string {
  const commands = duel.ygo?.commands;
  if (!commands) return "";
  return `${commands.index}:${commands.length}:${commands.at(commands.length - 1)?.commandId ?? -1}`;
}

export function getCommandClass(index: number, currentCommand: number): TimelineCommandClass {
  if (index === currentCommand) return "current";
  if (index < currentCommand) return "prev";
  return "next";
}

/**
 * Same row: the timeline passes a stable `onCommandClick`, so a row re-renders
 * only when its command, position or class changes.
 */
export function sameTimelineRow(prev: TimelineCommandProps, next: TimelineCommandProps): boolean {
  return prev.command === next.command
    && prev.commandClass === next.commandClass
    && prev.index === next.index
    && prev.duel === next.duel
    && prev.onCommandClick === next.onCommandClick;
}
