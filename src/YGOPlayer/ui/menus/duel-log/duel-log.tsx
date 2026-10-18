import "./duel-log.css";
import { useEffect, useReducer, useRef, useState, type ComponentType } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { YGODuelEvents } from "ygo-core";
import { DefaultLogRow } from "./default-log";
import { StartHandLogRow } from "./start-hand";
import { LifePointsLogRow } from "./lp-log";
import { NoteLogRow } from "./note-log";
import { stopPropagationCallback } from "../../../scripts/utils";
import { DuelPhaseLogRow } from "./duel-log-phase";
import { DuelTurnLogRow } from "./duel-log-turn";
import { CoinFlipLogRow } from "./coin-flip-log";
import { DiceRollLogRow } from "./dice-roll-log";
import { AdmitDefeatLogRow } from "./admit-defeat-log";
import { ShowHandLogRow } from "./show-hand-log";
import { ChainResolvedLogRow } from "./chain-resolved-log";
import { ChainLinkResolvedLogRow } from "./chain-link-resolved-log";
import type { LogRowProps } from "./log-row-props";
import { subscribeDuelLogs } from "./duel-log-subscription";
import type { UiMenuState } from "../../ui-types";

/** Each log type's row; a row's props narrow `log` to its own log type. */
const COMPONENTS: Partial<Record<string, ComponentType<LogRowProps<never>>>> = {
  [YGODuelEvents.LogType.DuelTurn]: DuelTurnLogRow,
  [YGODuelEvents.LogType.DuelPhase]: DuelPhaseLogRow,
  [YGODuelEvents.LogType.StartHand]: StartHandLogRow,
  [YGODuelEvents.LogType.SwapHand]: StartHandLogRow,
  [YGODuelEvents.LogType.ShowHand]: ShowHandLogRow,
  [YGODuelEvents.LogType.LifePoints]: LifePointsLogRow,
  [YGODuelEvents.LogType.Note]: NoteLogRow,
  [YGODuelEvents.LogType.CoinFlip]: CoinFlipLogRow,
  [YGODuelEvents.LogType.DiceRoll]: DiceRollLogRow,
  [YGODuelEvents.LogType.AdmitDefeat]: AdmitDefeatLogRow,
  [YGODuelEvents.LogType.ChainResolved]: ChainResolvedLogRow,
  [YGODuelEvents.LogType.ChainLinkResolved]: ChainLinkResolvedLogRow,
};

/** The row component for `log` (DefaultLogRow for card moves and anything unlisted). */
function rowFor(log: YGODuelEvents.DuelLog): ComponentType<LogRowProps> {
  // COMPONENTS is keyed by log type, so the row's log type matches `log`.
  return (COMPONENTS[log.type] ?? DefaultLogRow) as ComponentType<LogRowProps>;
}

export function DuelLogMenu({ duel, menus }: { duel: YGODuel; menus: UiMenuState[] }) {
  // The core sends the same array each time, so it is kept by reference and a
  // version bump re-renders, instead of copying every log on every update.
  // The rows are memoised on their log, so only new rows render.
  const logsRef = useRef<YGODuelEvents.DuelLog[]>([]);
  const [logsVersion, logsChanged] = useReducer((version: number) => version + 1, 0);
  const logs = logsRef.current;
  const [isVisible, setVisible] = useState(false);
  const duelLogsContainer = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<boolean>(true);
  const scrollTimerRef = useRef<number>(-1);

  const undo = () => {
    duel.commands.startRecover();
    duel.ygo.undo();
    duel.updateField();
    duel.commands.endRecover();
  };

  const scrollToBottom = () => {
    if (duelLogsContainer.current) {
      scrollBottomRef.current = true;
      duelLogsContainer.current.scrollTop = duelLogsContainer.current.scrollHeight;
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = window.setTimeout(() => {
        scrollBottomRef.current = true;
        duelLogsContainer.current!.scrollTop = duelLogsContainer.current!.scrollHeight;
      }, 10);
    }
  }

  useEffect(() => {
    if (!duel) return;

    return subscribeDuelLogs(duel, (updated) => {
      logsRef.current = updated;
      logsChanged();
    });
  }, [duel]);

  useEffect(() => {
    setVisible(menus.some((menu) => menu.type === "duel-log"));
  }, [menus]);

  useEffect(() => {
    if (isVisible) {
      if (scrollBottomRef.current) {
        scrollToBottom();
      }
    }
  }, [isVisible, logsVersion]);

  useEffect(() => {
    if (isVisible) {
      scrollToBottom();

      const container = duelLogsContainer.current;

      if (!container) return;

      const onScroll = () => {
        const scrollHeight = container.scrollHeight;
        const scrollTop = container.scrollTop;
        const clientHeight = container.clientHeight;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        scrollBottomRef.current = isNearBottom;
      }

      container.addEventListener("scroll", onScroll);

      return () => {
        container.removeEventListener("scroll", onScroll);
      }
    } else {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = -1;
    }

  }, [isVisible])

  return (
    <div className={`ygo-duel-log-container ${isVisible ? "" : "ygo-hidden"}`} ref={duelLogsContainer}
      role="presentation"
      onClick={stopPropagationCallback}
      onMouseMove={stopPropagationCallback}
      onMouseDown={stopPropagationCallback}
      onMouseUp={stopPropagationCallback}
    >
      <div className="ygo-logs">
        {logs.map((log, index) => {
          if (log.type === YGODuelEvents.LogType.Target) return null;
          const Component = rowFor(log);

          return (
            <Component
              key={index + log.type}
              duel={duel}
              ygo={duel.ygo}
              index={index}
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
