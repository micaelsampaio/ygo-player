import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import "./style.css";

export function PlayerHUD({ duel, player }: { duel: YGODuel, player: number }) {

    const field = duel.ygo.getField(player);
    const playerName = field.player.name;
    const LP = usePlayerLp(duel, player);

    const test = () => {
        const value = prompt("LPS:");

        if (value) {
            duel.gameActions.lifePointsTransaction({
                player,
                value,
            });
        }
    }

    return <div className={`ygo-player-hud ygo-player-${player}`}>
        <div className="ygo-player-hude-player-content">
            <div className="ygo-player-hud-bar"></div>
            <div className="ygo-player-hud-name">
                {playerName}
            </div>
            <div className="ygo-player-hud-lp" onClick={test}>
                <span className="ygo-lp-text">LP</span> <span className="ygo-lp-value">{LP}</span>
            </div>
            <div className="ygo-player-hud-bar"></div>
        </div>
    </div>
}

function usePlayerLp(duel: YGODuel, player: number) {
    const field = duel.ygo.getField(player);
    const [lps, setLps] = useState<number>(field.lp);
    const animationRef = useRef<number | null>(null);

    const animateLps = (oldLps: number, newLps: number) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        const step = oldLps > newLps ? -Math.ceil((oldLps - newLps) / 20) : Math.ceil((newLps - oldLps) / 20);
        let current = oldLps;

        const animate = () => {
            current += step;

            if ((step < 0 && current <= newLps) || (step > 0 && current >= newLps)) {
                setLps(newLps);
                animationRef.current = null;
                return;
            }

            setLps(current);
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();
    };

    useEffect(() => {
        const listener = ({ player: playerIndex, lp: newLp }: { player: number; lp: number }) => {
            if (playerIndex !== player) return;
            animateLps(lps, newLp);
        };

        duel.ygo.events.on("set-player-lp", listener);
        return () => {
            duel.ygo.events.off("set-player-lp", listener);
        };
    }, [lps]);

    return lps;
}
