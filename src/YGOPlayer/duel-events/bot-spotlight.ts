import type { YGODuel } from "../core/YGODuel";
import { YGOTaskSequence } from "../core/components/tasks/YGOTaskSequence";
import type { YGOTask } from "../core/components/tasks/YGOTask";
import { CallbackTransition } from "./utils/callback";
import { WaitForSeconds } from "./utils/wait-for-seconds";

/**
 * Bot duels: the bot's activations get a spotlight, a brief amber glow on
 * the card (the Assisted Mode panel's frame) and a beat before the
 * activation plays, so a bot move, and especially its chain response to
 * the human's own action, reads as its own moment instead of blending
 * into what came before. ygo-socket-server tags those ActivateCardCommands
 * with `source: "bot"` (bot-duel/botPacing.ts). All timings are task
 * seconds, so the viewer's game speed setting scales them.
 */
export const BOT_COMMAND_SOURCE = "bot";
/** The pause before the bot's activation starts. */
export const BOT_SPOTLIGHT_BEAT = 0.45;

interface CommandLike { type?: string; commandId?: number; data?: any }

/** An ActivateCardCommand the server tagged as the bot's. */
export function isBotActivation(command: CommandLike | null | undefined): boolean {
  return command?.type === "ActivateCardCommand" && command.data?.source === BOT_COMMAND_SOURCE;
}

/** Where the activated card sits when the spotlight starts: where it's played from, if it moves. */
export function spotlightZone(event: { originZone?: string; zone?: string }): string | undefined {
  return event.originZone || event.zone;
}

const pending = new WeakMap<object, Set<number>>();

/** Called as each server command arrives: remembers the bot's activations by command id. */
export function markBotActivation(duel: object, command: CommandLike): void {
  if (!isBotActivation(command) || typeof command.commandId !== "number") return;
  let ids = pending.get(duel);
  if (!ids) pending.set(duel, ids = new Set());
  ids.add(command.commandId);
}

/** True (once) when this activation log belongs to a bot activation marked above. */
export function takeBotActivation(duel: object, commandId: number | undefined): boolean {
  const ids = pending.get(duel);
  if (commandId === undefined || !ids?.has(commandId)) return false;
  ids.delete(commandId);
  return true;
}

/**
 * Waits a beat before the bot's activation plays (`onReady`), so it doesn't
 * land the instant the previous move ends. No frame on the bot's card: the
 * borders mark only the player's own options. Returns a cancel that drops
 * `onReady` (the handler was skipped).
 */
export function startBotSpotlight(
  { startTask }: { duel: YGODuel; startTask: (task: YGOTask) => void },
  _event: { id: number; originZone?: string; zone?: string },
  onReady: () => void,
): () => void {
  let cancelled = false;
  startTask(new YGOTaskSequence(new WaitForSeconds(BOT_SPOTLIGHT_BEAT), new CallbackTransition(() => { if (!cancelled) onReady(); })));
  return () => {
    cancelled = true;
  };
}
