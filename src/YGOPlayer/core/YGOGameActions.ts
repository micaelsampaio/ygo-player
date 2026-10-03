import { DuelActions } from "./game-actions/duel-actions";

/**
 * Every move a player can make on the board, as duel commands — the
 * `duel.gameActions` API. Split by family in core/game-actions/:
 * base (shared helpers, Assisted Mode routing), summon-actions,
 * card-actions and duel-actions (deck/hand, player, phases, battle).
 */
export class YGOGameActions extends DuelActions { }
