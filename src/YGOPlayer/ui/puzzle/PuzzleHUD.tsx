import { useEffect, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import {
  nextPuzzleView,
  opponentPolicyText,
  PuzzleView,
  puzzleProgress,
  puzzleResultTitle,
  readPuzzleView,
  retryRequestOf,
} from "./puzzle-state";
import "./style.css";

const stopPointer = (e: React.SyntheticEvent) => e.stopPropagation();
const RETRY_RESET_MS = 10_000;

/**
 * Engine-checked puzzles (ygo-socket-server src/puzzles/): the goal, the
 * damage dealt so far, and the server's verdict with Try again. Try again is
 * a new room, so the host starts it (the component's "puzzle-retry" event).
 */
export function PuzzleHUD({ duel }: { duel: YGODuel }) {
  const [view, setView] = useState<PuzzleView | null>(() => readPuzzleView((duel.ygo?.options as { puzzle?: unknown } | undefined)?.puzzle));
  const [showHint, setShowHint] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isPuzzle = !!view;

  useEffect(() => {
    if (!isPuzzle) return;
    const onState = (data: unknown) => setView((current) => nextPuzzleView(current, data));
    duel.events.on("puzzle-state", onState);
    // The verdict may already be in (a reconnect, or it came before this mounted).
    duel.serverActions?.room.send("puzzle:state");
    return () => duel.events.off("puzzle-state", onState);
  }, [duel, isPuzzle]);

  // The host starts the new room; if nothing happens, let the player ask again.
  useEffect(() => {
    if (!retrying) return;
    const timer = setTimeout(() => setRetrying(false), RETRY_RESET_MS);
    return () => clearTimeout(timer);
  }, [retrying]);

  if (!view) return null;

  const progress = puzzleProgress(view);
  const result = puzzleResultTitle(view);
  const retry = () => {
    if (retrying) return;
    setRetrying(true);
    duel.events.dispatch("puzzle-retry", retryRequestOf(view));
  };

  return <div
    className={`ygo-puzzle-hud ygo-puzzle-hud-${view.status}`}
    role="region"
    aria-label="Puzzle"
    onMouseDown={stopPointer}
    onMouseUp={stopPointer}
    onClick={stopPointer}
    onPointerDown={stopPointer}
  >
    <div className="ygo-puzzle-hud-header">
      <span className="ygo-puzzle-hud-name">{view.name}</span>
      {view.attempt > 1 && <span className="ygo-puzzle-hud-attempt">Try {view.attempt}</span>}
    </div>
    <div className="ygo-puzzle-hud-goal">{view.goalText}</div>
    <div className="ygo-puzzle-hud-policy">{opponentPolicyText(view.opponentPolicy)}</div>
    {progress && <div className="ygo-puzzle-hud-progress" aria-label={progress.label}>
      <div className="ygo-puzzle-hud-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={progress.target} aria-valuenow={progress.dealt}>
        <div className="ygo-puzzle-hud-progress-fill" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
      </div>
      <span className="ygo-puzzle-hud-progress-label">{progress.label}</span>
    </div>}
    {view.status === "playing" && view.hint && <div className="ygo-puzzle-hud-hint">
      {showHint
        ? <p>{view.hint}</p>
        : <button type="button" className="ygo-btn ygo-btn-action ygo-btn-sm" onClick={() => setShowHint(true)}>Show hint</button>}
    </div>}
    {result && !dismissed && <div className="ygo-puzzle-hud-result" role="status" aria-live="assertive">
      <div className="ygo-puzzle-hud-result-title">{result}</div>
      {view.reason && <p className="ygo-puzzle-hud-result-reason">{view.reason}</p>}
      <div className="ygo-puzzle-hud-actions">
        <button type="button" className="ygo-btn ygo-btn-action ygo-btn-sm" onClick={() => setDismissed(true)}>Look at the board</button>
        <button type="button" className="ygo-btn ygo-btn-primary ygo-btn-sm" disabled={retrying} onClick={retry}>
          {retrying ? "Starting…" : view.status === "solved" ? "Play again" : "Try again"}
        </button>
      </div>
    </div>}
    {result && dismissed && <div className="ygo-puzzle-hud-actions">
      <span className="ygo-puzzle-hud-result-chip">{result}</span>
      <button type="button" className="ygo-btn ygo-btn-primary ygo-btn-sm" disabled={retrying} onClick={retry}>
        {retrying ? "Starting…" : "Try again"}
      </button>
    </div>}
  </div>
}
