import { useCallback, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { YGODuel } from "../../core/YGODuel";
import type { CoachState } from "../../core/YGOCoachController";
import type { CoachOppAnswers, CoachStats } from "../../types";
import { YGOClientType } from "ygo-core";
import { endBoardText, percent, winRateText } from "../../domain/coach";
import { safeGetItem, safeSetItem } from "../../scripts/safe-storage";
import { useDuelTurnState } from "../use-duel-turn-state";

const NO_COACH: CoachState = {
  available: false, enabled: false, everEnabled: false, switching: false, stats: null,
  suggest: { status: "idle" }, preview: { status: "idle" }, error: null,
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

/** Shown whenever the host offers a coach; off, it's only the header with the switch. */
export function coachPanelVisible(state: CoachState): boolean {
  return state.available;
}

const COLLAPSED_KEY = "ygo-coach-panel-collapsed";

const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
/** Mouse clicks don't focus the coach's controls: Space stays the options panel's Continue / Next Phase. */
const keepFocusOff = (e: { preventDefault(): void }) => e.preventDefault();

/** Duel Coach: deck stats, "Suggest my turn" and the on/off switch (bot / solo duels with assist.coach). */
export function CoachPanel({ duel, isMobileLayout = false }: { duel: YGODuel; isMobileLayout?: boolean }) {
  const state = useCoach(duel);
  const turnState = useDuelTurnState(duel);
  // Phones: starts collapsed every duel (it would cover the board); desktop: remembered.
  // Off at the start: just the header with the switch, until it's turned on.
  const [collapsed, setCollapsed] = useState(() => isMobileLayout || !state.enabled || safeGetItem(COLLAPSED_KEY) === "1");
  const toggleCollapsed = useCallback(() => setCollapsed((c) => {
    if (!isMobileLayout) safeSetItem(COLLAPSED_KEY, c ? "0" : "1");
    return !c;
  }), [isMobileLayout]);

  if (!coachPanelVisible(state)) return null;
  const controller = duel.coachController;
  return (
    <CoachPanelView
      state={state}
      turn={turnState.turn}
      canSuggest={turnState.isLocalTurn && !!duel.isGameActive}
      collapsed={collapsed}
      isMobileLayout={isMobileLayout}
      onToggleCollapsed={toggleCollapsed}
      onSetEnabled={(on) => {
        if (on) setCollapsed(false);
        void controller.setEnabled(on);
      }}
      onSuggest={() => { void controller.suggest(turnState.turn); }}
    />
  );
}

export interface CoachPanelViewProps {
  state: CoachState;
  turn: number;
  /** Your own turn (the suggestion is for your turn). */
  canSuggest: boolean;
  collapsed: boolean;
  isMobileLayout?: boolean;
  onToggleCollapsed(): void;
  onSetEnabled(on: boolean): void;
  onSuggest(): void;
}

const sectionTitle: CSSProperties = { fontSize: 11, fontWeight: 600, opacity: 0.55, marginTop: 4 };
const line: CSSProperties = { fontSize: 12, lineHeight: 1.35, display: "flex", gap: 6, justifyContent: "space-between" };
const dim: CSSProperties = { opacity: 0.7, whiteSpace: "nowrap" };

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return <div style={line}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span><span style={dim}>{value}</span></div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><div style={sectionTitle}>{title}</div>{children}</div>;
}

/** The bot deck's turn 1: its win rate clean vs interrupted, by interruptions, its top 3 choke points. */
export function TheirTurnView({ opp }: { opp: CoachOppAnswers }) {
  const chokes = (opp.chokePoints ?? []).slice(0, 3);
  return (
    <Section title={`Their turn 1 · ${opp.deckType}`}>
      {opp.clean && <Row label="Not interrupted" value={winRateText(opp.clean)} />}
      {opp.interrupted && <Row label="Interrupted" value={winRateText(opp.interrupted)} />}
      {opp.byInterruptions?.map((b) => <Row key={b.label} label={`${b.label} interruption${b.label === "1" ? "" : "s"}`} value={winRateText(b)} />)}
      {chokes.length > 0 && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Their win rate when answered:</div>}
      {chokes.map((c) => <Row key={c.code} label={c.name} value={winRateText(c)} />)}
    </Section>
  );
}

export function CoachStatsView({ stats }: { stats: CoachStats | null }) {
  if (!stats) return <div role="status" style={{ fontSize: 12, opacity: 0.75 }}>Looking up your deck…</div>;
  const m = stats.matchup;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 12, lineHeight: 1.35 }}>
        <strong>{stats.deckType?.name ?? "Your deck"}</strong>
        <span style={{ opacity: 0.6 }}> · {stats.format}{stats.deckType ? ` · ${percent(stats.deckType.confidence)} match` : ""}</span>
      </div>
      {(stats.overall || stats.goingFirst || stats.goingSecond) && (
        <Section title="Win rate">
          {stats.overall && <Row label="Overall" value={winRateText(stats.overall)} />}
          {stats.goingFirst && <Row label="Going first" value={winRateText(stats.goingFirst)} />}
          {stats.goingSecond && <Row label="Going second" value={winRateText(stats.goingSecond)} />}
        </Section>
      )}
      {m !== undefined && (
        <Section title="Matchup">
          {m === null
            ? <div style={{ fontSize: 12, opacity: 0.7 }}>Shows once you see a bot card.</div>
            : <>
              <Row label={`vs ${m.vs}`} value={winRateText(m)} />
              {m.first && <Row label="Going first" value={winRateText(m.first)} />}
              {m.second && <Row label="Going second" value={winRateText(m.second)} />}
            </>}
        </Section>
      )}
      {stats.oppAnswers && <TheirTurnView opp={stats.oppAnswers} />}
      {!!stats.oppHandTraps?.length && (
        <Section title="They may hold">
          {stats.oppHandTraps.map((c) => <Row key={c.name} label={c.name} value={percent(c.chance)} />)}
        </Section>
      )}
      {!!stats.stoppedBy?.length && (
        <Section title="Hurts you going first">
          {stats.stoppedBy.map((c) => <Row key={c.name} label={c.name} value={winRateText(c)} />)}
        </Section>
      )}
      {!!stats.breakers?.length && (
        <Section title="Best going second">
          {stats.breakers.map((c) => <Row key={c.name} label={c.name} value={winRateText(c)} />)}
        </Section>
      )}
      {!!stats.topCards?.length && (
        <Section title="Most played">
          {stats.topCards.map((c) => <Row key={c.name} label={c.copies ? `${c.name} ×${c.copies}` : c.name} value={percent(c.popularity)} />)}
        </Section>
      )}
    </div>
  );
}

function SuggestView({ state, turn, canSuggest, onSuggest }: Pick<CoachPanelViewProps, "state" | "turn" | "canSuggest" | "onSuggest">) {
  const s = state.suggest;
  const loading = s.status === "loading";
  const done = s.status === "done" && s.turn === turn ? s.result : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
      <button
        type="button"
        className="ygo-card-item"
        disabled={loading || !canSuggest || !!done}
        aria-busy={loading}
        onMouseDown={keepFocusOff}
        onClick={onSuggest}
        title={canSuggest ? "Find a line for this turn" : "On your turn"}
        style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13 }}
      >
        <span style={{ flexGrow: 1, textAlign: "left" }}>{loading ? "Thinking…" : "Suggest my turn"}</span>
        {loading && <span className="ygo-inline-spinner" aria-hidden="true" />}
      </button>
      {done && !done.available && <div role="status" style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>{done.reason}</div>}
      {done && done.available && (
        <div role="status" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {done.steps.length
            ? <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.4 }}>{done.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
            : <div style={{ fontSize: 12, opacity: 0.75 }}>Nothing better than passing.</div>}
          <div style={{ fontSize: 12, fontWeight: 600 }}>{endBoardText(done.end)}</div>
        </div>
      )}
    </div>
  );
}

export function CoachPanelView({ state, turn, canSuggest, collapsed, isMobileLayout = false, onToggleCollapsed, onSetEnabled, onSuggest }: CoachPanelViewProps) {
  const placement: CSSProperties = isMobileLayout
    ? { top: 8, left: 72, maxHeight: "45%" }
    : { top: 12, left: 316, maxHeight: "calc(100% - 210px)" };
  return (
    <div
      className="ygo-card-menu ygo-coach-panel"
      role="region"
      aria-label="Coach"
      style={{ ...placement, right: "auto", width: collapsed ? "auto" : 240, maxWidth: "calc(100% - 24px)", gap: 6 }}
      onClick={stop}
      onMouseDown={stop}
      onMouseUp={stop}
      onMouseMove={stop}
      onWheel={stop}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}>
        <span style={{ flexGrow: 1, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, whiteSpace: "nowrap" }}>
          Coach{collapsed && !state.enabled ? " (off)" : ""}
        </span>
        <label
          title={state.enabled ? "Turn the coach off" : "Turn the coach on"}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: state.switching ? "wait" : "pointer", opacity: 0.85 }}
          onMouseDown={keepFocusOff}
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
        <button
          type="button"
          onMouseDown={keepFocusOff}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand coach" : "Collapse coach"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand" : "Collapse"}
          style={{
            background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.8, lineHeight: 1,
            ...(isMobileLayout
              ? { minWidth: 36, minHeight: 36, margin: "-8px -6px -8px 0", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }
              : { padding: "0 2px", fontSize: 14 }),
          }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
      </div>
      {state.error && (
        <div role="alert" style={{ fontSize: 12, lineHeight: 1.35, padding: "5px 8px", borderRadius: 4, background: "rgba(220, 38, 38, 0.18)", borderLeft: "3px solid rgb(239, 68, 68)", color: "#fecaca" }}>
          {state.error}
        </div>
      )}
      {!collapsed && !state.enabled && (
        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>Turn it on for live stats and tips on your options.</div>
      )}
      {!collapsed && state.enabled && <>
        <CoachStatsView stats={state.stats} />
        <SuggestView state={state} turn={turn} canSuggest={canSuggest} onSuggest={onSuggest} />
      </>}
    </div>
  );
}
