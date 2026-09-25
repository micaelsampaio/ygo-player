/**
 * "Review my plays" — the post-duel review of a bot duel (ygo-socket-server's
 * `duel:bot:review`, see bot-duel/botDuelLog.ts there): the human's
 * decisions scored with the bot's choice model and the key moments where the
 * model preferred another option.
 *
 * The host app supplies the request as an optional `review()` on the assist
 * actions it already passes to connectToServer (the same outer socket layer
 * the assisted panel talks through). Without it the overlay offers nothing.
 */

export type ReviewContext = "main" | "battle" | "chain";

export interface ReviewOption {
  label: string;
  kind: string;
  code: number;
  score: number;
  /** The model's preference share among that decision's options (0-1). */
  prob: number;
}

export interface ReviewMoment {
  seq: number;
  turn: number;
  ctx: ReviewContext;
  chosen: ReviewOption;
  best: ReviewOption;
  alternatives: ReviewOption[];
  gap: number;
}

export interface PlayReview {
  modelId: string;
  decisions: number;
  agreed: number;
  agreement: number;
  meanGap: number;
  keyMoments: ReviewMoment[];
}

export type BotReviewResponse =
  | { available: false; reason?: string }
  | {
    available: true;
    roomId: string;
    game: number;
    outcome: { winner: "human" | "bot"; loser: "human" | "bot" };
    turns: number;
    difficulty: string;
    review: PlayReview;
  };

export type AvailableReview = Extract<BotReviewResponse, { available: true }>;

export interface BotReviewSource {
  review(): Promise<BotReviewResponse>;
}

/** The host's review request, if it supplied one (assist.review). */
export function reviewSourceOf(duel: { assist?: unknown }): BotReviewSource | null {
  const assist = duel.assist as { review?: unknown } | undefined;
  const review = assist?.review;
  if (typeof review !== "function") return null;
  return { review: () => Promise.resolve(review.call(assist)) };
}

/** A usable review: the server said available and it has at least one scored decision. */
export function isShowableReview(res: unknown): res is AvailableReview {
  const r = res as AvailableReview | null | undefined;
  return !!r && r.available === true && !!r.review && Array.isArray(r.review.keyMoments) && r.review.decisions > 0;
}

export const CONTEXT_LABELS: Record<ReviewContext, string> = {
  main: "Main Phase",
  battle: "Battle Phase",
  chain: "Chain response",
};

export function percent(x: number): string {
  if (!Number.isFinite(x)) return "–";
  return `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
}

export function reviewHeadline(r: PlayReview): string {
  if (r.decisions === 0) return "No decisions to review.";
  return `You made the model's top pick in ${r.agreed} of ${r.decisions} decisions (${percent(r.agreement)}).`;
}

export function reviewSubline(r: PlayReview): string {
  if (r.keyMoments.length === 0) return "No moment where the model clearly preferred another play.";
  const n = r.keyMoments.length;
  return `${n} key moment${n === 1 ? "" : "s"} where the model preferred a different option:`;
}

export function momentTitle(m: ReviewMoment): string {
  return `Turn ${m.turn} · ${CONTEXT_LABELS[m.ctx] ?? m.ctx}`;
}

/** Signed score, two decimals ("+1.25", "-0.40"). */
export function formatScore(score: number): string {
  if (!Number.isFinite(score)) return "–";
  return `${score >= 0 ? "+" : ""}${score.toFixed(2)}`;
}

/** Short user-facing text for why there's no review (the button is hidden then; used for errors after a click). */
export function unavailableText(reason: string | undefined): string {
  switch (reason) {
    case "no-log": return "No review for this duel.";
    case "no-decisions": return "This duel had no decisions to review.";
    case "no-model": return "The review model isn't available right now.";
    case "rate limit": return "Too many requests — try again in a minute.";
    default: return "The review isn't available right now.";
  }
}
