/**
 * Builds the `value` string for ygo-core's LifePointsTransactionCommand,
 * which evaluates `createExpression(lp, value)`: a value starting with an
 * operator is appended to the current LP ("-500" → lp-500, "/2" → lp/2),
 * anything else is added ("500" → lp+500). No React imports so it stays
 * unit-testable.
 */
export type LifePointsMode = "damage" | "gain" | "set";

export const LP_MAX = 999_999;

/** Parses the popover's amount field: a whole, non-negative number. */
export function parseLifePointsAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  if (!Number.isSafeInteger(amount) || amount > LP_MAX) return null;
  return amount;
}

export function lifePointsValue(mode: LifePointsMode, amount: number, currentLp: number): string {
  switch (mode) {
    case "damage":
      return `-${amount}`;
    case "gain":
      return `+${amount}`;
    case "set":
      // lp - lp + amount → amount
      return `-${currentLp}+${amount}`;
  }
}

/** Halves LP (rounded up, as ygo-core's "/" does). */
export const HALF_LIFE_POINTS_VALUE = "/2";

/** The LP the change will land on, for the popover's preview. */
export function previewLifePoints(mode: LifePointsMode, amount: number, currentLp: number): number {
  switch (mode) {
    case "damage":
      return Math.max(0, currentLp - amount);
    case "gain":
      return currentLp + amount;
    case "set":
      return amount;
  }
}
