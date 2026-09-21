import { YGOGameUtils } from "ygo-core";
import { BotExecutor, BotDecisionContext } from "./index";

/** Standard tribute rules: level 5-6 needs 1 tribute, level 7+ needs 2. Level <= 4 needs none. */
function tributesRequired(level: number): number {
  if (level >= 7) return 2;
  if (level >= 5) return 1;
  return 0;
}

/**
 * Fallback used when no card-specific executor is registered for a card in
 * hand (mirrors WindBot's DefaultExecutor role). Deliberately conservative:
 * only ever summons a monster if this turn's normal summon hasn't been
 * used, and — for level 5+ monsters — only if enough of the bot's own
 * monsters are on board to legally tribute (ygo-core's NormalSummonCommand
 * has no level/tribute check of its own; the human UI enforces this by
 * only exposing "Tribute Summon" as a distinct button for level 5+ cards,
 * so the bot has to make the same choice explicitly). Never attempts to
 * play spells/traps — doing that safely requires per-card effect
 * knowledge this POC's registry doesn't have for unscripted cards, so the
 * safe default is to skip them entirely rather than guess.
 */
export const DefaultExecutor: BotExecutor = {
  cardId: -1, // never matched directly — only used as the registry fallback

  canActivate(ctx: BotDecisionContext): boolean {
    const card = ctx.card;
    if (!YGOGameUtils.isMonster(card)) return false;
    if (!ctx.legality.canNormalSummon()) return false;

    const required = tributesRequired(card.level);
    if (required === 0) return ctx.legality.getOpenMonsterZones().length > 0;

    return ctx.legality.getOwnMonsterZones().length >= required;
  },

  buildCommand(ctx: BotDecisionContext) {
    const required = tributesRequired(ctx.card.level);

    if (required === 0) {
      const zone = ctx.legality.getOpenMonsterZones()[0];
      if (!zone) return null;

      return {
        type: "NormalSummonCommand",
        data: {
          player: ctx.playerIndex,
          id: ctx.card.id,
          originZone: ctx.originZone,
          zone,
        },
      };
    }

    // Tribute the weakest monsters on board, keep the strongest ones.
    const tributeZones = ctx.legality
      .getOwnMonsterZones()
      .map((zone) => ({ zone, card: ctx.legality.getCardFromZone(zone)! }))
      .sort((a, b) => a.card.currentAtk - b.card.currentAtk)
      .slice(0, required);

    if (tributeZones.length < required) return null;

    return {
      type: "TributeSummonCommand",
      data: {
        player: ctx.playerIndex,
        id: ctx.card.id,
        originZone: ctx.originZone,
        zone: tributeZones[0].zone, // freed by its own tribute before the summon lands
        tributes: tributeZones.map((t) => ({ id: t.card.id, zone: t.zone })),
      },
    };
  },
};
