import { useEffect, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { YGODuelEvents } from "ygo-core";
import { DefaultLogRow } from "./default-log";
import { StartHandLogRow } from "./start-hand";
import "./duel-log.css";

const COMPONENTS = {
  [YGODuelEvents.LogType.StartHand]: StartHandLogRow,
  default: DefaultLogRow,
};

export function DuelLogMenu({ duel, menus }: { duel: YGODuel; menus: any[] }) {
  const [logs, setLogs] = useState<YGODuelEvents.DuelLog[]>([]);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    if (!duel) return;

    duel.events.on("logs-updated", (logs: any) => {
      setLogs([...logs]);
    });
  }, [duel]);

  useEffect(() => {
    setVisible(menus.some((menu) => menu.type === "duel-log"));
  }, [menus]);

  const undo = () => {
    duel.commands.startRecover();
    duel.ygo.undo();
    duel.updateField();
    duel.commands.endRecover();
  };

  const undoByCommand = (logIndex: number) => {
    duel.commands.startRecover();
    for (let i = logs.length - 1; i >= logIndex; --i) {
      duel.ygo.undo();
    }
    duel.updateField();
    duel.commands.endRecover();
  };

  return (
    <div className={`ygo-duel-log-container ${isVisible ? "" : "ygo-hidden"}`}>
      <div className="ygo-logs">
        {logs.map((log, index) => {
          const Component = (COMPONENTS as any)[log.type] || COMPONENTS.default;

          return (
            <Component
              key={index + log.type}
              duel={duel}
              ygo={duel.ygo}
              index={index}
              undoByCommandIndex={undoByCommand}
              log={log}
            />
          );
        })}

        <div onClick={undo}>
          <button>undo</button>
        </div>
      </div>
    </div>
  );
}
