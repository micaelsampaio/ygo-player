import { useEffect, useState } from "react";
import type { YGODuel } from "../../../core/YGODuel";
import { useDuelTurnState } from "../../use-duel-turn-state";

/** Long enough that a quick bot reply or an instant pass never flashes it. */
export const WAITING_DELAY_MS = 1200;

/** Whether the board should say it is waiting on the opponent: a seated player, mid-duel, with
 * the opponent holding priority, in a duel where the opponent is someone else (not a solo test
 * that controls both sides). */
export function isWaitingOnOpponent(s: { isPlayerClient: boolean; gameActive: boolean; turn: number; hasPriority: boolean; controlsBoth: boolean }): boolean {
    return s.isPlayerClient && s.gameActive && s.turn >= 1 && !s.hasPriority && !s.controlsBoth;
}

/** DuelingBook-style "Waiting for the opponent…" over the field while the opponent (bot or
 * player) holds priority. Clicks pass through it; it never covers the player's own prompts,
 * since there are none while the opponent has priority. */
export function WaitingBanner({ duel }: { duel: YGODuel }) {
    const { turn, isPlayerClient, hasPriority } = useDuelTurnState(duel);
    const waiting = isWaitingOnOpponent({
        isPlayerClient,
        gameActive: duel.isGameActive,
        turn,
        hasPriority,
        controlsBoth: !!(duel.ygo?.options as { controlOpponentCards?: boolean } | undefined)?.controlOpponentCards,
    });
    const [shown, setShown] = useState(false);

    useEffect(() => {
        if (!waiting) {
            setShown(false);
            return;
        }
        const timer = setTimeout(() => setShown(true), WAITING_DELAY_MS);
        return () => clearTimeout(timer);
    }, [waiting]);

    if (!shown) return null;
    return <div className="ygo-waiting-banner-wrap" aria-hidden="true">
        <div className="ygo-waiting-banner">Waiting for the opponent…</div>
    </div>;
}
