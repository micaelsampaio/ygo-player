import { useCallback, useEffect, useState } from "react";
import { YGOClientType } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { YGOStatic } from "../../core/YGOStatic";
import { END_GAME_ACTION_LABELS, YGOEndGameAction, endGameActionsFor, endGameHeadline } from "../duel-status";
import { AvailableReview, isShowableReview, reviewSourceOf } from "./duel-review/duel-review";
import { DuelReviewPanel } from "./duel-review/duel-review-panel";

const stopPointer = (e: React.SyntheticEvent) => e.stopPropagation();

export function DuelEndGameOverlay({ duel, loser }: { duel: YGODuel, loser: number }) {
  const isPlayerClient = duel.client?.type === YGOClientType.PLAYER && duel.config.gameMode !== "REPLAY";
  const winner = loser === 0 ? 1 : 0;
  const winnerName = duel.ygo.getField(winner)?.player?.name;
  const { text, tone } = endGameHeadline({
    isPlayerClient,
    localPlayerLost: YGOStatic.isPlayer(loser),
    winnerName,
  });

  // Bot duels: the review of the player's own decisions ("Review my plays"),
  // fetched once in the background — the button only appears once there is one.
  const [review, setReview] = useState<AvailableReview | null>(null);
  const [showReview, setShowReview] = useState(false);
  useEffect(() => {
    const source = isPlayerClient ? reviewSourceOf(duel) : null;
    if (!source) return;
    let active = true;
    source.review()
      .then((res) => { if (active && isShowableReview(res)) setReview(res); })
      .catch(() => { });
    return () => { active = false; };
  }, [duel, isPlayerClient]);

  const viewLog = useCallback(() => {
    // Same "game-overlay" group, so the log takes this overlay's place.
    duel.events.dispatch("set-ui-menu", { group: "game-overlay", type: "duel-log" });
  }, [duel]);

  const close = useCallback(() => {
    duel.events.dispatch("close-ui-menu", { type: "duel-endgame-overlay" });
  }, [duel]);

  // Next steps are the host's to handle (save dialog, new room, navigation),
  // so they're only forwarded through the web component's "end-game-action".
  const nextSteps = endGameActionsFor({ isPlayerClient, enabled: duel.config.endGameActions });
  const runNextStep = useCallback(async (action: YGOEndGameAction) => {
    let replay = null;
    if (action === "save-replay") {
      try {
        // From the server when it holds the hidden information (see YGODuel.getReplayData).
        replay = await duel.getReplayData();
      } catch { }
    }
    duel.events.dispatch("end-game-action", { action, loser, replay });
  }, [duel, loser]);

  if (showReview && review) {
    return <div
      className="ygo-end-game-overlay"
      role="dialog"
      aria-label="Review of your plays"
      onMouseDown={stopPointer}
      onMouseUp={stopPointer}
      onClick={stopPointer}
    >
      <DuelReviewPanel result={review} onClose={() => setShowReview(false)} />
    </div>;
  }

  return <div
    className="ygo-end-game-overlay"
    role="alertdialog"
    aria-label={text}
    onMouseDown={stopPointer}
    onMouseUp={stopPointer}
    onClick={stopPointer}
  >
    <div className={tone === "win" ? "ygo-winner-text" : tone === "loss" ? "ygo-loser-text" : "ygo-neutral-result-text"}>
      {text}
    </div>
    {nextSteps.length > 0 && <div className="ygo-end-game-actions">
      {nextSteps.map(action => <button
        key={action}
        type="button"
        className={`ygo-btn ${action === "rematch" ? "ygo-btn-success" : "ygo-btn-primary"}`}
        onClick={() => runNextStep(action)}
      >
        {END_GAME_ACTION_LABELS[action]}
      </button>)}
    </div>}
    <div className="ygo-end-game-actions">
      {review && <button type="button" className="ygo-btn ygo-btn-action" onClick={() => setShowReview(true)}>
        Review my plays
      </button>}
      <button type="button" className="ygo-btn ygo-btn-action" onClick={viewLog}>
        View Duel Log
      </button>
      <button type="button" className={`ygo-btn ${nextSteps.length > 0 ? "ygo-btn-action" : "ygo-btn-primary"}`} onClick={close}>
        See the Board
      </button>
    </div>
  </div>
}
