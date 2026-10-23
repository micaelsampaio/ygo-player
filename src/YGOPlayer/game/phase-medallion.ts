/**
 * Pure helpers for the Master Duel–style turn/phase medallion on the field
 * (game/YGOPhaseObject.ts): face wording, palette and the flip/pulse curves.
 * No three / DOM imports so they can be unit-tested directly.
 */

/** Short face word per ygo-core YGODuelPhase value. */
export const MEDALLION_PHASE_WORDS: Record<string, string> = {
  "Draw": "Draw",
  "Standby": "Standby",
  "Main Phase 1": "Main 1",
  "Battle": "Battle",
  "Main Phase 2": "Main 2",
  "End": "End",
};

export function medallionPhaseWord(phase: string | null | undefined): string {
  if (!phase) return "";
  return MEDALLION_PHASE_WORDS[phase] ?? phase;
}

export function isBattlePhase(phase: string | null | undefined): boolean {
  return phase === "Battle";
}

export interface MedallionPalette {
  /** Inner face radial gradient, centre → edge. */
  faceInner: string;
  faceMid: string;
  faceOuter: string;
  /** Thin accent ring just inside the gold rim. */
  accent: string;
  /** Glow ring tint (hex for THREE.Color). */
  glow: number;
}

const BLUE_PALETTE: MedallionPalette = {
  faceInner: "#3d8bff",
  faceMid: "#1849b8",
  faceOuter: "#081a4f",
  accent: "#8fd0ff",
  glow: 0x4aa8ff,
};

const RED_PALETTE: MedallionPalette = {
  faceInner: "#ff5a4a",
  faceMid: "#b51b1b",
  faceOuter: "#4a0707",
  accent: "#ffb09a",
  glow: 0xff3b2f,
};

/** Blue face when the turn player is the viewer's side (bottom), red otherwise. */
export function medallionPalette(isViewerTurn: boolean): MedallionPalette {
  return isViewerTurn ? BLUE_PALETTE : RED_PALETTE;
}

/** Battle-phase glow tint, independent of whose turn it is. */
export const BATTLE_GLOW_COLOR = 0xff2a1a;

/** What changed between two medallion states → which animation to play. */
export type MedallionChange = "none" | "phase" | "turn";

export function medallionChange(
  prev: { turn: number; turnPlayer: number; phase: string } | null,
  next: { turn: number; turnPlayer: number; phase: string },
): MedallionChange {
  if (!prev) return "none";
  if (prev.turn !== next.turn || prev.turnPlayer !== next.turnPlayer) return "turn";
  if (prev.phase !== next.phase) return "phase";
  return "none";
}

/** Flip timings (seconds) and how many half-turns each spins. */
export const FLIP_PHASE = { duration: 0.35, halfTurns: 1 } as const;
export const FLIP_TURN = { duration: 0.6, halfTurns: 2 } as const;

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

/**
 * Coin-flip state at normalised progress t∈[0,1] for `halfTurns` half-turns.
 * The raw spin goes 0 → halfTurns·π (eased); `angle` is folded into
 * (-π/2, π/2] so the printed face is always the one facing the camera, and
 * `swapped` turns true once the coin has passed edge-on (90°) for the first
 * time — that's when the new texture must be shown.
 */
export function flipState(t: number, halfTurns: number): { angle: number; swapped: boolean } {
  const p = clamp01(t);
  const spin = easeOutCubic(p) * halfTurns * Math.PI;
  const swapped = spin >= Math.PI / 2;
  // Fold so 0 → 0, π/2 → ±π/2 (edge), π → 0 again, etc.
  let angle = ((spin + Math.PI / 2) % Math.PI) - Math.PI / 2;
  if (p >= 1) angle = 0;
  return { angle, swapped };
}

/** Scale multiplier for the brief pop: 1 → 1+amount → 1 over t∈[0,1]. */
export function pulseScale(t: number, amount = 0.12): number {
  const p = clamp01(t);
  return 1 + Math.sin(p * Math.PI) * amount;
}

/** Glow-ring opacity after a change: flashes in fast, fades out. */
export function flashOpacity(t: number, peak = 0.9): number {
  const p = clamp01(t);
  if (p < 0.2) return (p / 0.2) * peak;
  return (1 - (p - 0.2) / 0.8) * peak;
}

/** Steady battle glow: oscillates between min and max with a ~1.4s period. */
export function battleGlowOpacity(timeSeconds: number, min = 0.25, max = 0.6, period = 1.4): number {
  const s = (Math.sin((timeSeconds / period) * Math.PI * 2) + 1) / 2;
  return min + (max - min) * s;
}

/** Canvas backing size for a logical 512px texture, scaled by DPR (capped at 2×). */
export function medallionCanvasSize(devicePixelRatio: number | undefined, logical = 512): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio! > 0 ? devicePixelRatio! : 1;
  return Math.round(logical * Math.min(Math.max(dpr, 1), 2));
}

export const MEDALLION_FONT_FAMILY = `"Barlow Condensed", "Arial Narrow", sans-serif`;
