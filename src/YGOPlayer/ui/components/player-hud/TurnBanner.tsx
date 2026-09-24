import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { YGOStatic } from "../../../core/YGOStatic";
import { useDuelTurnState } from "../../use-duel-turn-state";
import { turnOwnerLabel } from "../../duel-status";

const BANNER_MS = 1800;

/** Short "Your turn" / "Opponent's turn" flash on each turn change. The
 * live region stays mounted so screen readers announce the change too. */
export function TurnBanner({ duel }: { duel: YGODuel }) {
    const { turn, turnPlayer, isPlayerClient, isLocalTurn } = useDuelTurnState(duel);
    const [visible, setVisible] = useState(false);
    const lastTurn = useRef(turn);

    useEffect(() => {
        if (turn === lastTurn.current) return;
        lastTurn.current = turn;
        // Seated players only — a replay scrubbing through turns would strobe it.
        if (turn < 1 || !isPlayerClient) return;
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), BANNER_MS);
        return () => clearTimeout(timer);
    }, [turn, isPlayerClient]);

    const text = turnOwnerLabel({ isPlayerClient, isLocalTurn });
    const side = YGOStatic.getPlayerCssIndex(turnPlayer);

    return <div className="ygo-turn-banner-live" role="status" aria-live="polite">
        {visible && <div className={`ygo-turn-banner ygo-player-${side}`}>{text}</div>}
    </div>
}
