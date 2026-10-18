import type { YGODuelEvents } from "ygo-core";
import type { YGODuel } from "../../../core/YGODuel";

/**
 * Calls `onLogs` with the duel's log list on every "logs-updated"; returns
 * the unsubscribe. The list is YGODuelLog's own array, updated in place.
 */
export function subscribeDuelLogs(duel: Pick<YGODuel, "events">, onLogs: (logs: YGODuelEvents.DuelLog[]) => void): () => void {
  duel.events.on("logs-updated", onLogs);
  return () => duel.events.off("logs-updated", onLogs);
}
