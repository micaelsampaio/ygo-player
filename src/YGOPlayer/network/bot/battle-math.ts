import { Card, YGOGameUtils } from "ygo-core";

export interface BattleResult {
  attackingDestroyed: boolean;
  attackedDestroyed: boolean;
  battleDamage: number;
}

/**
 * Deliberately duplicated (not imported) from ygo-player's own
 * scripts/ygo-utils.ts#calculateBattleInfo — that module pulls in THREE.js
 * and duel-rendering internals the bot has no business depending on. Must
 * stay behaviorally identical to it so a bot-caused attack resolves
 * exactly the way the same attack would if a human declared it.
 */
export function calculateBattleResult(attackingCard: Card, attackedCard: Card): BattleResult {
  const isAtk1 = !YGOGameUtils.isDefense(attackingCard);
  const isAtk2 = !YGOGameUtils.isDefense(attackedCard);

  const attackPower = isAtk1 ? attackingCard.currentAtk : attackingCard.currentDef;
  const defendPower = isAtk2 ? attackedCard.currentAtk : attackedCard.currentDef;

  let battleDamage = attackPower - defendPower;
  const attackingDestroyed = isAtk2 && attackPower > 0 && battleDamage < 0;
  const attackedDestroyed = battleDamage > 0;

  if (!isAtk2 && battleDamage > 0) battleDamage = 0;

  return { attackingDestroyed, attackedDestroyed, battleDamage };
}
