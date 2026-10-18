import type { CardPosition, FieldZone, YGOCore, YGODuelEvents } from "ygo-core";
import type { YGODuel } from "../../../core/YGODuel";

/** What the duel log hands every row component, `log` narrowed to the row's own log type. */
export interface LogRowProps<L extends YGODuelEvents.DuelLog = YGODuelEvents.DuelLog> {
  log: L;
  duel: YGODuel;
  ygo: InstanceType<typeof YGOCore>;
  index: number;
}

/**
 * The fields the default row reads. Every card-move log (MoveCard, Activate,
 * Negate, Banish with one card, ...) has some of them.
 */
export type CardMoveLog = YGODuelEvents.DuelLog & {
  id?: number;
  originZone?: FieldZone;
  zone?: FieldZone;
  position?: CardPosition;
  chainLink?: number;
  negatedLink?: number;
};
