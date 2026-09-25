/**
 * Assisted Mode on-field controls: pure placement and labelling helpers for
 * HTML buttons drawn over the 3D board (the position prompt's ATK / DEF
 * choice next to the card). No React / three imports, so it stays
 * unit-testable on its own.
 */

export interface RectLike { left: number; top: number; width: number; height: number }

/**
 * A point in normalized device coordinates (three's Vector3.project) to
 * pixels inside `container`, given where the canvas sits on screen. Null
 * when the point is behind the camera or off the canvas.
 */
export function ndcToContainer(ndc: { x: number; y: number; z: number }, canvas: RectLike, container: RectLike): { x: number; y: number } | null {
  if (ndc.z > 1 || Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return null;
  return {
    x: canvas.left - container.left + ((ndc.x + 1) / 2) * canvas.width,
    y: canvas.top - container.top + ((1 - ndc.y) / 2) * canvas.height,
  };
}

// ocgcore POS_* bits.
const POS_FACEDOWN = 0x2 | 0x8;
const POS_DEFENSE = 0x4 | 0x8;

const SHORT_LABELS: Record<number, string> = { 0x1: "ATK", 0x4: "DEF", 0x2: "Face-down ATK", 0x8: "Set" };

/** Compact label for an on-field position button. */
export function shortPositionLabel(position: number): string {
  return SHORT_LABELS[position] ?? `#${position}`;
}

/** How to draw the little card glyph on a position button: turned sideways for Defense, hatched when face-down. */
export function positionGlyph(position: number): { sideways: boolean; faceDown: boolean } {
  return { sideways: (position & POS_DEFENSE) !== 0, faceDown: (position & POS_FACEDOWN) !== 0 };
}
