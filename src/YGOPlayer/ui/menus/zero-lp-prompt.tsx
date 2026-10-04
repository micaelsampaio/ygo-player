import { useCallback, useEffect } from "react";
import { YGODuel } from "../../core/YGODuel";

const stopPointer = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * Local duels (config.options.zeroLpPrompt): a player's life points reached 0. Nothing ends a
 * local duel by itself (it's free play: the hit can be undone or the test played on), so the
 * player chooses: end it (the 0 LP player admits defeat, as online duels do) or keep playing.
 */
export function ZeroLpPrompt({ duel, player }: { duel: YGODuel; player: number }) {
  const name = duel.ygo.getField(player)?.player?.name || `Player ${player + 1}`;
  const winner = duel.ygo.getField(player === 0 ? 1 : 0)?.player?.name || `Player ${player === 0 ? 2 : 1}`;

  const close = useCallback(() => {
    duel.events.dispatch("close-ui-menu", { type: "zero-lp-prompt" });
  }, [duel]);

  // Undoing the hit (or any LP gain) takes the player off 0: the question no longer applies.
  useEffect(() => {
    const onLp = (data: { player: number; lp: number }) => {
      if (data.player === player && data.lp > 0) close();
    };
    duel.ygo.events.on("set-player-lp", onLp);
    return () => duel.ygo.events.off("set-player-lp", onLp);
  }, [duel, player, close]);

  const endDuel = useCallback(() => {
    close();
    duel.gameActions.admitDefeat({ player });
  }, [duel, player, close]);

  return <div
    className="ygo-end-game-overlay"
    role="alertdialog"
    aria-label={`${name} has 0 life points`}
    onMouseDown={stopPointer}
    onMouseUp={stopPointer}
    onClick={stopPointer}
  >
    <div className="ygo-neutral-result-text">{name} has 0 LP</div>
    <div className="ygo-end-game-actions">
      <button type="button" className="ygo-btn ygo-btn-primary" onClick={endDuel}>
        End the duel: {winner} wins
      </button>
      <button type="button" className="ygo-btn ygo-btn-action" onClick={close}>
        Keep playing
      </button>
    </div>
  </div>;
}
