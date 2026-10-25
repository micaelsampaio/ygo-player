/**
 * Double-click / double-tap detection for the board's cards and piles (Assisted Mode's quick
 * action, ui/quick-action.ts). Built on click events, which a tap also fires, so mouse and touch
 * share one path. Pure — no DOM, no three.js.
 */

/** Two clicks within this many ms on the same target are a double-click. */
export const DOUBLE_TAP_MS = 300;
/** …and within this many px of each other (a finger lands a little apart each time). */
export const DOUBLE_TAP_SLOP_PX = 16;
/** How long a card with a quick action waits before opening its menu (a second click cancels it). */
export const QUICK_ACTION_MENU_DELAY_MS = 250;

export interface DoubleTapDetector {
  /** Records a click on `target` at (x, y); true when it completes a double-click. */
  tap(target: unknown, x: number, y: number, now: number): boolean;
  reset(): void;
}

export function createDoubleTapDetector({ windowMs = DOUBLE_TAP_MS, slopPx = DOUBLE_TAP_SLOP_PX }: { windowMs?: number; slopPx?: number } = {}): DoubleTapDetector {
  let last: { target: unknown; x: number; y: number; at: number } | null = null;
  return {
    tap(target, x, y, now) {
      const prev = last;
      const isDouble = !!prev && prev.target === target && now - prev.at <= windowMs && now >= prev.at
        && Math.hypot(x - prev.x, y - prev.y) <= slopPx;
      // The click that completes a double starts nothing: a third click is a new first click.
      last = isDouble ? null : { target, x, y, at: now };
      return isDouble;
    },
    reset() {
      last = null;
    },
  };
}

/**
 * How long a single click waits before opening the card's menu: the double-click window when the
 * card has a quick action (so a double-click doesn't flash the menu first), else at once.
 */
export function menuOpenDelay({ enabled, hasQuickAction }: { enabled: boolean; hasQuickAction: boolean }): number {
  return enabled && hasQuickAction ? QUICK_ACTION_MENU_DELAY_MS : 0;
}
