/** The "card-activated" duel event (dispatched by the Activate handler, shown by ui/components/activation-banner). */
export interface CardActivatedEvent {
  cardId: number;
  name?: string;
  /** The card's frame type ("spell", "trap", "effect", ...). */
  frameType?: string;
  /** The player who activated it. */
  player: number;
  chainLink?: number;
}
