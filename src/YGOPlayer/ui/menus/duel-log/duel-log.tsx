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
    console.log(logs)

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
        LOGS: {logs.length}

        <div className="ygo-logs">
            {logs.map((log, index) => {
                const Component = (COMPONENTS as any)[log.type] || COMPONENTS.default;

                return <Component
                    key={index + log.type}
                    duel={duel}
                    ygo={duel.ygo}
                    index={index}
                    log={log}
                />

                // return <div key={index + log.type}>
                //     <div className="ygo-flex ygo-gap-2">
                //         <div style={{ width: "8px", height: "24px", background: log.player === 0 ? "blue" : "red" }}>
                //         </div>
                //         <div>
                //             <button onClick={() => undoByCommand(index)}>{log.type}</button>
                //         </div>
                //     </div>
                // </div>
            })}

            <div onClick={undo}>
                <button>undo</button>
            </div>
        </div>
    </div>
}