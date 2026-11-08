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
import { TurnOrderLogRow } from "./turn-order-log";
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
  [YGODuelEvents.LogType.TurnOrder]: TurnOrderLogRow,
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

/**
 * A search's reveal (ToHandCommand's reveal: the card shown from the hand) is part of its "To
 * Hand" row: the board shows it, the log doesn't list it again.
 */
export function isRevealOfItsToHand(logs: YGODuelEvents.DuelLog[], index: number): boolean {
  const log = logs[index] as { type: string; id?: number };
  const prev = logs[index - 1] as { type: string; id?: number } | undefined;
  return log.type === YGODuelEvents.LogType.Reveal && prev?.type === "To Hand" && prev.id === log.id;
}

/**
 * The steps of an activation that the core logs on their own lines are part of its "Activate" row
 * (which keeps where the card came from and its previous position): a Spell's move from the hand to
 * its zone right before it activates there, and a Set card's flip face-up right after it activates.
 * A move or flip of the card for any other reason is listed as before.
 */
export function isPartOfItsActivation(logs: YGODuelEvents.DuelLog[], index: number): boolean {
  type Row = { type: string; id?: number; zone?: string; originZone?: string };
  const log = logs[index] as Row;
  if (log.type === YGODuelEvents.LogType.MoveCard) {
    const next = logs[index + 1] as Row | undefined;
    return next?.type === YGODuelEvents.LogType.Activate && next.id === log.id && next.zone === log.zone;
  }
  if (log.type === YGODuelEvents.LogType.ChangeCardPosition) {
    const prev = logs[index - 1] as Row | undefined;
    return prev?.type === YGODuelEvents.LogType.Activate && prev.id === log.id && prev.zone === log.originZone;
  }
  return false;
}

/**
 * A card an effect Sets (Dracotail Urgula: "Set 1 Dracotail Spell/Trap" from the GY) is logged as a
 * move to its Spell & Trap Zone face-up and then a flip face-down: one "Set" row (where it came from
 * and the zone it went to), the board still plays both steps. True for the move of such a pair.
 */
export function isSetByMove(logs: YGODuelEvents.DuelLog[], index: number): boolean {
  type Row = { type: string; id?: number; zone?: string; originZone?: string; position?: string };
  const log = logs[index] as Row;
  const next = logs[index + 1] as Row | undefined;
  return log.type === YGODuelEvents.LogType.MoveCard && !!log.zone && log.position !== "facedown"
    && next?.type === YGODuelEvents.LogType.ChangeCardPosition && next.id === log.id && next.originZone === log.zone && next.position === "facedown";
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
      {/* Its own close, shown on phones (duel-log.css): there the log covers its floating button. */}
      <div className="ygo-duel-log-header">
        <span>Duel log</span>
        <button
          type="button"
          className="ygo-duel-log-close"
          aria-label="Close duel log"
          title="Close (D)"
          onClick={() => duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "duel-log" })}
        >
          ✕
        </button>
      </div>
      <div className="ygo-logs">
        {logs.map((log, index) => {
          if (log.type === YGODuelEvents.LogType.Target) return null;
          if (isRevealOfItsToHand(logs, index) || isPartOfItsActivation(logs, index)) return null;
          // The flip of a "Set" pair is its move's row.
          if (index > 0 && isSetByMove(logs, index - 1)) return null;
          const Component = rowFor(log);
          if (isSetByMove(logs, index)) {
            return <DefaultLogRow key={index + "Set"} duel={duel} ygo={duel.ygo} log={{ ...log, type: "Set" } as never} />;
          }

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


      </div>
    </div>
  );
}
