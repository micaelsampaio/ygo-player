import { memo } from "react";
import { useDuelPerspective } from "../../duel-perspective";

export const DuelLogRow = memo(function ({ log, children }: { log: any, children: any }) {

    const perspective = useDuelPerspective();
    const player = `ygo-player-${perspective.getPlayerCssIndex(log.player)}`;

    return <div className={`ygo-duel-log-row ${player}`}>
        {children}
    </div>
});

export function DuelLogContainer({ children }: { children: any }) {
    return <div className="ygo-duel-log-content">
        {children}
    </div>
};