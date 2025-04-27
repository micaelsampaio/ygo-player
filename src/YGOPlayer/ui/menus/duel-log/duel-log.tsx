import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { YGODuelEvents } from "ygo-core";
import { DefaultLogRow } from "./default-log";
import { StartHandLogRow } from "./start-hand";
import { LifePointsLogRow } from "./lp-log";
import "./duel-log.css";

const COMPONENTS = {
  [YGODuelEvents.LogType.StartHand]: StartHandLogRow,
  [YGODuelEvents.LogType.LifePoints]: LifePointsLogRow,
  default: DefaultLogRow,
};

export function DuelLogMenu({ duel, menus }: { duel: YGODuel; menus: any[] }) {
  const [logs, setLogs] = useState<YGODuelEvents.DuelLog[]>([]);
  const [isVisible, setVisible] = useState(false);
  const duelLogsContainer = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!duel) return;

    duel.events.on("logs-updated", (logs: any) => {
      setLogs([...logs]);
    });
  }, [duel]);

  useEffect(() => {
    setVisible(menus.some((menu) => menu.type === "duel-log"));
  }, [menus]);

  useEffect(() => {
    if (isVisible && duelLogsContainer.current) {
      duelLogsContainer.current.scrollTop = duelLogsContainer.current.scrollHeight;
    }
  }, [isVisible])

  return (
    <div className={`ygo-duel-log-container ${isVisible ? "" : "ygo-hidden"}`} ref={duelLogsContainer}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseMove={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
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
