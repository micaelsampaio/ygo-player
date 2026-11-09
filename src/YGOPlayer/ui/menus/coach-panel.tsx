import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { YGODuel } from "../../core/YGODuel";
import type { CoachState } from "../../core/YGOCoachController";
import { YGOClientType } from "ygo-core";
import { useDuelTurnState } from "../use-duel-turn-state";
import { coachLines, useCoachNow } from "./use-coach-now";
import { usePanelPlacement } from "./use-panel-placement";

const NO_COACH: CoachState = {
  available: false, enabled: false, everEnabled: false, switching: false, stats: null,
  suggest: { status: "idle" }, preview: { status: "idle" }, error: null, messages: [],
};
const noop = () => () => {};

/** The duel's coach state, live (a spectator / judge never gets a coach). */
export function useCoach(duel: YGODuel): CoachState {
  const controller = duel.coachController;
  const seated = duel.client?.type === YGOClientType.PLAYER;
  return useSyncExternalStore(
    seated && controller ? controller.subscribe : noop,
    seated && controller ? controller.getState : () => NO_COACH,
    () => NO_COACH,
  );
}

/** Shown whenever the host offers a coach (off: just the switch). */
export function coachPanelVisible(state: CoachState): boolean {
  return state.available;
}

const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
/** Mouse clicks don't focus the coach's controls: Space stays the options panel's Continue / Next Phase. */
const keepFocusOff = (e: { preventDefault(): void }) => e.preventDefault();

/**
 * Duel Coach (bot / solo duels with assist.coach): a small toolbar (the on/off switch, and "Suggest
 * my turn" on your Main Phase 1). What the coach has to say goes to the duel chat, as it happens,
 * for this player only (useCoachMessages); the tags on your options stay where you decide.
 */
export function CoachPanel({ duel, isMobileLayout = false }: { duel: YGODuel; isMobileLayout?: boolean }) {
  const state = useCoach(duel);
  const turnState = useDuelTurnState(duel);
  useCoachMessages(duel, state, turnState);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const placement = usePanelPlacement(panelRef, isMobileLayout, false, { key: "ygo-coach-panel-place", docked: DOCKED });
  const nudge = useStayClear(panelRef, placement.style);

  if (!coachPanelVisible(state)) return null;
  const controller = duel.coachController;
  return (
    <CoachPanelView
      state={state}
      turn={turnState.turn}
      canSuggest={turnState.isLocalTurn && !!duel.isGameActive}
      showSuggest={turnState.isLocalTurn && turnState.phase === "Main Phase 1"}
      isMobileLayout={isMobileLayout}
      panelRef={panelRef}
      placementStyle={{ ...placement.style, ...nudge }}
      onHeaderPointerDown={placement.onHeaderPointerDown}
      onResetPosition={placement.resetPosition}
      onSetEnabled={(on) => { void controller.setEnabled(on); }}
      onSuggest={() => { void controller.suggest(turnState.turn); }}
    />
  );
}

/** Posts the coach's lines for the moment the duel is in (each once; see coachLines). */
function useCoachMessages(duel: YGODuel, state: CoachState, turnState: ReturnType<typeof useDuelTurnState>) {
  const active = state.available && state.enabled;
  const now = useCoachNow(duel, state.stats, turnState, active);
  useEffect(() => {
    if (!active || !now) return;
    for (const line of coachLines(now, state.stats, turnState)) duel.coachController.post(line.key, line.text);
  });
}

/** Where the coach docks until it's dragged: left of the board, clear of the card details. */
const DOCKED = {
  desktop: { top: 12, left: 316, right: "auto" },
  mobile: { top: 8, left: 72, right: "auto" },
} satisfies { desktop: CSSProperties; mobile: CSSProperties };

const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Keeps the coach off the Assisted Options panel (dragged next to it, or docked where the options
 * panel was dragged): moves it below that panel, or beside it when there's no room below. Not
 * remembered; it re-checks on every render and window resize.
 */
function useStayClear(panelRef: { current: HTMLDivElement | null }, base: CSSProperties): CSSProperties {
  const [nudge, setNudge] = useState<CSSProperties>({});
  const key = JSON.stringify(nudge);
  useLayoutEffect(() => {
    const check = () => {
      const panel = panelRef.current;
      const parent = panel?.offsetParent as HTMLElement | null;
      const other = parent?.querySelector<HTMLElement>(".ygo-assisted-options-panel");
      if (!panel || !parent || !other) { if (key !== "{}") setNudge({}); return; }
      const p = parent.getBoundingClientRect();
      const o = other.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const left = typeof base.left === "number" ? p.left + base.left : panel.getBoundingClientRect().left;
      const top = typeof base.top === "number" ? p.top + base.top : panel.getBoundingClientRect().top;
      if (!overlaps(new DOMRect(left, top, width, height), o)) { if (key !== "{}") setNudge({}); return; }
      const below = o.bottom - p.top + 8;
      const next: CSSProperties = below + height <= p.height ? { top: below } : { left: o.right - p.left + 8, right: "auto" };
      if (JSON.stringify(next) !== key) setNudge(next);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  });
  return nudge;
}

export interface CoachPanelViewProps {
  state: CoachState;
  turn: number;
  /** Your own turn (the suggestion is for your turn). */
  canSuggest: boolean;
  /** Your Main Phase 1: the Suggest button shows (defaults to canSuggest). */
  showSuggest?: boolean;
  isMobileLayout?: boolean;
  panelRef?: { current: HTMLDivElement | null };
  placementStyle?: CSSProperties;
  onHeaderPointerDown?(e: { clientX: number; clientY: number; button: number; preventDefault(): void; stopPropagation(): void }): void;
  onResetPosition?(): void;
  onSetEnabled(on: boolean): void;
  onSuggest(): void;
}

export function CoachPanelView({
  state, turn, canSuggest, showSuggest = canSuggest, isMobileLayout = false,
  panelRef, placementStyle, onHeaderPointerDown, onResetPosition, onSetEnabled, onSuggest,
}: CoachPanelViewProps) {
  const placement: CSSProperties = placementStyle ?? (isMobileLayout ? DOCKED.mobile : DOCKED.desktop);
  const s = state.suggest;
  const loading = s.status === "loading";
  const done = s.status === "done" && s.turn === turn ? s.result : null;
  return (
    <div
      ref={panelRef}
      className="ygo-card-menu ygo-coach-panel"
      role="region"
      aria-label="Coach"
      style={{ ...placement, width: "auto", maxWidth: 260, gap: 6 }}
      onClick={stop}
      onMouseDown={stop}
      onMouseUp={stop}
      onMouseMove={stop}
      onWheel={stop}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onDoubleClick={onResetPosition}
        title={onHeaderPointerDown ? "Drag to move · double-click to dock back" : undefined}
        style={{ display: "flex", alignItems: "center", gap: 8, userSelect: "none", touchAction: "none", cursor: onHeaderPointerDown ? "grab" : undefined }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, whiteSpace: "nowrap" }}>Coach</span>
        <label
          title={state.enabled ? "Turn the coach off" : "Turn the coach on (its tips show in the chat)"}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: state.switching ? "wait" : "pointer", opacity: 0.85 }}
          onMouseDown={keepFocusOff}
          onPointerDown={stop}
        >
          <input
            type="checkbox"
            role="switch"
            aria-label="Coach"
            checked={state.enabled}
            disabled={state.switching}
            onChange={(e) => onSetEnabled(e.currentTarget.checked)}
          />
          {state.enabled ? "On" : "Off"}
        </label>
        {state.enabled && showSuggest && (
          <button
            type="button"
            className="ygo-card-item"
            disabled={loading || !canSuggest || !!done?.available}
            aria-busy={loading}
            onMouseDown={keepFocusOff}
            onPointerDown={stop}
            onClick={onSuggest}
            title={done?.available ? "The line is in the chat" : "Find a line for this turn"}
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 12, padding: "3px 8px", margin: 0 }}
          >
            {loading ? "Thinking…" : done?.available ? "Line in chat" : "Suggest my turn"}
            {loading && <span className="ygo-inline-spinner" aria-hidden="true" />}
          </button>
        )}
      </div>
      {state.error && (
        <div role="alert" style={{ fontSize: 12, lineHeight: 1.35, padding: "5px 8px", borderRadius: 4, background: "rgba(220, 38, 38, 0.18)", borderLeft: "3px solid rgb(239, 68, 68)", color: "#fecaca" }}>
          {state.error}
        </div>
      )}
      {state.enabled && showSuggest && done && !done.available && (
        <div role="status" style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>{done.reason}</div>
      )}
    </div>
  );
}
