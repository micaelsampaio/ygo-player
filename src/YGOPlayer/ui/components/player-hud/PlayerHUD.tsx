import { YGODuel } from "../../../core/YGODuel";
import "./style.css";

export function PlayerHUD({ duel, player }: { duel: YGODuel, player: number }) {

    const field = duel.ygo.getField(player);
    const playerName = field.player.name;
    const LP = field.lp;

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