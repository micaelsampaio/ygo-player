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
  | { available: true; pending: "idle"; options: IdleOptions; nextPhase?: string | null }
  | { available: true; pending: "battle"; options: BattleOptions; nextPhase?: string | null }
  /** The human's own chain window: chain a card, or don't respond. */
  | { available: true; pending: "chain"; respond: { activatable: CardRefData[]; canPass: boolean; forced: boolean; chainLength?: number; chain?: CardRefData[] } }
  /** An effect's follow-up choice the engine is holding for the human. */
  | { available: true; pending: "prompt"; prompt: PromptData };
