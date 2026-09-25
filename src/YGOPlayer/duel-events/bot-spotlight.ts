import * as THREE from "three";
import { YGOGameUtils } from "ygo-core";
import type { YGODuel } from "../core/YGODuel";
import { YGOTaskSequence } from "../core/components/tasks/YGOTaskSequence";
import type { YGOTask } from "../core/components/tasks/YGOTask";
import { createHighlightFrame, disposeHighlightFrame, placeHighlightFrame } from "../game/meshes/highlight-frame";
import { getGameZone } from "../scripts/ygo-utils";
import { CallbackTransition } from "./utils/callback";
import { MaterialOpacityTransition } from "./utils/material-opacity";
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
/** Glow shown alone before the activation starts. */
export const BOT_SPOTLIGHT_BEAT = 0.45;
/** How long the glow stays once the activation is playing. */
const SPOTLIGHT_HOLD = 0.5;
const FADE_IN = 0.15;
const FADE_OUT = 0.25;

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

function findSpotlightTarget(duel: YGODuel, id: number, zone: string | undefined): THREE.Object3D | null {
  if (!zone) return null;
  const zoneData = YGOGameUtils.getZoneData(zone as any);
  const field = duel.fields[zoneData.player];
  if (!field) return null;
  if (zoneData.zone === "H") {
    const card = field.hand.getCardFromCardIdAnZoneIndex(id, zoneData.zoneIndex - 1) ?? field.hand.getCardFromCardId(id);
    return card?.gameObject ?? null;
  }
  return getGameZone(duel, zoneData)?.getGameCard()?.gameObject ?? null;
}

/**
 * Glows the card, waits a beat, then calls `onReady` (the activation's own
 * animation) and fades the glow out while it plays. Returns a cancel that
 * takes the glow down and drops `onReady` (the handler was skipped).
 */
export function startBotSpotlight(
  { duel, startTask }: { duel: YGODuel; startTask: (task: YGOTask) => void },
  event: { id: number; originZone?: string; zone?: string },
  onReady: () => void,
): () => void {
  let cancelled = false;
  let frame: THREE.Mesh | null = null;
  const dispose = () => {
    if (frame) disposeHighlightFrame(duel.core.scene, frame);
    frame = null;
  };
  const ready = new CallbackTransition(() => { if (!cancelled) onReady(); });

  const target = findSpotlightTarget(duel, event.id, spotlightZone(event));
  if (!target) {
    startTask(new YGOTaskSequence(new WaitForSeconds(BOT_SPOTLIGHT_BEAT), ready));
  } else {
    frame = createHighlightFrame(target, 0);
    placeHighlightFrame(frame, target);
    duel.core.scene.add(frame);
    const material = frame.material as THREE.Material;
    startTask(new YGOTaskSequence(
      new MaterialOpacityTransition({ material, opacity: 1, duration: FADE_IN }),
      new WaitForSeconds(BOT_SPOTLIGHT_BEAT),
      ready,
      new WaitForSeconds(SPOTLIGHT_HOLD),
      new MaterialOpacityTransition({ material, opacity: 0, duration: FADE_OUT }),
      new CallbackTransition(dispose),
    ));
  }

  return () => {
    cancelled = true;
    dispose();
  };
}
