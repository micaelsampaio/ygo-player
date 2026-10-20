import { useEffect, useRef, useState } from "react";
import type { YGODuel } from "../../../core/YGODuel";
import { useDuelTurnState } from "../../use-duel-turn-state";
import { phaseLabel } from "../../duel-status";

export const PHASE_BANNER_MS = 1500;

/** Whether a phase change gets the banner: a seated player (a replay scrubbing would strobe it),
 * a phase that moved within the same turn (a new turn's Draw Phase has the turn banner). */
export function showsPhaseBanner(prev: { turn: number; phase: string } | null, next: { turn: number; phase: string }, isPlayerClient: boolean): boolean {
    if (!isPlayerClient || !prev || !next.phase || next.turn < 1) return false;
    return prev.turn === next.turn && prev.phase !== next.phase;
}

/** Dueling Nexus-style "Battle Phase" label at the top of the field on each phase change, in
 * every mode (manual duels too: it only reads the phase the 3D phase coin shows). */
export function PhaseBanner({ duel }: { duel: YGODuel }) {
    const { turn, phase, isPlayerClient } = useDuelTurnState(duel);
    const [shown, setShown] = useState<string | null>(null);
    const last = useRef<{ turn: number; phase: string } | null>(null);

    useEffect(() => {
        const next = { turn, phase };
        const show = showsPhaseBanner(last.current, next, isPlayerClient);
        last.current = next;
        if (!show) return;
        setShown(phaseLabel(phase));
        const timer = setTimeout(() => setShown(null), PHASE_BANNER_MS);
        return () => clearTimeout(timer);
    }, [turn, phase, isPlayerClient]);

    return <div className="ygo-phase-banner-wrap" role="status" aria-live="polite">
        {shown && <div className="ygo-phase-banner">{shown}</div>}
    </div>;
}
