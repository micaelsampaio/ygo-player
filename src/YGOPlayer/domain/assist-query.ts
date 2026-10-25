/**
 * Assisted Mode: the shape of the engine's assist query result (what the
 * server offers the human right now). Types only; shared by core/ and ui/.
 */
import type { CardRefData, PromptData } from "./assist-prompt";

export interface IdleOptions {
  summonable: CardRefData[];
  spSummon: CardRefData[];
  reposition: CardRefData[];
  mset: CardRefData[];
  sset: CardRefData[];
  activatable: CardRefData[];
  /** Spell Speed of each `activatable` entry (older servers: missing). */
  activatableSpeed?: number[];
  toBattle: boolean;
  toEnd: boolean;
}

export interface BattleOptions {
  attackable: CardRefData[];
  activatable: CardRefData[];
  toMain2: boolean;
  toEnd: boolean;
}

/** The server only ever offers the single next phase (never a skip), plus
 * Standby / Main Phase 1 catch-up steps while the visible phase is behind
 * the engine's — see guidedView in ygo-socket-server's assistOptions.ts. */
export type AssistQueryResult =
  | { available: false }
  /** `ygoPhase`: the engine's current phase, as a ygo-core phase name. */
  | { available: true; pending: "idle"; options: IdleOptions; nextPhase?: string | null; ygoPhase?: string }
  | { available: true; pending: "battle"; options: BattleOptions; nextPhase?: string | null; ygoPhase?: string }
  /** The human's own chain window: chain a card, or don't respond. */
  | { available: true; pending: "chain"; respond: { activatable: CardRefData[]; canPass: boolean; forced: boolean; chainLength?: number; responding?: boolean; timing?: number; chain?: CardRefData[] }; ygoPhase?: string }
  /** An effect's follow-up choice the engine is holding for the human. */
  | { available: true; pending: "prompt"; prompt: PromptData };

/**
 * A chain window whose chain hasn't reached the board yet: the engine asks you to respond to a
 * link (say the bot's chain link 1) while the logs that show that activation are still on their
 * way (the bot's moves are paced). Shown now, the question would come before the card is seen
 * being activated, so it waits until the board's chain is as long as the engine's.
 */
export function chainAheadOfBoard(result: AssistQueryResult | null | undefined, boardChainLength: number): boolean {
  if (!result || !result.available || result.pending !== "chain") return false;
  return (result.respond.chainLength ?? 0) > boardChainLength;
}
