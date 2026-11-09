import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { YGODuel } from "../../core/YGODuel";
import type { CoachState } from "../../core/YGOCoachController";
import type { CoachOppAnswers, CoachStats } from "../../types";
import { YGOClientType } from "ygo-core";
import { endBoardText, percent, winRateText } from "../../domain/coach";
import { safeGetItem, safeSetItem } from "../../scripts/safe-storage";
import { useDuelTurnState } from "../use-duel-turn-state";
import { useCoachNow, type CoachNow } from "./use-coach-now";
import { usePanelPlacement } from "./use-panel-placement";

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

  const now = useCoachNow(duel, state.stats, turnState, state.available && state.enabled && !collapsed);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const placement = usePanelPlacement(panelRef, isMobileLayout, false, { key: "ygo-coach-panel-place", docked: DOCKED });
  const nudge = useStayClear(panelRef, placement.style);

  if (!coachPanelVisible(state)) return null;
  const controller = duel.coachController;
  return (
    <CoachPanelView
      state={state}
      now={now}
      turn={turnState.turn}
      canSuggest={turnState.isLocalTurn && !!duel.isGameActive}
      showSuggest={turnState.isLocalTurn && turnState.phase === "Main Phase 1"}
      collapsed={collapsed}
      isMobileLayout={isMobileLayout}
      panelRef={panelRef}
      placementStyle={{ ...placement.style, ...nudge }}
      onHeaderPointerDown={placement.onHeaderPointerDown}
      onResetPosition={placement.resetPosition}
      onToggleCollapsed={toggleCollapsed}
      onSetEnabled={(on) => {
        if (on) setCollapsed(false);
        void controller.setEnabled(on);
      }}
      onSuggest={() => { void controller.suggest(turnState.turn); }}
    />
  );
}

/** Where the coach docks until it's dragged: left of the board, clear of the card details. */
const DOCKED = {
  desktop: { top: 12, left: 316, right: "auto", maxHeight: "calc(100% - 210px)" },
  mobile: { top: 8, left: 72, right: "auto", maxHeight: "45%" },
} satisfies { desktop: CSSProperties; mobile: CSSProperties };

const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Keeps the coach off the Assisted Options panel (dragged next to it, or docked where the
 * options panel was dragged): moves it below that panel, or beside it when there's no room below.
 * Not remembered; it re-checks on every render and window resize.
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
      // Where the coach sits without a nudge.
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const left = typeof base.left === "number" ? p.left + base.left : panel.getBoundingClientRect().left;
      const top = typeof base.top === "number" ? p.top + base.top : panel.getBoundingClientRect().top;
      const own = new DOMRect(left, top, width, height);
      if (!overlaps(own, o)) { if (key !== "{}") setNudge({}); return; }
      const below = o.bottom - p.top + 8;
      const next: CSSProperties = below + Math.min(height, 160) <= p.height
        ? { top: below, maxHeight: `calc(100% - ${below + 12}px)` }
        : { left: o.right - p.left + 8, right: "auto" };
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
  /** The coach's live read of the duel (null: not read, e.g. collapsed). */
  now?: CoachNow | null;
  turn: number;
  /** Your own turn (the suggestion is for your turn). */
  canSuggest: boolean;
  /** Your Main Phase 1: the Suggest button shows (defaults to canSuggest). */
  showSuggest?: boolean;
  collapsed: boolean;
  isMobileLayout?: boolean;
  panelRef?: { current: HTMLDivElement | null };
  placementStyle?: CSSProperties;
  onHeaderPointerDown?(e: { clientX: number; clientY: number; button: number; preventDefault(): void; stopPropagation(): void }): void;
  onResetPosition?(): void;
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

/** The deck in one line: "Fire King · TCG · 90% match · 45% of 303 overall". */
export function CoachStatsView({ stats }: { stats: CoachStats | null }) {
  if (!stats) return <div role="status" style={{ fontSize: 12, opacity: 0.75 }}>Looking up your deck…</div>;
  return (
    <div style={{ fontSize: 12, lineHeight: 1.35 }}>
      <strong>{stats.deckType?.name ?? "Your deck"}</strong>
      <span style={{ opacity: 0.6 }}>
        {" "}· {stats.format}{stats.deckType ? ` · ${percent(stats.deckType.confidence)} match` : ""}
        {stats.overall && stats.overall.games > 0 ? ` · ${winRateText(stats.overall)} overall` : ""}
      </span>
    </div>
  );
}

const callout: CSSProperties = { fontSize: 12, lineHeight: 1.4, padding: "5px 8px", borderRadius: 4, background: "rgba(59, 130, 246, 0.14)", borderLeft: "3px solid rgb(96, 165, 250)" };

/** "Right now": the line for the moment you're in, and what answering their card did in replays. */
export function RightNowView({ now }: { now: CoachNow }) {
  const r = now.responses;
  if (!now.tip && !r) return null;
  return (
    <Section title="Right now">
      {now.tip && <div role="status" style={callout}>{now.tip}</div>}
      {r && (
        <div role="status" style={{ ...callout, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontWeight: 600 }}>They activated {r.target}</div>
          {r.keyNote && <div>{r.keyNote}</div>}
          {!r.keyNote && !r.tips.length && <div style={{ opacity: 0.75 }}>No replay stats for answering it.</div>}
          {r.tips.map((t) => (
            <div key={t.name}><span style={{ fontWeight: 600 }}>{t.name}</span>: {t.lines.join(" · ")}</div>
          ))}
        </div>
      )}
    </Section>
  );
}

/** The bot's deck type, guessed from the cards of it seen so far. */
export function OppGuessView({ guess }: { guess: NonNullable<CoachStats["oppGuess"]> }) {
  if (!guess.types.length) return null;
  return (
    <Section title={`Their deck (from ${guess.seen} card${guess.seen === 1 ? "" : "s"} seen)`}>
      {guess.types.slice(0, 4).map((t) => <Row key={t.name} label={t.name} value={percent(t.share)} />)}
    </Section>
  );
}

/** Your turn: the interruptions they may hold (their deck type's, from replays), recounted as they use cards. */
export function HeldView({ now }: { now: CoachNow }) {
  if (!now.held.length) return null;
  return (
    <Section title="Interruptions they may hold">
      {now.held.slice(0, 5).map((h) => (
        <Row key={h.code ?? h.name} label={h.shown ? `${h.name} (${h.shown} used)` : h.name} value={percent(h.chance)} />
      ))}
    </Section>
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
        // Only a found line locks it for the turn; a refusal ("not Main Phase 1", busy...) can be asked again.
        disabled={loading || !canSuggest || !!done?.available}
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

export function CoachPanelView({
  state, now = null, turn, canSuggest, showSuggest = canSuggest, collapsed, isMobileLayout = false,
  panelRef, placementStyle, onHeaderPointerDown, onResetPosition, onToggleCollapsed, onSetEnabled, onSuggest,
}: CoachPanelViewProps) {
  const placement: CSSProperties = placementStyle ?? (isMobileLayout ? DOCKED.mobile : DOCKED.desktop);
  const stats = state.stats;
  return (
    <div
      ref={panelRef}
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
      <div
        onPointerDown={onHeaderPointerDown}
        onDoubleClick={onResetPosition}
        title={onHeaderPointerDown ? "Drag to move · double-click to dock back" : undefined}
        style={{ display: "flex", alignItems: "center", gap: 6, userSelect: "none", touchAction: "none", cursor: onHeaderPointerDown ? "grab" : undefined }}
      >
        <span style={{ flexGrow: 1, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, whiteSpace: "nowrap" }}>
          Coach{collapsed && !state.enabled ? " (off)" : ""}
        </span>
        <label
          title={state.enabled ? "Turn the coach off" : "Turn the coach on"}
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
        <button
          type="button"
          onMouseDown={keepFocusOff}
          onPointerDown={stop}
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
        <CoachStatsView stats={stats} />
        {now?.outlook && <div style={{ fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>{now.outlook}</div>}
        {stats?.oppGuess ? <OppGuessView guess={stats.oppGuess} /> : stats?.matchup === null && (
          <div style={{ fontSize: 11, opacity: 0.6 }}>Their deck shows once you see their cards.</div>
        )}
        {now && <RightNowView now={now} />}
        {showSuggest && <SuggestView state={state} turn={turn} canSuggest={canSuggest} onSuggest={onSuggest} />}
        {now && <HeldView now={now} />}
        {stats?.oppAnswers && turn <= 2 && <TheirTurnView opp={stats.oppAnswers} />}
      </>}
    </div>
  );
}
