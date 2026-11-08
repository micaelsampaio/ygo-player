import type { YGODuelEvents } from "ygo-core";
import type { YGODuel } from "../../../core/YGODuel";

type LoggedDuel = Pick<YGODuel, "events"> & { ygo?: { duelLog?: { logs?: YGODuelEvents.DuelLog[] } } };

/**
 * Calls `onLogs` with the duel's log list now (when it has any) and on every "logs-updated";
 * returns the unsubscribe. The list is YGODuelLog's own array, updated in place. Now: a server
 * duel opened again (a refresh) replays its commands before the log menu mounts, so their logs
 * were already sent and the menu showed none until the next move.
 */
export function subscribeDuelLogs(duel: LoggedDuel, onLogs: (logs: YGODuelEvents.DuelLog[]) => void): () => void {
  duel.events.on("logs-updated", onLogs);
  const current = duel.ygo?.duelLog?.logs;
  if (current?.length) onLogs(current);
  return () => duel.events.off("logs-updated", onLogs);
}
