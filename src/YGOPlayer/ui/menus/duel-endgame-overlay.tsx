import { YGOStatic } from "../../core/YGOStatic";

export function DuelEndGameOverlay({ loser }: { loser: number }) {

  const winner = !YGOStatic.isPlayerPOV(loser);

  return <div className="ygo-end-game-overlay">
    {winner && <div className="ygo-winner-text">Victory</div>}
    {!winner && <div className="ygo-loser-text">Defeated</div>}
  </div>
}