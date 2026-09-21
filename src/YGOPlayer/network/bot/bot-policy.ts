import { YGOCore } from "ygo-core";
import { BotLegalityTracker } from "./legality";

export type BotCommand = { type: string; data: any };

/**
 * The seam any bot "brain" plugs into — rule-based today, potentially
 * ML-based or something else later. `BotController` only ever talks to
 * this interface, never to a concrete implementation, so new policies can
 * be added (see policy-registry.ts) without touching the controller or
 * the editor()/UI wiring again.
 */
export interface BotPolicy {
  decideNextAction(): Promise<BotCommand[] | null>;
}

/** Everything a policy factory needs to construct a policy for one duel. */
export interface BotPolicyContext {
  ygo: YGOCore;
  playerIndex: number;
  legality: BotLegalityTracker;
  /** Needed only by policies that fetch a static asset (e.g. "ml-v1"'s .onnx model). */
  cdnUrl?: string;
}

export type BotPolicyFactory = (ctx: BotPolicyContext) => BotPolicy;
