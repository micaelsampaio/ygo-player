/** Pure helpers for the Master Duel-style player HUD (no React imports, unit-testable). */

/** LP as Master Duel prints it: a plain whole number, never negative ("8000", not "8,000"). */
export function formatLifePoints(lp: number | undefined | null): string {
  if (typeof lp !== "number" || !Number.isFinite(lp)) return "0";
  return String(Math.max(0, Math.round(lp)));
}

/** The letter shown inside the hexagonal avatar frame: the name's first letter or digit, "?" without one. */
export function playerInitial(name: string | undefined | null): string {
  const match = (name ?? "").trim().match(/[\p{L}\p{N}]/u);
  return match ? match[0].toLocaleUpperCase() : "?";
}
