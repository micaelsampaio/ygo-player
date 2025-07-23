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

  const scrollToBottom = () => {
    if (duelLogsContainer.current) {
      duelLogsContainer.current.scrollTop = duelLogsContainer.current.scrollHeight;
    }
  }

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
      scrollToBottom();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && duelLogsContainer.current) {
      const container = duelLogsContainer.current;
      const scrollHeight = container.scrollHeight;
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [isVisible, logs]);
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

        {logs?.length > 0 && <div className="ygo-flex ygo-mt-2 ygo-p-2">
          <button className="ygo-btn ygo-btn-action ygo-flex-grow-1" onClick={undo}>
            <div>Undo Action</div>
            <div className="ygo-btn-right-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M280-200v-80h284q63 0 109.5-40T720-420q0-60-46.5-100T564-560H312l104 104-56 56-200-200 200-200 56 56-104 104h252q97 0 166.5 63T800-420q0 94-69.5 157T564-200H280Z" /></svg>
            </div>
          </button>
        </div>}
      </div>
    </div>
  );
}
