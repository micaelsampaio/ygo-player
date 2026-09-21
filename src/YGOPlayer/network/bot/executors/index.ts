import { Card, FieldZone } from "ygo-core";
import { BotLegalityTracker } from "../legality";
import { DefaultExecutor } from "./default-executor";

export interface BotDecisionContext {
  card: Card;
  originZone: FieldZone;
  playerIndex: number;
  legality: BotLegalityTracker;
}

export interface BotExecutor {
  cardId: number;
  canActivate(ctx: BotDecisionContext): boolean;
  buildCommand(ctx: BotDecisionContext): { type: string; data: any } | null;
}

/**
 * cardId -> BotExecutor lookup, WindBot-style. Kept keyed by cardId from
 * day one even though this POC only ever registers zero card-specific
 * executors (its one starter deck sticks to vanilla monsters the
 * DefaultExecutor already handles) — this is the seam WindBot itself uses
 * to scale from one deck to hundreds, and costs nothing extra to set up
 * correctly now.
 */
export class ExecutorRegistry {
  private byCardId = new Map<number, BotExecutor>();

  register(executor: BotExecutor) {
    this.byCardId.set(executor.cardId, executor);
  }

  getExecutorFor(cardId: number): BotExecutor {
    return this.byCardId.get(cardId) ?? DefaultExecutor;
  }
}
