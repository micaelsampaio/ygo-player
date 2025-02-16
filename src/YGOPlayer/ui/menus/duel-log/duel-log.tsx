import { useEffect, useState } from "react"
import { YGODuel } from "../../../core/YGODuel";
import "./duel-log.css";
import { YGODuelEvents, YGODuelLog } from "../../../../YGOCore";
import { DefaultLogRow } from "./default-log";
import { SimpleLogRow } from "./log-simple";

const COMPONENTS = {
    [YGODuelEvents.LogType.StartHand]: SimpleLogRow,
    default: DefaultLogRow
}

export function DuelLogMenu({ duel }: { duel: YGODuel }) {
    const [logs, setLogs] = useState<YGODuelEvents.DuelLog[]>([])

    useEffect(() => {
        if (!duel) return;

        duel.events.on("logs-updated", (logs: any) => {
            setLogs([...logs]);
        });
    }, [duel]);

    const undo = () => {
        duel.commands.startRecover();
        duel.ygo.undo();
        duel.updateField();
        duel.commands.endRecover();
    }

    const undoByCommand = (logIndex: number) => {
        duel.commands.startRecover();
        for (let i = logs.length - 1; i >= logIndex; --i) {
            duel.ygo.undo();
        }
        duel.updateField();
        duel.commands.endRecover();
    }

    return <div className="ygo-duel-log-container">
        <div className="ygo-logs">
            {logs.map((log, index) => {
                const Component = (COMPONENTS as any)[log.type] || COMPONENTS.default;

                return <Component
                    key={index + log.type}
                    duel={duel}
                    ygo={duel.ygo}
                    index={index}
                    undoByCommandIndex={undoByCommand}
                    log={log}
                />
            })}

            <div onClick={undo}>
                <button>undo</button>
            </div>
        </div>
    </div>
}