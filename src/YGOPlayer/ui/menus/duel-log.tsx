import { useEffect, useState } from "react"
import { YGODuel } from "../../core/YGODuel";

export function DuelLogMenu({ duel }: { duel: YGODuel }) {
    const [logs, setLogs] = useState<any[]>([])

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

    return <div className="ygo-timeline">
        LOGS: {logs.length}

        <div>
            {logs.map((log, index) => {
                return <div key={index + log.type}>
                    <button onClick={() => undoByCommand(index)}>{log.type}</button>
                </div>
            })}

            <div onClick={undo}>
                <button>undo</button>
            </div>
        </div>
    </div>
}