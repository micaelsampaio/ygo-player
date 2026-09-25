import { AvailableReview, ReviewMoment, ReviewOption, formatScore, momentTitle, percent, reviewHeadline, reviewSubline } from "./duel-review";
import "./duel-review.css";

function OptionRow({ option, tone }: { option: ReviewOption; tone: "chosen" | "best" | "alt" }) {
  return <li className={`ygo-review-option ygo-review-option-${tone}`}>
    <span className="ygo-review-option-label">{option.label}</span>
    <span className="ygo-review-option-score" title="Model score (preference share)">
      {formatScore(option.score)} · {percent(option.prob)}
    </span>
  </li>;
}

function Moment({ moment }: { moment: ReviewMoment }) {
  const others = moment.alternatives.filter((a) => a.label !== moment.best.label || a.code !== moment.best.code || a.kind !== moment.best.kind);
  return <li className="ygo-review-moment">
    <div className="ygo-review-moment-title">{momentTitle(moment)}</div>
    <ul className="ygo-review-options">
      <OptionRow option={moment.chosen} tone="chosen" />
      <OptionRow option={moment.best} tone="best" />
      {others.map((a, i) => <OptionRow key={i} option={a} tone="alt" />)}
    </ul>
  </li>;
}

/** The review itself (the overlay fetched it already). */
export function DuelReviewPanel({ result, onClose }: { result: AvailableReview; onClose: () => void }) {
  const { review } = result;
  return <section className="ygo-review-panel" aria-label="Review of your plays">
    <header className="ygo-review-header">
      <h2 className="ygo-review-title">Review of your plays</h2>
      <button type="button" className="ygo-btn ygo-btn-action ygo-btn-sm" onClick={onClose}>Back</button>
    </header>
    <p className="ygo-review-headline">{reviewHeadline(review)}</p>
    <p className="ygo-review-subline">{reviewSubline(review)}</p>
    {review.keyMoments.length > 0 && <>
      <div className="ygo-review-legend" aria-hidden="true">
        <span className="ygo-review-legend-chosen">Your play</span>
        <span className="ygo-review-legend-best">Model's pick</span>
        <span>Other options</span>
      </div>
      <ol className="ygo-review-moments">
        {review.keyMoments.map((m) => <Moment key={m.seq} moment={m} />)}
      </ol>
    </>}
    <p className="ygo-review-footnote">
      Scored by the bot's learned choice model. A score is the model's preference for an option; the percentage is its share among that decision's options.
    </p>
  </section>;
}
