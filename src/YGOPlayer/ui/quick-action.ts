/**
 * Assisted Mode: double-click (double-tap) for the quick action. A double-click on one of your
 * cards runs the move domain/default-action.ts picks from the engine's legal moves for it (the
 * rows its card menu lists), sent like a card-menu pick ("assist-choose-row"); while the engine
 * asks for a card, it picks that candidate instead (YGOAssistController.promptDoublePick).
 *
 * A single click still opens the card menu: at once, or — when the card has a quick action —
 * after the double-click window, so a double-click doesn't flash the menu first.
 */
import * as THREE from "three";
import { YGOGameUtils, type Card } from "ygo-core";
import type { YGODuel } from "../core/YGODuel";
import { handDragAvailable } from "../core/components/YGOHandDrag";
import { prefersReducedMotion } from "../duel-events/utils/battle-fx";
import { quickActionRow, type QuickActionPlace } from "../domain/default-action";
import { createDoubleTapDetector, menuOpenDelay, type DoubleTapDetector } from "../domain/double-tap";
import { zoneToLocation } from "../domain/assist-routing";
import { doubleClickPosition, LOC_MZONE } from "../domain/assist-prompt";
import { cardActionRows, type CardActionRow } from "./assist-card-actions";
import { sectionsFor } from "./assist-sections";

interface QuickState {
  taps: DoubleTapDetector;
  menuTimer: ReturnType<typeof setTimeout> | undefined;
}

const states = new WeakMap<object, QuickState>();

function stateOf(duel: YGODuel): QuickState {
  let state = states.get(duel);
  if (!state) {
    state = { taps: createDoubleTapDetector(), menuTimer: undefined };
    states.set(duel, state);
  }
  return state;
}

/** Assisted duels for the local player with the "Double-click for the quick action" setting on. */
export function quickActionEnabled(duel: YGODuel): boolean {
  return handDragAvailable(duel) && duel.settings?.getConfigFromPath?.("doubleClickAction") !== false;
}

/** Records a click on `target`; true when it completes a double-click (always false when off). */
export function registerTap(duel: YGODuel, target: unknown, event: { clientX?: number; clientY?: number }): boolean {
  if (!quickActionEnabled(duel)) return false;
  return stateOf(duel).taps.tap(target, event.clientX ?? 0, event.clientY ?? 0, Date.now());
}

/** A card menu waiting out the double-click window is dropped. */
export function cancelPendingMenu(duel: YGODuel) {
  const state = states.get(duel);
  if (!state) return;
  clearTimeout(state.menuTimer);
  state.menuTimer = undefined;
}

/** Opens a card's menu now, or after the double-click window when it has a quick action. */
export function openMenuAfterTap(duel: YGODuel, hasQuickAction: boolean, open: () => void) {
  cancelPendingMenu(duel);
  const delay = menuOpenDelay({ enabled: quickActionEnabled(duel), hasQuickAction });
  if (delay <= 0) { open(); return; }
  const state = stateOf(duel);
  state.menuTimer = setTimeout(() => {
    state.menuTimer = undefined;
    // The second press became a drag from the hand: no menu over it.
    if (duel.handDrag?.isDragging?.()) return;
    open();
  }, delay);
}

function opponentMonsters(duel: YGODuel): number {
  const opp = duel.perspective.playerIndex === 0 ? 1 : 0;
  const field = duel.ygo?.state?.fields?.[opp];
  if (!field) return 0;
  return [...(field.monsterZone ?? []), ...(field.extraMonsterZone ?? [])].filter(Boolean).length;
}

/** Battle Phase: the Attack row of the monster in `zone` (Attack rows name the card by code only). */
function attackRows(duel: YGODuel, code: number, zone: string): CardActionRow[] {
  const result = duel.assistController.options;
  if (!result?.available || result.pending !== "battle") return [];
  const where = zoneToLocation(zone);
  if (!where || where.loc !== LOC_MZONE) return [];
  const attackable = result.options?.attackable ?? [];
  if (!attackable.some((ref) => ref.code === code && (ref.loc & LOC_MZONE) !== 0 && (where.seq === null || ref.seq === where.seq))) return [];
  return sectionsFor(duel, result).flatMap((s) => s.rows)
    .filter((row) => row.commandType === "Attack" && row.code === code)
    .map((row) => ({ key: row.key, label: "Attack", commandType: row.commandType, data: row.data, count: row.count }));
}

/** The move a double-click on your card in `zone` runs right now, or null. */
export function quickActionFor(duel: YGODuel, card: Card | null | undefined, zone: string, place: QuickActionPlace, player: number): CardActionRow | null {
  if (!card || !quickActionEnabled(duel) || !duel.perspective.isPlayer(player)) return null;
  const result = duel.assistController.options;
  if (!result?.available) return null;
  const rows = cardActionRows(duel, result, card.id, zone);
  if (place === "field" && result.pending === "battle") rows.push(...attackRows(duel, card.id, zone));
  return quickActionRow(rows, {
    pending: result.pending,
    place,
    isMonster: !!YGOGameUtils.isMonster(card),
    opponentMonsters: opponentMonsters(duel),
  });
}

const SUMMONS = new Set(["Normal Summon", "Special Summon", "Set Monster"]);

/**
 * Sends the quick action the way a card-menu pick is sent (the options panel's choose path). A
 * summon from the hand (`fromHand`: the card's code) carries a drop intent with no zone, like a
 * drag-and-drop summon: the card's own position question is then answered face-up Attack (Set:
 * face-down Defense) when offered (domain/hand-drag.ts dropPositionAnswer); its zone stays yours.
 */
export function runQuickAction(duel: YGODuel, row: CardActionRow, { fromHand }: { fromHand?: number } = {}) {
  cancelPendingMenu(duel);
  duel.actionManager.clearAction();
  duel.events.dispatch("clear-ui-action");
  const drop = fromHand !== undefined && SUMMONS.has(row.commandType)
    ? { code: fromHand, zone: null, faceDown: row.commandType === "Set Monster" }
    : undefined;
  duel.events.dispatch("assist-choose-row", { key: row.key, commandType: row.commandType, data: row.data, ...(drop ? { drop } : {}) });
}

/** The engine asks the position of the card with `code`, and a double-click on it can answer (doubleClickPosition). */
export function positionPromptFor(duel: YGODuel, code: number | undefined): boolean {
  const result = duel.assistController.options;
  if (code === undefined || !quickActionEnabled(duel) || !result?.available || result.pending !== "prompt") return false;
  const prompt = result.prompt;
  return prompt?.kind === "position" && prompt.code === code && doubleClickPosition(prompt.positions) !== null;
}

/** A brief scale pulse on a card on the board (none with reduced motion). */
export function pulseObject(object: THREE.Object3D | null | undefined, { durationMs = 240, amount = 0.12 } = {}) {
  if (!object || prefersReducedMotion() || typeof requestAnimationFrame !== "function") return;
  const base = object.scale.clone();
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    object.scale.copy(base).multiplyScalar(1 + amount * Math.sin(Math.PI * t));
    if (t < 1) requestAnimationFrame(step);
    else object.scale.copy(base);
  };
  requestAnimationFrame(step);
}

/** The same pulse on a card in a pile list (CSS: .ygo-card-quick-pulse, off with reduced motion). */
export function pulseElement(element: Element | null | undefined) {
  if (!element) return;
  element.classList.remove("ygo-card-quick-pulse");
  // Restart the animation when it's still running.
  void (element as HTMLElement).offsetWidth;
  element.classList.add("ygo-card-quick-pulse");
  setTimeout(() => element.classList.remove("ygo-card-quick-pulse"), 400);
}
