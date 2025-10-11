import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import "./style.css";
import { YGODuelEvents, YGOPlayerState } from "ygo-core";
import { YGOStatic } from "../../../core/YGOStatic";
import { Thinking, ViewDeck } from "./player-states";

enum LifePointsState {
    IDLE,
    INCREASING,
    DECREASING,
}

// const PLAYER_STATES = {
//     [YGOPlayerState.IDLE]: null,
//     [YGOPlayerState.THINKING]: Thinking,
//     [YGOPlayerState.VIEW_DECK]: ViewDeck,
// }
export function PlayerHUD({ duel, player }: { duel: YGODuel, player: number }) {
    const playerPOV = YGOStatic.isPlayerPOV(player) ? 0 : 1;
    const field = duel.ygo.getField(player);
    const state = field.state;
    const playerName = field.player.name;
    const { LP, lifePointsState } = usePlayerLp(duel, player);

    const changeLifePoints = () => {
        const value = prompt("LPS:");

        if (value) {
            duel.gameActions.lifePointsTransaction({
                player,
                value,
            });
        }
    }

    const lpsClass = lifePointsState === LifePointsState.INCREASING
        ? " ygo-lp-increasing"
        : lifePointsState === LifePointsState.DECREASING
            ? " ygo-lp-decreasing" : "";

    return <div className={`ygo-player-hud ygo-player-${playerPOV}`}>
        <div className="ygo-player-hude-player-content">
            <div className="ygo-player-hud-bar"></div>
            <div className="ygo-player-hud-name">
                {playerName}
            </div>
            <div className={`ygo-player-hud-lp ${lpsClass} ygo-flex ygo-gap-1`} onClick={changeLifePoints}>
                <span className="ygo-lp-text" style={{ marginTop: "auto" }}>
                    LP</span>
                <span className="ygo-lp-value">{LP}</span>
            </div>
            <div className="ygo-player-hud-bar"></div>
        </div>
    </div>
}

function usePlayerLp(duel: YGODuel, player: number): { LP: number, lifePointsState: LifePointsState } {
    const field = duel.ygo.getField(player);
    const [lps, setLps] = useState<number>(field.lp);
    const [lifePointsState, setLifePointsState] = useState<LifePointsState>(LifePointsState.IDLE);
    const animationRef = useRef<number | null>(null);
    const currentLpValue = useRef(field.lp);

    const animateLps = (oldLps: number, newLps: number) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        const state = oldLps > newLps ? LifePointsState.DECREASING : oldLps < newLps ? LifePointsState.INCREASING : LifePointsState.IDLE;
        const step = oldLps > newLps ? -Math.ceil((oldLps - newLps) / 20) : Math.ceil((newLps - oldLps) / 20);
        let current = oldLps;

        setLifePointsState(state);

        const animate = () => {
            current += step;

            if ((step < 0 && current <= newLps) || (step > 0 && current >= newLps)) {
                setLps(newLps); setLifePointsState(state);
                setLifePointsState(LifePointsState.IDLE);
                animationRef.current = null;
                return;
            }

            setLps(current);
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();
    };

    useEffect(() => {
        const abortController = new AbortController();

        duel.events.on("duel-update-player-life-points", ({ player: playerIndex, previousLifePoints, lifePoints }: YGODuelEvents.LifePoints) => {
            if (playerIndex !== player) return;

            if (previousLifePoints != lifePoints) {
                currentLpValue.current = lifePoints;
                animateLps(previousLifePoints, lifePoints);
            }
        }, { signal: abortController.signal });

        return () => {
            abortController.abort();
        };
    }, []);

    useEffect(() => {
        if (field.lp !== currentLpValue.current) {
            currentLpValue.current = field.lp;
            setLps(field.lp);
            setLifePointsState(LifePointsState.IDLE);

            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }
    }, [field.lp]);

    return { LP: lps, lifePointsState };
}
