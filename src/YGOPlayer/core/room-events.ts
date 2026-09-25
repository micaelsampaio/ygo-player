/**
 * Room-scoped requests to ygo-socket-server that don't go through ygo-core's
 * command stream, and the events the server answers with. The player sends
 * them through its YGOClient (no acks), so every answer arrives as an event
 * with the room's id; YGOServerActions turns them into duel events.
 *
 * Server side: handlers/puzzle.handler.ts (puzzle:*), room.handler.ts
 * (duel:preferences:set) and handlers/deckSearch.handler.ts (duel:deck:*).
 */

/** Server event → the duel event (duel.events) it is dispatched as. */
export const ROOM_EVENTS: Readonly<Record<string, string>> = {
  "puzzle:state": "puzzle-state",
  "duel:preferences": "duel-preferences",
  "duel:deck:contents": "deck-search-contents",
  "duel:deck:taken": "deck-search-taken",
};

/**
 * The duel event for a server event, or null when it isn't one of these or
 * it's about another room.
 */
export function roomEventFor(eventName: string, data: unknown, roomId: unknown): string | null {
  const duelEvent = ROOM_EVENTS[eventName];
  if (!duelEvent) return null;
  const eventRoom = (data as { roomId?: unknown } | null)?.roomId;
  if (typeof roomId === "string" && typeof eventRoom === "string" && eventRoom !== roomId) return null;
  return duelEvent;
}

/** The room this duel is played in (rules.roomId, see ygo-socket-server buildGameRules). */
export function duelRoomId(options: unknown): string | null {
  const roomId = (options as { roomId?: unknown } | null | undefined)?.roomId;
  return typeof roomId === "string" && roomId ? roomId : null;
}
