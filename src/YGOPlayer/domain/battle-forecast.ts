/**
 * Master Duel-style battle forecast: what an attack would do under the
 * standard battle rules, shown while the player aims (ui/components/battle-forecast).
 * Pure: the caller reads the cards' current stats and positions.
 */

/** The monster being attacked, as the attacker sees it. */
export interface ForecastTarget {
  atk: number;
  def: number;
  /** In Defense Position (it battles with its DEF). */
  defense: boolean;
  /** Face-down: its stats are hidden, so the outcome can't be forecast. */
  faceDown: boolean;
}

export type ForecastOutcome =
  | "destroys" // the target is destroyed
  | "destroyed" // the attacker is destroyed
  | "both" // both are destroyed
  | "blocked" // attacked a stronger defender: nothing destroyed, attacker's controller takes damage
  | "none" // nothing destroyed, no damage
  | "direct" // direct attack
  | "unknown"; // face-down target

export interface BattleForecast {
  outcome: ForecastOutcome;
  attackerDestroyed: boolean;
  targetDestroyed: boolean;
  /** Battle damage (0 when none or unknown). */
  damage: number;
  /** Which player takes `damage`; null when nobody does. */
  damagedPlayer: number | null;
}

const stat = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

/**
 * Forecast an attack by `attackerPlayer`'s monster with `attackerAtk` on
 * `target` (null for a direct attack).
 */
export function forecastBattle(attackerAtk: number, target: ForecastTarget | null, attackerPlayer: number): BattleForecast {
  const atk = stat(attackerAtk);
  const defender = 1 - attackerPlayer;
  const result = (outcome: ForecastOutcome, attackerDestroyed: boolean, targetDestroyed: boolean, damage: number, damagedPlayer: number | null): BattleForecast =>
    ({ outcome, attackerDestroyed, targetDestroyed, damage, damagedPlayer: damage > 0 ? damagedPlayer : null });

  if (!target) return result("direct", false, false, atk, defender);
  if (target.faceDown) return result("unknown", false, false, 0, null);

  if (target.defense) {
    const def = stat(target.def);
    if (atk > def) return result("destroys", false, true, 0, null);
    if (atk < def) return result("blocked", false, false, def - atk, attackerPlayer);
    return result("none", false, false, 0, null);
  }

  const targetAtk = stat(target.atk);
  if (atk > targetAtk) return result("destroys", false, true, atk - targetAtk, defender);
  if (atk < targetAtk) return result("destroyed", true, false, targetAtk - atk, attackerPlayer);
  // Equal ATK: both are destroyed, unless both have 0 ATK.
  if (atk === 0) return result("none", false, false, 0, null);
  return result("both", true, true, 0, null);
}

const OUTCOME_LABELS: Record<ForecastOutcome, string> = {
  destroys: "Destroys",
  destroyed: "Destroyed",
  both: "Both destroyed",
  blocked: "Blocked",
  none: "No damage",
  direct: "Direct attack",
  unknown: "?",
};

export function forecastOutcomeLabel(outcome: ForecastOutcome): string {
  return OUTCOME_LABELS[outcome];
}

/** "-1200 to opponent" / "-500 to you", or "" when nobody takes damage. `isViewer` says whether a player is the one watching. */
export function forecastDamageLabel(forecast: BattleForecast, isViewer: (player: number) => boolean): string {
  if (forecast.damagedPlayer === null || forecast.damage <= 0) return "";
  return `-${forecast.damage} to ${isViewer(forecast.damagedPlayer) ? "you" : "opponent"}`;
}

/** The target's battling stat as shown: "?" face-down, its DEF in Defense Position, else its ATK. */
export function targetStatLabel(target: ForecastTarget): { label: "ATK" | "DEF"; value: string } {
  if (target.faceDown) return { label: "DEF", value: "?" };
  return target.defense ? { label: "DEF", value: String(stat(target.def)) } : { label: "ATK", value: String(stat(target.atk)) };
}
