import type { CoachHost, CoachStats } from "../types";
import { endBoardText, parsePreview, parseSuggestion, type CoachPreview, type CoachSuggestion } from "../domain/coach";

export type CoachSuggestState =
  | { status: "idle" }
  | { status: "loading"; turn: number; mark?: number }
  /** `mark`: where the duel was when it was asked (its log length): a later board asks again. */
  | { status: "done"; turn: number; result: CoachSuggestion; mark?: number };

export type CoachPreviewState =
  | { status: "idle" }
  | { status: "loading"; key: string }
  /** No preview came back (rate-limited, or the call failed): the button offers it again. */
  | { status: "retry"; key: string }
  | { status: "done"; key: string; result: CoachPreview & { available: true } };

export interface CoachState {
  /** The host offers a coach at all (connectToServer's assist.coach). */
  available: boolean;
  enabled: boolean;
  /** Was on at some point this duel: the panel stays (header + switch) after turning it off. */
  everEnabled: boolean;
  /** A switch request on its way. */
  switching: boolean;
  stats: CoachStats | null;
  suggest: CoachSuggestState;
  preview: CoachPreviewState;
  error: string | null;
  /** The coach's messages in the duel chat, oldest first (only this player sees them). */
  messages: CoachMessage[];
}

/** One coach line in the duel chat. */
export interface CoachMessage {
  key: string;
  text: string;
  at: number;
}

/** The chat keeps this many coach lines. */
export const MAX_COACH_MESSAGES = 60;

const OFF: CoachState = {
  available: false, enabled: false, everEnabled: false, switching: false, stats: null,
  suggest: { status: "idle" }, preview: { status: "idle" }, error: null, messages: [],
};

/** The ack failed in the socket layer, or the server refused (`{ success: false, error }`). */
function refused(res: unknown): string | null {
  const r = res as { success?: unknown; error?: unknown } | null | undefined;
  if (r && r.success === false) return typeof r.error === "string" && r.error ? r.error : "The coach couldn't be switched.";
  return null;
}

/**
 * Duel Coach: the one owner of the coach's state for this duel — on/off, the deck stats the host
 * pushes, the turn suggestion and the current decision's preview. The host (assist.coach) is read
 * lazily, since YGOPlayerComponent sets duel.assist after the duel is built.
 */
export class YGOCoachController {
  private state: CoachState = OFF;
  private host: CoachHost | undefined;
  private listeners = new Set<() => void>();
  private unsubscribeStats: (() => void) | null = null;

  constructor(private getHost: () => CoachHost | undefined) {}

  private sync(): CoachHost | undefined {
    const host = this.getHost();
    if (host === this.host) return host;
    this.unsubscribeStats?.();
    this.unsubscribeStats = null;
    this.host = host;
    if (!host) {
      this.state = OFF;
      return host;
    }
    const enabled = !!host.enabled;
    this.state = { ...OFF, available: true, enabled, everEnabled: enabled, stats: host.stats ?? null };
    if (host.onStats) {
      try {
        this.unsubscribeStats = host.onStats((stats) => this.set({ stats: stats ?? null }));
      } catch {
        this.unsubscribeStats = null;
      }
    }
    return host;
  }

  getState = (): CoachState => {
    this.sync();
    return this.state;
  };

  /** Hints, previews and the panel show only with the coach on. */
  get active(): boolean {
    const s = this.getState();
    return s.available && s.enabled;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.sync();
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private set(patch: Partial<CoachState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener();
  }

  /** Optimistic: flips now, flips back (with the reason) when the server refuses. */
  async setEnabled(on: boolean): Promise<void> {
    const host = this.sync();
    if (!host || this.state.switching || this.state.enabled === on) return;
    const before = this.state.enabled;
    this.set({ enabled: on, everEnabled: this.state.everEnabled || on, switching: true, error: null });
    try {
      const res = await host.setEnabled(on);
      const error = refused(res);
      this.set(error ? { enabled: before, switching: false, error } : { switching: false });
    } catch {
      this.set({ enabled: before, switching: false, error: "The coach couldn't be switched." });
    }
    if (!this.state.enabled) this.set({ preview: { status: "idle" } });
  }

  /**
   * Posts a coach line in the duel chat, once per `key` (the same moment never posts twice).
   * Local only: nothing is sent to the server, so the opponent never sees it.
   */
  post(key: string, text: string): void {
    this.sync();
    if (!this.state.enabled || !text) return;
    if (this.posted.has(key)) return;
    this.posted.add(key);
    const messages = [...this.state.messages, { key, text, at: Date.now() }].slice(-MAX_COACH_MESSAGES);
    this.set({ messages });
  }

  private posted = new Set<string>();

  /** "Suggest my turn" for `turn` (the answer is shown for that turn only). */
  async suggest(turn: number, mark?: number): Promise<void> {
    const host = this.sync();
    if (!host || !this.state.enabled || this.state.suggest.status === "loading") return;
    this.set({ suggest: { status: "loading", turn, mark } });
    let result: CoachSuggestion;
    try {
      result = parseSuggestion(await host.suggest());
    } catch {
      result = { available: false, reason: "The coach couldn't answer, try again in a moment." };
    }
    this.set({ suggest: { status: "done", turn, result, mark } });
    // The line goes to the chat too, where the coach's other messages are (each new line, also later
    // in the same turn once the board moved).
    if (result.available) {
      const lines = result.steps.length ? result.steps.map((step, i) => `${i + 1}. ${step}`) : ["Nothing better than passing."];
      const text = [`Suggested line for turn ${turn}${mark ? " (from here)" : ""}:`, ...lines, endBoardText(result.end)].join("\n");
      this.post(`suggest:${turn}:${result.steps.join("|")}`, text);
    }
  }

  /** "Preview" for the decision `key` (see domain/coach decisionKey). */
  async preview(key: string): Promise<void> {
    const host = this.sync();
    if (!host || !this.state.enabled) return;
    const current = this.state.preview;
    if ((current.status === "loading" || current.status === "done") && current.key === key) return;
    this.set({ preview: { status: "loading", key } });
    let result: CoachPreview;
    try {
      result = parsePreview(await host.preview());
    } catch {
      result = { available: false };
    }
    // A newer decision asked meanwhile: this answer is for an old one.
    const now = this.state.preview;
    if (now.status !== "loading" || now.key !== key) return;
    // `{ available: false }` is also the rate limit's answer: not cached, it can be asked again.
    this.set({ preview: result.available ? { status: "done", key, result } : { status: "retry", key } });
  }

  /** The preview, only while it's for the decision `key`. */
  previewFor(key: string | null): CoachPreviewState {
    const p = this.getState().preview;
    return key !== null && p.status !== "idle" && p.key === key ? p : { status: "idle" };
  }

  dispose(): void {
    this.unsubscribeStats?.();
    this.unsubscribeStats = null;
    this.listeners.clear();
  }
}
