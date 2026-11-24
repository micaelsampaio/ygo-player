/**
 * Assisted Mode: the engine runs every attack. An attack is offered and made only when the
 * engine's current Battle Phase options list its attacker, at a target it can attack (an
 * opponent's monster, or a direct attack the engine allows: an attackable entry's `pos` is
 * ocgcore's direct_attackable). Anything else is refused with a notice; the board's free-form
 * attack is only made after the player switched Manual attacks on (duel.manualAttacks). The
 * server holds attacks to the same rules (ygo-socket-server duel/assistedAttacks.ts).
 */
import type { CardRefData } from "./assist-prompt";
import type { AssistQueryResult } from "./assist-query";
import { findAssistOption, zoneToLocation } from "./assist-routing";

export const ATTACK_NOT_NOW_NOTICE = "That monster can't attack right now.";
export const ATTACK_NOT_IN_BATTLE_NOTICE = "Attacks are only declared in your Battle Phase.";
export const ATTACK_BAD_TARGET_NOTICE = "That isn't a monster this one can attack.";
export const ATTACK_NOT_DIRECT_NOTICE = "It can't attack directly: your opponent controls a monster.";

export type AssistedAttackCheck = { kind: "engine"; ref: CardRefData } | { kind: "refused"; message: string };

/**
 * The engine's attacker entry for this very monster, or null when it can't attack now. Its zone
 * must match exactly: another copy of the card that may still attack doesn't make this one an
 * attacker (findAssistOption alone falls back to any listed copy).
 */
export function engineAttacker(options: AssistQueryResult | null | undefined, code: number, zone: string): CardRefData | null {
  const ref = findAssistOption(options, "Attack", code, zone);
  const where = zoneToLocation(zone);
  if (!ref || !where || (where.seq !== null && ref.seq !== where.seq)) return null;
  return ref;
}

/** Whether the engine lets this attacker attack directly (with no flag: only into an empty field). */
export function engineAllowsDirect(ref: CardRefData, opponentHasMonsters: boolean): boolean {
  return typeof ref.pos === "number" ? ref.pos !== 0 : !opponentHasMonsters;
}

/**
 * An attack in Assisted Mode, as the engine would take it. `target`: the attacked zone and
 * whether it holds an opponent's monster; null = a direct attack.
 */
export function checkAssistedAttack(
  options: AssistQueryResult | null | undefined,
  attacker: { code: number; zone: string },
  target: { zone: string; opponentMonster: boolean } | null,
  opponentHasMonsters: boolean,
): AssistedAttackCheck {
  const ref = engineAttacker(options, attacker.code, attacker.zone);
  if (!ref) {
    const inBattle = !!options?.available && (options.pending === "battle" || ("ygoPhase" in options && options.ygoPhase === "Battle"));
    return { kind: "refused", message: inBattle ? ATTACK_NOT_NOW_NOTICE : ATTACK_NOT_IN_BATTLE_NOTICE };
  }
  if (target) return target.opponentMonster ? { kind: "engine", ref } : { kind: "refused", message: ATTACK_BAD_TARGET_NOTICE };
  return engineAllowsDirect(ref, opponentHasMonsters) ? { kind: "engine", ref } : { kind: "refused", message: ATTACK_NOT_DIRECT_NOTICE };
}
