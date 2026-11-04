import { useState } from "react";
import type { YGODuel } from "../../core/YGODuel";

/** Why the player gave that rating (the server's RATING_REASONS): one optional tap under the stars. */
export const RATING_REASONS: Array<{ id: string; label: string }> = [
  { id: "good-duel", label: "Good duel" },
  { id: "too-hard", label: "Too hard" },
  { id: "too-easy", label: "Too easy" },
  { id: "played-badly", label: "Bot played badly" },
  { id: "showed-wrong", label: "Something showed wrong" },
  { id: "stuck", label: "Got stuck" },
  { id: "too-slow", label: "Too slow" },
];

/** The end-of-duel rating is offered in the player's own bot duels, when the host can send it. */
export function canRateDuel(duel: YGODuel, isPlayerClient: boolean): boolean {
  return isPlayerClient && !!duel.ygo?.options?.botDuel && typeof duel.assist?.rate === "function";
}

/**
 * "How was the bot?": 1–5 stars, then an optional reason. Each tap is sent (a later one replaces the
 * earlier), so a rating with no reason still counts. Sending never surfaces an error.
 */
export function DuelRating({ duel }: { duel: YGODuel }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [reason, setReason] = useState<string | null>(null);

  const send = (s: number, r: string | null) => {
    duel.assist?.rate?.(s, r ?? undefined)?.catch((error) => duel.logger.swallowed("DuelRating.rate", error));
  };
  const pickStars = (s: number) => { setStars(s); send(s, reason); };
  const pickReason = (r: string) => {
    const next = reason === r ? null : r;
    setReason(next);
    send(stars, next);
  };
  const shown = hover || stars;

  return <div className="ygo-duel-rating">
    <div className="ygo-duel-rating-title">{stars ? "Thanks! Anything to add?" : "How was the bot?"}</div>
    <div className="ygo-duel-rating-stars" role="radiogroup" aria-label="Rate the bot" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((s) => <button
        key={s}
        type="button"
        role="radio"
        aria-checked={stars === s}
        aria-label={`${s} star${s > 1 ? "s" : ""}`}
        className={`ygo-duel-rating-star ${s <= shown ? "ygo-active" : ""}`}
        onMouseEnter={() => setHover(s)}
        onClick={() => pickStars(s)}
      >★</button>)}
    </div>
    {stars > 0 && <div className="ygo-duel-rating-reasons">
      {RATING_REASONS.map((r) => <button
        key={r.id}
        type="button"
        aria-pressed={reason === r.id}
        className={`ygo-leave-reason ${reason === r.id ? "ygo-leave-reason-active" : ""}`}
        onClick={() => pickReason(r.id)}
      >{r.label}</button>)}
    </div>}
  </div>;
}
