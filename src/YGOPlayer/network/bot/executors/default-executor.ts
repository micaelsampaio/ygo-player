import { YGOGameUtils } from "ygo-core";
import { BotExecutor, BotDecisionContext } from "./index";

/**
 * Fallback used when no card-specific executor is registered for a card in
 * hand (mirrors WindBot's DefaultExecutor role). Deliberately conservative:
 * only ever normal-summons a monster if a zone is open and this turn's
 * normal summon hasn't been used. Never attempts to play spells/traps —
 * doing that safely requires per-card effect knowledge this POC's registry
 * doesn't have for unscripted cards, so the safe default is to skip them
 * entirely rather than guess.
 */
export const DefaultExecutor: BotExecutor = {
  cardId: -1, // never matched directly — only used as the registry fallback

  canActivate(ctx: BotDecisionContext): boolean {
    const card = ctx.card;
    if (!YGOGameUtils.isMonster(card)) return false;
    if (!ctx.legality.canNormalSummon()) return false;
    return ctx.legality.getOpenMonsterZones().length > 0;
  },

  buildCommand(ctx: BotDecisionContext) {
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
  },
};
