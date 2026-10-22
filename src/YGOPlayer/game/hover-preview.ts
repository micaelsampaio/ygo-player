import type { Card } from "ygo-core";
import type { YGODuel } from "../core/YGODuel";

/** Long enough that sweeping the mouse across the board doesn't flicker the Card Info panel. */
const HOVER_DELAY_MS = 120;

let timer: ReturnType<typeof setTimeout> | null = null;

/** A mouse that hovers (not a touch screen, where a tap already selects the card). */
function canHover(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Hovering a card you may see shows it in the Card Info panel, as a click does. The caller says
 * whether the card is visible to this viewer; setSelectedCard still hides an opponent's face-down
 * card.
 */
export function previewCardOnHover(duel: YGODuel, player: number, card: Card | null | undefined) {
  cancelCardPreview();
  if (!card || !canHover()) return;
  timer = setTimeout(() => {
    timer = null;
    duel.gameActions.setSelectedCard({ player, card });
  }, HOVER_DELAY_MS);
}

export function cancelCardPreview() {
  if (timer) clearTimeout(timer);
  timer = null;
}
