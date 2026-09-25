import type { KeyboardEvent, SyntheticEvent } from "react";
import { isActivationKey } from "./a11y";

/**
 * Pile menus (graveyard, banished, extra deck, view deck) list cards; activating one opens that
 * card's action menu. From the mouse the menu opens at the pointer; from the keyboard there is no
 * pointer, so it opens beside the card that was activated.
 */

export interface MenuSize {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface AnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface MenuPosition {
  left: number;
  top: number;
}

interface PointerLike {
  clientX?: unknown;
  clientY?: unknown;
  detail?: unknown;
}

/**
 * True when the event carries a real pointer position. A click fired from the keyboard (Enter or
 * Space on a focused element) has `detail === 0` and a 0,0 position; a keydown has no position.
 */
export function hasPointerPosition(event: PointerLike | null | undefined): event is { clientX: number; clientY: number } {
  if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") return false;
  return !(event.detail === 0 && event.clientX === 0 && event.clientY === 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

/** The menu's top-left at the pointer, kept inside the viewport. */
export function placeAtPoint(x: number, y: number, size: MenuSize, viewport: Viewport): MenuPosition {
  return {
    left: clamp(x, 0, viewport.width - size.width),
    top: clamp(y, 0, viewport.height - size.height),
  };
}

/** Beside the card: to its right, or to its left when there is no room, top-aligned with it. */
export function placeBesideRect(rect: AnchorRect, size: MenuSize, viewport: Viewport, gap = 4): MenuPosition {
  const fitsRight = rect.right + gap + size.width <= viewport.width;
  const left = fitsRight ? rect.right + gap : rect.left - gap - size.width;
  return {
    left: clamp(left, 0, viewport.width - size.width),
    top: clamp(rect.top, 0, viewport.height - size.height),
  };
}

/** Where a card menu opened by `event` on `element` goes. */
export function anchorCardMenu(
  event: PointerLike | null | undefined,
  element: { getBoundingClientRect(): AnchorRect } | null | undefined,
  size: MenuSize,
  viewport: Viewport,
): MenuPosition {
  if (hasPointerPosition(event)) return placeAtPoint(event.clientX, event.clientY, size, viewport);
  if (element) return placeBesideRect(element.getBoundingClientRect(), size, viewport);
  return placeAtPoint((viewport.width - size.width) / 2, (viewport.height - size.height) / 2, size, viewport);
}

/**
 * Props that make a card in a pile list reachable and openable from the keyboard: focusable,
 * announced as a button with the card's name, and Enter/Space run `open` with the key event.
 * The key event stops here so the duel's own Space shortcut (play/pause) doesn't also fire.
 */
export function pileCardProps<T extends Element>(open: (event: SyntheticEvent<T>) => void, label: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    "aria-haspopup": "menu" as const,
    onKeyDown: (event: KeyboardEvent<T>) => {
      if (event.target !== event.currentTarget || !isActivationKey(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      open(event);
    },
  };
}
