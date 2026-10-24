/**
 * Drag and drop from the hand: the pure parts — when a press on a hand card becomes a drag
 * (gesture thresholds), which drop targets a card has given the engine's legal moves for it,
 * which move a drop makes, and how the zone / position prompts that follow are answered with
 * the drop's own zone and position. No three.js, no React.
 *
 * The board side (pointer, glow, the card following the pointer) is core/components/YGOHandDrag;
 * what a drop means comes from a HandDropProvider: Assisted Mode's (ui/hand-drag-assisted.ts)
 * maps it to the engine's moves. A manual-duel provider could plug in the same way.
 */
import { freeZones, LOC_HAND, type PromptData } from "./assist-prompt";
import { samePlace, ygoZoneToPlace, type EnginePlace } from "./assist-zones";

// ---------------------------------------------------------------------------
// Gesture

/** Mouse: the button held and the pointer moved this far (px) — less is a click. */
export const MOUSE_DRAG_PX = 8;
/** Touch: a press held this long (ms) without moving starts a drag. */
export const TOUCH_LONG_PRESS_MS = 250;
/** Touch: a clear upward pull (px) out of the hand starts a drag at once. */
export const TOUCH_PULL_PX = 24;
/** Touch: moving further than this (px) in any other way is a scroll / swipe, not a drag. */
export const TOUCH_SLOP_PX = 10;

export type GestureDecision = "pending" | "drag" | "cancel";

/**
 * What a press on a hand card is so far. `dx`/`dy` are screen pixels from the press (dy < 0 is up),
 * `elapsedMs` the time since it. Mouse: a drag past MOUSE_DRAG_PX. Touch / pen: a long press, or a
 * clear upward pull; any other movement gives the gesture back to the page (scrolling, taps).
 */
export function gestureDecision({ pointerType, dx, dy, elapsedMs }: { pointerType: string; dx: number; dy: number; elapsedMs: number }): GestureDecision {
  const distance = Math.hypot(dx, dy);
  if (pointerType === "mouse") return distance >= MOUSE_DRAG_PX ? "drag" : "pending";
  const upward = -dy > Math.abs(dx);
  if (upward && -dy >= TOUCH_PULL_PX) return "drag";
  if (distance <= TOUCH_SLOP_PX) return elapsedMs >= TOUCH_LONG_PRESS_MS ? "drag" : "pending";
  // Still pulling up (not yet far enough): wait. Sideways or down: the page's gesture.
  return upward ? "pending" : "cancel";
}

// ---------------------------------------------------------------------------
// Targets and moves

/** Where a hand card is dropped: one of your field zones ("M-3", "S2-1", "F"…) or the Set chip. */
export type DropTarget = { kind: "zone"; zone: string } | { kind: "set" };

/** What can be dropped on (lights up while dragging). */
export interface HandDropTargets {
  zones: string[];
  set: boolean;
}

/** A legal move for the dragged card, as the card menu lists it (assist-card-actions.ts). */
export interface DropRow {
  key: string;
  commandType: string;
  data: Readonly<Record<string, unknown>>;
  /** Copies / effects folded into this row (two Activate effects of one card: > 1). */
  count?: number;
}

/** What the drop needs to know about the dragged card. */
export interface DragCardInfo {
  code: number;
  isMonster: boolean;
  isFieldSpell: boolean;
  /** A monster's Level (5+ needs Tributes: occupied zones may become free). */
  level?: number;
}

/** One of your field zones and whether a card is in it. */
export interface DropZoneState {
  zone: string;
  occupied: boolean;
}

export type ZoneKind = "monster" | "spell" | "field" | null;

/** "M-2"/"M2-2" a Main Monster Zone, "S-1" a Spell & Trap Zone, "F"/"F2" the Field Zone (EMZ: none — Normal Summons never go there). */
export function zoneKind(zone: string): ZoneKind {
  const id = zone.split("-")[0].replace(/2$/, "");
  if (id === "M") return "monster";
  if (id === "S") return "spell";
  if (id === "F") return "field";
  return null;
}

const isHandRow = (row: DropRow) => {
  const loc = row.data?.loc;
  return typeof loc !== "number" || (loc & LOC_HAND) !== 0;
};
const rowsOf = (rows: readonly DropRow[], commandType: string) => rows.filter((r) => r.commandType === commandType && isHandRow(r));

/** Which targets light up for this card: only those a drop can turn into one of its legal moves. */
export function dropTargets(card: DragCardInfo, rows: readonly DropRow[], zones: readonly DropZoneState[]): HandDropTargets {
  const out: HandDropTargets = { zones: [], set: false };
  if (card.isMonster) {
    const summon = rowsOf(rows, "Normal Summon").length > 0;
    const set = rowsOf(rows, "Set Monster").length > 0;
    if (!summon && !set) return out;
    // A Tribute Summon frees the zones its Tributes leave: any Main Monster Zone may be offered.
    const tribute = (card.level ?? 0) >= 5;
    out.zones = zones.filter((z) => zoneKind(z.zone) === "monster" && (tribute || !z.occupied)).map((z) => z.zone);
    out.set = set;
    return out;
  }
  const setST = rowsOf(rows, "Set ST").length > 0;
  if (card.isFieldSpell) {
    const activate = rowsOf(rows, "Activate").length > 0;
    // A new Field Spell replaces the old one: the Field Zone takes it either way.
    if (activate || setST) out.zones = zones.filter((z) => zoneKind(z.zone) === "field").map((z) => z.zone);
    out.set = setST;
    return out;
  }
  if (setST) out.zones = zones.filter((z) => zoneKind(z.zone) === "spell" && !z.occupied).map((z) => z.zone);
  out.set = setST;
  return out;
}

/** Where the drop puts the card and face-up / face-down — answers the engine's zone and position questions. */
export interface DropIntent {
  code: number;
  /** The zone dropped on; null for the Set chip (the engine's zone question is left to you). */
  zone: string | null;
  faceDown: boolean;
  /** When the drop was made (ms) — an old intent answers nothing. */
  at: number;
  /** The zone question was answered with it. */
  placed?: boolean;
}

export type DropPlan =
  | { kind: "row"; row: DropRow; intent: Omit<DropIntent, "at"> }
  /** More than one move fits (two Activate effects…): open the card's menu. */
  | { kind: "menu" }
  | { kind: "none" };

function single(rows: DropRow[], zone: string | null, code: number, faceDown: boolean): DropPlan {
  if (rows.length === 0) return { kind: "none" };
  if (rows.length > 1 || (rows[0].count ?? 1) > 1) return { kind: "menu" };
  return { kind: "row", row: rows[0], intent: { code, zone, faceDown } };
}

/**
 * The move a drop makes. Monster on a Monster Zone: Normal Summon (Shift: Set; Set too when that
 * is its only move); on the Set chip: Set. Spell/Trap on a Spell & Trap Zone or the chip: Set.
 * Field Spell on the Field Zone: Activate, else Set. A target that isn't lit makes nothing.
 */
export function planDrop(card: DragCardInfo, rows: readonly DropRow[], target: DropTarget, targets: HandDropTargets, { shift = false } = {}): DropPlan {
  if (target.kind === "set") {
    if (!targets.set) return { kind: "none" };
    return single(rowsOf(rows, card.isMonster ? "Set Monster" : "Set ST"), null, card.code, true);
  }
  if (!targets.zones.includes(target.zone)) return { kind: "none" };
  const kind = zoneKind(target.zone);
  if (card.isMonster) {
    if (kind !== "monster") return { kind: "none" };
    const summon = rowsOf(rows, "Normal Summon");
    const set = rowsOf(rows, "Set Monster");
    if (shift || summon.length === 0) return single(set, target.zone, card.code, true);
    return single(summon, target.zone, card.code, false);
  }
  if (card.isFieldSpell) {
    if (kind !== "field") return { kind: "none" };
    const activate = rowsOf(rows, "Activate");
    if (!shift && activate.length > 0) return single(activate, target.zone, card.code, false);
    return single(rowsOf(rows, "Set ST"), target.zone, card.code, true);
  }
  if (kind !== "spell") return { kind: "none" };
  return single(rowsOf(rows, "Set ST"), target.zone, card.code, true);
}

// ---------------------------------------------------------------------------
// The engine's questions after the drop

/** How long after the drop its zone / position still answer the engine's questions (ms). */
export const DROP_INTENT_TTL_MS = 20_000;

const fresh = (intent: DropIntent | null | undefined, now: number): intent is DropIntent =>
  !!intent && now - intent.at <= DROP_INTENT_TTL_MS;

/**
 * The zone question right after a drop: answered with the zone dropped on — only when it is one
 * of the zones the engine offers (one zone to pick); otherwise null and the question is yours.
 * `me` is the viewer's ygo-core seat (as in zoneHighlights).
 */
export function dropPlaceAnswer(prompt: PromptData | null | undefined, intent: DropIntent | null | undefined, me: number, now: number): EnginePlace | null {
  if (!prompt || prompt.kind !== "place" || (prompt.count || 1) !== 1) return null;
  if (!fresh(intent, now) || intent.placed || !intent.zone) return null;
  const place = ygoZoneToPlace(intent.zone, prompt.player, me);
  if (!place) return null;
  return freeZones(prompt).some((z) => samePlace(z, place)) ? place : null;
}

const POS_FACEUP_ATTACK = 0x1;
const POS_FACEDOWN_DEFENSE = 0x8;

/** The dropped card's position question: face-up Attack for a summon, face-down Defense for a Set — if offered. */
export function dropPositionAnswer(prompt: PromptData | null | undefined, intent: DropIntent | null | undefined, now: number): number | null {
  if (!prompt || prompt.kind !== "position" || !fresh(intent, now)) return null;
  // Only the dropped card's own question (an effect may summon something else in between).
  if (prompt.code !== intent.code) return null;
  const position = intent.faceDown ? POS_FACEDOWN_DEFENSE : POS_FACEUP_ATTACK;
  return ((prompt.positions ?? 0) & position) !== 0 ? position : null;
}

/** Whether an engine answer still belongs to the drop's move (its Tributes, zone, position): any held prompt does. */
export function keepsDropIntent(options: { available?: boolean; pending?: string } | null | undefined): boolean {
  return !!options && options.available === true && options.pending === "prompt";
}

// ---------------------------------------------------------------------------
// Feel

/** The dragged card's lean (radians) from the pointer's horizontal speed (px/s); 0 with reduced motion. */
export function dragTilt(velocityX: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  const max = 0.35;
  return Math.max(-max, Math.min(max, -velocityX / 2500));
}
