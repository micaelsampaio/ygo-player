import { useCallback } from "react";
import { YGODuel } from "../../core/YGODuel";

export function ChangeGamePlayer({ duel }: { duel: YGODuel }) {
    const player = duel.getActivePlayer();

    const changePlayer = useCallback(() => {
        duel.setActivePlayer(player === 0 ? 1 : 0);
    }, [player]);

    return <div className="ygo-player-overlay" onClick={changePlayer}>
        <div className={`ygo-player-1 ${player === 0 ? "active" : ""}`}>1</div>
        <div className={`ygo-player-2 ${player === 1 ? "active" : ""}`}>2</div>
    </div>
}