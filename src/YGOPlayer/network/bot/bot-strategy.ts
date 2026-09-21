import { YGOCore, YGODuelPhase, FieldZone } from "ygo-core";
import { BotLegalityTracker } from "./legality";
import { ExecutorRegistry } from "./executors/index";
import { calculateBattleResult } from "./battle-math";

type BotCommand = { type: string; data: any };

/**
 * Fixed phase-sequence orchestration — deliberately NOT search-based
 * (no minimax/MCTS), matching the WindBot precedent: Yu-Gi-Oh's branching
 * factor and hidden information make exhaustive search impractical even
 * in mature engines. Main Phase 1 iterates hand cards asking the executor
 * registry for the first applicable action; Battle Phase attacks with
 * every monster that's allowed to.
 *
 * Returns a BATCH of commands per decision, not one — an attack is never
 * just AttackCommand: the human UI (YGOGameActions.attack) always follows
 * it with LifePointsTransactionCommand/DestroyCardCommand based on
 * computed battle math, and the bot must send that same sequence for the
 * attack to actually do anything.
 */
export class BotStrategy {
  constructor(
    private ygo: YGOCore,
    private playerIndex: number,
    private legality: BotLegalityTracker,
    private registry: ExecutorRegistry,
  ) {}

  decideNextAction(): BotCommand[] | null {
    const phase = this.ygo.state.phase;

    if (phase === YGODuelPhase.Main1) return this.decideMainPhaseAction();
    if (phase === YGODuelPhase.Battle) return this.decideBattleAction();

    return null;
  }

  private decideMainPhaseAction(): BotCommand[] | null {
    const hand = this.ygo.getField(this.playerIndex).hand;
    const handPrefix = this.playerIndex === 1 ? "H2" : "H";

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const originZone = `${handPrefix}-${i + 1}` as FieldZone;
      const executor = this.registry.getExecutorFor(card.id);

      const ctx = {
        card,
        originZone,
        playerIndex: this.playerIndex,
        legality: this.legality,
      };

      if (executor.canActivate(ctx)) {
        const command = executor.buildCommand(ctx);
        if (command) {
          if (command.type === "NormalSummonCommand") {
            this.legality.recordNormalSummon();
          }
          return [command];
        }
      }
    }

    return null;
  }

  /**
   * Trade-aware: an attacker only actually attacks a target when it's a
   * safe kill (destroys the target without losing the attacker) or a
   * worthwhile even trade (both destroyed, but the target was at least
   * as big a threat as the attacker). Anything worse — the attacker dies
   * and the target survives — is skipped rather than thrown away. A
   * skipped attacker still counts its attack as used for the turn (real
   * Yu-Gi-Oh doesn't let you "wait and see" mid-battle-phase either), so
   * the loop always makes forward progress across repeated calls.
   */
  private decideBattleAction(): BotCommand[] | null {
    const myZones = this.legality.getOwnMonsterZones();
    const availableAttackers = myZones.filter((zone) => this.legality.canDeclareAttack(zone));

    for (const attacker of availableAttackers) {
      const attackingCard = this.ygo.state.getCardFromZone(attacker)!;
      const targets = this.legality.getAttackableTargets();

      if (targets.length === 0) {
        this.legality.recordAttack(attacker);
        const commands: BotCommand[] = [
          {
            type: "AttackDirectlyCommand",
            data: { player: this.playerIndex, id: attackingCard.id, originZone: attacker },
          },
        ];
        if (attackingCard.currentAtk > 0) {
          commands.push({
            type: "LifePointsTransactionCommand",
            data: { player: 1 - this.playerIndex, value: `-${attackingCard.currentAtk}` },
          });
        }
        return commands;
      }

      const evaluated = targets.map((zone) => {
        const card = this.ygo.state.getCardFromZone(zone)!;
        return { zone, card, battle: calculateBattleResult(attackingCard, card) };
      });

      const safeKills = evaluated.filter(
        (t) => t.battle.attackedDestroyed && !t.battle.attackingDestroyed,
      );
      const worthwhileTrades = evaluated.filter(
        (t) =>
          t.battle.attackedDestroyed &&
          t.battle.attackingDestroyed &&
          t.card.currentAtk >= attackingCard.currentAtk,
      );

      const pool = safeKills.length > 0 ? safeKills : worthwhileTrades;
      const target = pool.sort((a, b) => b.card.currentAtk - a.card.currentAtk)[0];

      this.legality.recordAttack(attacker);

      if (!target) continue; // every target here is a bad trade — hold this attacker back

      const commands: BotCommand[] = [
        {
          type: "AttackCommand",
          data: {
            player: this.playerIndex,
            attackingId: attackingCard.id,
            attackingZone: attacker,
            attackedId: target.card.id,
            attackedZone: target.zone,
          },
        },
      ];

      if (target.battle.battleDamage > 0) {
        commands.push({
          type: "LifePointsTransactionCommand",
          data: { player: 1 - this.playerIndex, value: `-${target.battle.battleDamage}` },
        });
      } else if (target.battle.battleDamage < 0) {
        commands.push({
          type: "LifePointsTransactionCommand",
          data: { player: this.playerIndex, value: target.battle.battleDamage.toString() },
        });
      }
      if (target.battle.attackingDestroyed) {
        commands.push({
          type: "DestroyCardCommand",
          data: { player: this.playerIndex, id: attackingCard.id, originZone: attacker },
        });
      }
      if (target.battle.attackedDestroyed) {
        commands.push({
          type: "DestroyCardCommand",
          data: { player: 1 - this.playerIndex, id: target.card.id, originZone: target.zone },
        });
      }

      return commands;
    }

    return null;
  }
}
