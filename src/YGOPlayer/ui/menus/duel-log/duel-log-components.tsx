import { memo } from "react";

export const DuelLogRow = memo(function ({ log, children }: { log: any, children: any }) {

    const player = `ygo-player-${log.player}`;

    return <div className={`ygo-duel-log-row ${player}`}>
        {children}
    </div>
});

export function DuelLogContainer({ children }: { children: any }) {
    return <div className="ygo-duel-log-content">
        {children}
    </div>
};