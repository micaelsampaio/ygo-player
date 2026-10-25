import type { CardData } from "ygo-core";
import type { AssistQueryResult } from "../domain/assist-query";
import { keepsDropIntent, type DropIntent } from "../domain/hand-drag";

/** A board card double-clicked during an effect's card choice: a hand card, or the card in a field zone. */
export type PromptDoublePickTarget = { kind: "hand"; player: number; code: number } | { kind: "zone"; zone: string; code: number };

export type AssistAction = { commandType: string; data: Record<string, unknown> };

/** What the engine answers a choice with: notices to show, e.g. the bot's response. */
export type AssistChoiceResult = { notices?: string[] };

/** The notices in a choice's answer (the judge sends them as is, see YGOAssistActions). */
function choiceResult(res: unknown): AssistChoiceResult {
  const notices = (res as { notices?: unknown } | null | undefined)?.notices;
  return Array.isArray(notices) ? { notices: notices.filter((n): n is string => typeof n === "string") } : {};
}

export type AssistOptionsListener = (options: AssistQueryResult | null) => void;

/** What the controller needs from the duel (YGODuel satisfies it). */
export interface AssistControllerHost {
  assist?: { query(): Promise<unknown>; choose(action: AssistAction): Promise<unknown> };
  events: {
    dispatch(event: "assist-options", options: AssistQueryResult | null): void;
    on(event: "assist-options", cb: AssistOptionsListener): void;
    off(event: "assist-options", cb: AssistOptionsListener): void;
  };
  ygo?: { state?: { registerCardData?(cards: CardData[]): void } };
}

/**
 * Assisted Mode: the one owner of the engine's current options for this
 * player. Every query goes through here (the panel's refreshes and the card
 * menus' / phase menu's own queries alike), so the newest answer always wins:
 * a response that arrives after a newer query was sent is dropped. Every
 * change is published once as the "assist-options" duel event — the panel
 * draws it (behind its animation gate), pile viewers frame what it offers,
 * and card menus route matching moves through the engine with `options`.
 */
export class YGOAssistController {
  /** The newest options the engine answered (null: none / unavailable). */
  public options: AssistQueryResult | null = null;
  /** Space passes the panel's Continue / Don't respond row — returns true when it did. */
  public spaceAction: (() => boolean) | null = null;
  /** A click on a hand card picks it for an effect's choice — returns true when it did. */
  public handPick: ((player: number, code: number) => boolean) | null = null;
  /** A double-click on a board card while an effect asks for a card: picks it (and confirms when
   * that completes the choice) — returns true when the card is a candidate (ui/quick-action.ts). */
  public promptDoublePick: ((target: PromptDoublePickTarget) => boolean) | null = null;

  /** A card just dragged from the hand: its zone and position answer the engine's questions about that move. */
  public dropIntent: DropIntent | null = null;

  private requestId = 0;
  private pending = 0;
  private choosing = 0;

  constructor(private host: AssistControllerHost) {}

  /** Queries still on their way. */
  get inFlight(): number {
    return this.pending;
  }

  /**
   * Asks the engine for the current options. The newest query's answer
   * becomes `options` and is published; a superseded one is dropped (but
   * still returned to its caller). Rejects when the query fails.
   */
  async query(): Promise<AssistQueryResult | null> {
    const assist = this.host.assist;
    if (!assist) return null;
    const requestId = ++this.requestId;
    this.pending++;
    try {
      let res: AssistQueryResult;
      try {
        // The engine's options as the judge reports them (ygo-socket-server duel:assist:query).
        res = (await assist.query()) as AssistQueryResult;
      } catch (error) {
        if (this.requestId === requestId) this.publish(null);
        throw error;
      }
      // Card data the server sent for the cards these options name (a Deck
      // card this client never saw), so names and art show.
      const cards = (res as { cards?: CardData[] } | null)?.cards;
      if (Array.isArray(cards) && cards.length) this.host.ygo?.state?.registerCardData?.(cards);
      if (this.requestId === requestId) this.publish(res);
      return res;
    } finally {
      this.pending--;
    }
  }

  /** query() for callers that only want `options` brought up to date (errors become null options). */
  refresh(): Promise<void> {
    return this.query().then(() => undefined, () => undefined);
  }

  choose(action: AssistAction): Promise<AssistChoiceResult> {
    if (!this.host.assist) return Promise.reject(new Error("Assisted Mode is not available"));
    this.choosing++;
    return this.host.assist.choose(action).then(choiceResult, (error: unknown) => {
      // The move was refused: nothing of it follows for the drop to answer.
      this.dropIntent = null;
      throw error;
    }).finally(() => { this.choosing--; });
  }

  /**
   * A drop from the hand is about to send its move: remember where it went. Answers to queries
   * sent before it are dropped (they'd show the board from before the move, and end the intent).
   */
  setDropIntent(intent: DropIntent): void {
    this.requestId++;
    this.dropIntent = intent;
  }

  /** The drop's zone answered the engine's zone question (it answers no second one). */
  markDropPlaced(): void {
    if (this.dropIntent) this.dropIntent = { ...this.dropIntent, placed: true };
  }

  clearDropIntent(): void {
    this.dropIntent = null;
  }

  /** Drops the current options (and any answer still on its way). */
  clear(): void {
    this.requestId++;
    if (this.options !== null) this.publish(null);
  }

  subscribe(listener: AssistOptionsListener): () => void {
    const cb = (options: AssistQueryResult | null) => listener(options);
    this.host.events.on("assist-options", cb);
    return () => this.host.events.off("assist-options", cb);
  }

  /** Installs the Space handler; the returned function removes it (if still the current one). */
  setSpaceAction(action: () => boolean): () => void {
    this.spaceAction = action;
    return () => {
      if (this.spaceAction === action) this.spaceAction = null;
    };
  }

  /** Installs the hand-card pick handler; the returned function removes it (if still the current one). */
  setHandPick(pick: (player: number, code: number) => boolean): () => void {
    this.handPick = pick;
    return () => {
      if (this.handPick === pick) this.handPick = null;
    };
  }

  /** Installs the double-click pick handler; the returned function removes it (if still the current one). */
  setPromptDoublePick(pick: (target: PromptDoublePickTarget) => boolean): () => void {
    this.promptDoublePick = pick;
    return () => {
      if (this.promptDoublePick === pick) this.promptDoublePick = null;
    };
  }

  private publish(options: AssistQueryResult | null) {
    // The drop's move is over once the engine stops asking about it (and no answer is on its way).
    if (this.dropIntent && this.choosing === 0 && !keepsDropIntent(options)) this.dropIntent = null;
    this.options = options;
    this.host.events.dispatch("assist-options", options);
  }
}
