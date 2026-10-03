import type { AssistQueryResult } from "../domain/assist-query";

export type AssistAction = { commandType: string; data: any };

/** What the controller needs from the duel (YGODuel satisfies it). */
export interface AssistControllerHost {
  assist?: { query(): Promise<any>; choose(action: AssistAction): Promise<any> };
  events: { dispatch(event: string, payload?: any): void; on(event: string, cb: (payload: any) => void): void; off(event: string, cb: (payload: any) => void): void };
  ygo?: { state?: { registerCardData?(cards: any): void } };
}

export type AssistOptionsListener = (options: AssistQueryResult | null) => void;

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

  private requestId = 0;
  private pending = 0;

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
        res = await assist.query();
      } catch (error) {
        if (this.requestId === requestId) this.publish(null);
        throw error;
      }
      // Card data the server sent for the cards these options name (a Deck
      // card this client never saw), so names and art show.
      const cards = (res as { cards?: unknown[] } | null)?.cards;
      if (Array.isArray(cards) && cards.length) this.host.ygo?.state?.registerCardData?.(cards as any);
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

  choose(action: AssistAction): Promise<any> {
    if (!this.host.assist) return Promise.reject(new Error("Assisted Mode is not available"));
    return this.host.assist.choose(action);
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

  private publish(options: AssistQueryResult | null) {
    this.options = options;
    this.host.events.dispatch("assist-options", options);
  }
}
