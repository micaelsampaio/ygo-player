import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { YGODuel } from "../../core/YGODuel";
import { YGOClientType } from "ygo-core";
import { YGOStatic } from "../../core/YGOStatic";
import { createCardSelectionGeometry } from "../../game/meshes/CardSelectionMesh";
import { assistErrorMessage, assistUnavailableReason, phaseLabel } from "../duel-status";
import { useDuelTurnState } from "../use-duel-turn-state";
import { clampPanelPosition } from "./panel-position";

/** Mirrors OcgcoreAdapter.ts's CardRefData (ygo-socket-server) — plain data
 * crossing the wire, so re-declared locally rather than importing across
 * packages. */
interface CardRefData {
  code: number;
  ctrl: number;
  loc: number;
  seq: number;
  pos: number;
}

interface IdleOptions {
  summonable: CardRefData[];
  spSummon: CardRefData[];
  reposition: CardRefData[];
  mset: CardRefData[];
  sset: CardRefData[];
  activatable: CardRefData[];
  toBattle: boolean;
  toEnd: boolean;
}

interface BattleOptions {
  attackable: CardRefData[];
  activatable: CardRefData[];
  toMain2: boolean;
  toEnd: boolean;
}

/** The server only ever offers the single next phase (never a skip), plus
 * Standby / Main Phase 1 catch-up steps while the visible phase is behind
 * the engine's — see guidedView in ygo-socket-server's assistOptions.ts. */
type AssistQueryResult =
  | { available: false }
  | { available: true; pending: "idle"; options: IdleOptions; nextPhase?: string | null }
  | { available: true; pending: "battle"; options: BattleOptions; nextPhase?: string | null };

interface OptionRow {
  key: string;
  label: string;
  commandType: string;
  data: any;
  /** The card this option acts on, if any (absent for phase-transition rows). */
  code?: number;
  /** Where the card is ("Hand", "Field", "GY", …) — shown for Activate, where it's genuinely ambiguous. */
  where?: string;
  /** How many copies collapse into this row. Activate rows carry the exact
   * engine ref of one copy (the server activates that copy), so they only
   * collapse copies in the same location, and never field copies. */
  count: number;
  /** Only "Activate" rows get the on-card glow — summoning/setting a card you're already holding doesn't need it pointed out. */
  highlight: boolean;
}

interface Section {
  title: string;
  rows: OptionRow[];
}

// ocgcore LOCATION_* bits (see ocgapi_constants.h).
const LOCATION_LABELS: [number, string][] = [
  [0x02, "Hand"], [0x04, "Field"], [0x08, "Field"], [0x10, "GY"], [0x20, "Banished"], [0x40, "Extra Deck"], [0x01, "Deck"],
];

function locationLabel(loc: number): string | undefined {
  return LOCATION_LABELS.find(([bit]) => loc & bit)?.[1];
}

const LOCATION_MZONE = 0x04;
const LOCATION_SZONE = 0x08;

function cardRows(duel: YGODuel, refs: CardRefData[], commandType: string, dataKey: string, activate = false): OptionRow[] {
  const byKey = new Map<string, OptionRow>();
  for (const ref of refs) {
    const where = activate ? locationLabel(ref.loc) : undefined;
    // Activate: the same code in hand vs GY (or two face-up copies on the
    // field) are different choices, so key on the exact location — plus the
    // zone for field cards — and send that copy's ref, not just its code.
    const onField = (ref.loc & (LOCATION_MZONE | LOCATION_SZONE)) !== 0;
    const key = activate
      ? `${commandType}:${ref.code}:${ref.ctrl}:${ref.loc}${onField ? `:${ref.seq}` : ""}`
      : `${commandType}:${ref.code}`;
    const existing = byKey.get(key);
    if (existing) { existing.count++; continue; }
    byKey.set(key, {
      key,
      label: duel.ygo.state.getCardData(ref.code)?.name ?? `#${ref.code}`,
      commandType,
      data: activate
        ? { [dataKey]: ref.code, ctrl: ref.ctrl, loc: ref.loc, seq: ref.seq }
        : { [dataKey]: ref.code },
      code: ref.code,
      where,
      count: 1,
      highlight: activate,
    });
  }
  return [...byKey.values()];
}

function phaseRow(label: string, phase: string): OptionRow {
  return { key: `phase:${phase}`, label, commandType: "Duel Phase", data: { phase }, count: 1, highlight: false };
}

function sectionsFor(duel: YGODuel, result: AssistQueryResult): Section[] {
  if (!result.available) return [];
  const nextPhaseSection: Section = {
    title: "Next Phase",
    rows: result.nextPhase ? [phaseRow(phaseLabel(result.nextPhase), result.nextPhase)] : [],
  };

  if (result.pending === "idle") {
    const { options } = result;
    return [
      { title: "Activate", rows: cardRows(duel, options.activatable, "Activate", "id", true) },
      { title: "Special Summon", rows: cardRows(duel, options.spSummon, "Special Summon", "id") },
      { title: "Normal Summon", rows: cardRows(duel, options.summonable, "Normal Summon", "id") },
      { title: "Set Monster", rows: cardRows(duel, options.mset, "Set Monster", "id") },
      { title: "Set Spell/Trap", rows: cardRows(duel, options.sset, "Set ST", "id") },
      { title: "Change Position", rows: cardRows(duel, options.reposition, "Change Card Position", "id") },
      nextPhaseSection,
    ].filter((s) => s.rows.length > 0);
  }

  const { options } = result;
  return [
    { title: "Activate", rows: cardRows(duel, options.activatable, "Activate", "id", true) },
    { title: "Attack", rows: cardRows(duel, options.attackable, "Attack", "attackingId") },
    nextPhaseSection,
  ].filter((s) => s.rows.length > 0);
}

const HIGHLIGHT_COLOR = 0xffc93c;
const HIGHLIGHT_CSS = `#${HIGHLIGHT_COLOR.toString(16)}`;
const PULSE_MIN = 0.45;
const PULSE_MAX = 1;
const PULSE_PERIOD_MS = 1400;
const FRAME_MARGIN = 0.18;
const FRAME_BORDER = 0.14;

/** The live 3D object currently showing a card with this code on the
 * viewer's own side — hand or field. GY/banished cards have no individual
 * object, so they aren't highlighted (the panel row's location tag covers them). */
function findCardObject(duel: YGODuel, playerIndex: number, code: number): THREE.Object3D | null {
  const field = duel.fields[playerIndex];

  const handCard = field.hand.getCardFromCardId(code);
  if (handCard) return handCard.gameObject;

  const zones = [...field.monsterZone, ...field.spellTrapZone, field.fieldZone, ...duel.fields[0].extraMonsterZone];
  for (const zone of zones) {
    if (zone.getCardReference()?.id === code) return zone.getGameCard()?.gameObject ?? null;
  }
  return null;
}

/** A frame sized to the object's own mesh (hand and field cards differ in size). */
function createFrame(target: THREE.Object3D): THREE.Mesh {
  let width = 2.5, height = 3.5;
  const geometry = (target as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
  if (geometry) {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    width = size.x * target.scale.x;
    height = size.y * target.scale.y;
  }
  const frame = new THREE.Mesh(
    createCardSelectionGeometry(width + FRAME_MARGIN * 2, height + FRAME_MARGIN * 2, FRAME_BORDER),
    // DoubleSide: face-down set cards are flipped 180°, which would otherwise turn the frame's back to the camera.
    new THREE.MeshBasicMaterial({ color: HIGHLIGHT_COLOR, opacity: PULSE_MAX, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  frame.renderOrder = 10;
  return frame;
}

function disposeFrame(duel: YGODuel, frame: THREE.Mesh) {
  duel.core.scene.remove(frame);
  frame.geometry.dispose();
  (frame.material as THREE.Material).dispose();
}

/**
 * Pulsing amber frame around every card with an activatable effect right
 * now. Each tick re-copies the card's live transform, so the frame follows
 * hand re-fans (after a summon) and hover lifts instead of going stale.
 * The tick loop only runs while at least one frame exists — this panel is
 * mounted in every duel, assisted or not. `hoverCode` (the row under the
 * pointer) gets the same frame, so any row can be matched to its card.
 */
function useActivatableHighlights(duel: YGODuel, sections: Section[], hoverCode: number | null) {
  const framesRef = useRef<Map<number, { frame: THREE.Mesh; target: THREE.Object3D }>>(new Map());
  const [hasFrames, setHasFrames] = useState(false);

  useEffect(() => {
    const frames = framesRef.current;
    const playerIndex = YGOStatic.playerIndex;
    const codes = new Set(
      sections.flatMap((s) => s.rows).filter((r) => r.highlight && r.code !== undefined).map((r) => r.code as number)
    );
    if (hoverCode !== null) codes.add(hoverCode);

    for (const [code, entry] of frames) {
      const target = codes.has(code) ? findCardObject(duel, playerIndex, code) : null;
      if (target !== entry.target) {
        disposeFrame(duel, entry.frame);
        frames.delete(code);
      }
    }

    for (const code of codes) {
      if (frames.has(code)) continue;
      const target = findCardObject(duel, playerIndex, code);
      if (!target) continue;
      const frame = createFrame(target);
      duel.core.scene.add(frame);
      frames.set(code, { frame, target });
    }

    setHasFrames(frames.size > 0);
  }, [duel, sections, hoverCode]);

  useEffect(() => {
    if (!hasFrames) return;
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    let timer: ReturnType<typeof setTimeout>;
    // Plain setTimeout (CardLongPressEffect's precedent) rather than hooking the engine's render loop.
    const tick = () => {
      const t = (Date.now() % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
      const opacity = PULSE_MIN + (PULSE_MAX - PULSE_MIN) * ((Math.sin(t * Math.PI * 2) + 1) / 2);
      for (const { frame, target } of framesRef.current.values()) {
        target.getWorldPosition(position);
        target.getWorldQuaternion(quaternion);
        frame.position.copy(position);
        frame.position.z += 0.06; // toward the camera, regardless of the card's own flip
        frame.quaternion.copy(quaternion);
        frame.visible = target.visible;
        (frame.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
      timer = setTimeout(tick, 32);
    };
    tick();
    return () => clearTimeout(timer);
  }, [hasFrames]);

  useEffect(() => {
    const frames = framesRef.current;
    return () => {
      for (const { frame } of frames.values()) disposeFrame(duel, frame);
      frames.clear();
    };
  }, [duel]);
}

const PLACEMENT_KEY = "ygo-assisted-panel";

interface Placement { x: number | null; y: number | null; collapsed: boolean }

function loadPlacement(): Placement {
  try {
    const raw = window.localStorage.getItem(PLACEMENT_KEY);
    if (raw) return { x: null, y: null, collapsed: false, ...JSON.parse(raw) };
  } catch { /* storage blocked — fall back to the docked default */ }
  return { x: null, y: null, collapsed: false };
}

function savePlacement(p: Placement) {
  try { window.localStorage.setItem(PLACEMENT_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** Drag-by-header + collapse, remembered per browser, so the panel can be
 * moved off whatever it's covering (duel log, controls, a card). Until
 * the user drags it, it stays docked on the right between the HUDs. On
 * the mobile layout it starts collapsed every duel (whatever was stored),
 * since expanded it would cover a large part of the board. */
function usePanelPlacement(panelRef: { current: HTMLDivElement | null }, isMobileLayout: boolean) {
  const [placement, setPlacement] = useState<Placement>(loadPlacement);
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const placementRef = useRef(placement);
  placementRef.current = placement;

  const update = (next: Placement) => { setPlacement(next); savePlacement(next); };

  // A stored position from a wider window can sit off-screen — pull it back
  // in on mount and whenever the window resizes. Not persisted: widening the
  // window again should restore the user's original spot.
  useLayoutEffect(() => {
    const clamp = () => {
      const panel = panelRef.current;
      const parent = panel?.offsetParent as HTMLElement | null;
      const { x, y } = placementRef.current;
      if (!panel || !parent || x === null || y === null) return;
      const next = clampPanelPosition({ x, y }, panel.getBoundingClientRect(), parent.getBoundingClientRect());
      if (next.x !== x || next.y !== y) setPlacement({ ...placementRef.current, ...next });
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [panelRef, isMobileLayout]);

  const onHeaderPointerDown = (e: { clientX: number; clientY: number; button: number; preventDefault(): void; stopPropagation(): void }) => {
    const panel = panelRef.current;
    const parent = panel?.offsetParent as HTMLElement | null;
    if (!panel || !parent || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const panelRect = panel.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const grabX = e.clientX - panelRect.left;
    const grabY = e.clientY - panelRect.top;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      moved = true;
      const { x, y } = clampPanelPosition(
        { x: ev.clientX - parentRect.left - grabX, y: ev.clientY - parentRect.top - grabY },
        panelRect,
        parentRect,
      );
      setPlacement({ ...placementRef.current, x, y });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (moved) savePlacement(placementRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const docked = placement.x === null || placement.y === null;
  const style: Record<string, any> = docked
    ? isMobileLayout
      // Below the (scaled-down) opponent HUD, kept narrow so the board stays visible.
      ? { top: 90, left: "auto", right: 12, maxHeight: "45%" }
      // Docked on the right between the two player HUDs (opponent: top 20px, you: bottom 100px).
      : { top: 130, left: "auto", right: 20, maxHeight: "calc(100% - 340px)" }
    : { top: placement.y, left: placement.x, right: "auto", maxHeight: isMobileLayout ? "45%" : `calc(100% - ${placement.y! + 20}px)` };

  const collapsed = isMobileLayout ? mobileCollapsed : placement.collapsed;

  return {
    style,
    collapsed,
    toggleCollapsed: () => {
      if (isMobileLayout) setMobileCollapsed((value) => !value);
      else update({ ...placementRef.current, collapsed: !placementRef.current.collapsed });
    },
    resetPosition: () => update({ ...placementRef.current, x: null, y: null }),
    onHeaderPointerDown,
  };
}

const ERROR_VISIBLE_MS = 6000;

/**
 * Opt-in ("assisted mode") panel showing the human player the REAL legal
 * options ocgcore currently offers — the same data botDecision.ts already
 * drives the bot from — instead of only the free-form honor-system card
 * menus. Additive: when there's nothing to offer (chain windows, not your
 * turn, a query in flight) it stays up with a one-line reason instead of
 * vanishing, and the existing card-hand/card-zone menus stay fully usable
 * as a fallback either way. Renders nothing if the room didn't enable
 * assisted mode.
 */
export function AssistedOptionsPanel({ duel, isMobileLayout = false }: { duel: YGODuel; isMobileLayout?: boolean }) {
  const [result, setResult] = useState<AssistQueryResult>({ available: false });
  // True until the first query answers, so the panel says "Checking…" instead of guessing a reason.
  const [loading, setLoading] = useState(true);
  // The row whose choice is in flight (spinner on it, every row disabled).
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoverCode, setHoverCode] = useState<number | null>(null);
  const requestIdRef = useRef(0);
  const turnState = useDuelTurnState(duel);

  const enabled = !!duel.assist && duel.client.type === YGOClientType.PLAYER && !!duel.ygo?.options?.assistedMode;

  const refresh = () => {
    if (!enabled || !duel.assist) return;
    const requestId = ++requestIdRef.current;
    duel.assist.query().then((res: AssistQueryResult) => {
      if (requestIdRef.current !== requestId) return; // superseded by a newer query
      setResult(res);
    }).catch(() => {
      if (requestIdRef.current !== requestId) return;
      setResult({ available: false });
    }).finally(() => {
      if (requestIdRef.current === requestId) setLoading(false);
    });
  };

  useEffect(() => {
    // Don't ask the server anything in a room that never enabled assisted mode.
    if (!enabled) return;
    refresh();
    // Every executed command toggles disable→enable around its animation;
    // clearing on "disable" would flicker the panel (and rebuild every
    // frame) on each one. The re-query on "enable" replaces the result
    // anyway, and a click on a now-stale row is safely rejected server-side.
    const onEnable = () => refresh();
    duel.events.on("enable-game-actions", onEnable);
    return () => duel.events.off("enable-game-actions", onEnable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel, enabled]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), ERROR_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [error]);

  const isActive = enabled && result.available;
  const sections = isActive ? sectionsFor(duel, result) : [];
  const optionCount = sections.reduce((total, section) => total + section.rows.length, 0);

  useActivatableHighlights(duel, sections, isActive ? hoverCode : null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const placement = usePanelPlacement(panelRef, isMobileLayout);

  if (!enabled) return null;

  const busy = pendingKey !== null;
  const statusText = isActive
    ? (sections.length === 0 ? "No options right now." : null)
    : assistUnavailableReason({
      loading,
      gameActive: duel.isGameActive,
      isLocalTurn: turnState.isLocalTurn,
      hasPriority: turnState.hasPriority,
    });

  const choose = (row: OptionRow) => {
    if (busy || !duel.assist) return;
    setPendingKey(row.key);
    setError(null);
    setHoverCode(null);
    duel.assist.choose({ commandType: row.commandType, data: row.data })
      .catch((err: any) => {
        // Most commonly "stale options" — the real engine's state moved on
        // between query and click. Not fatal: refresh() below re-syncs.
        console.warn("AssistedOptionsPanel: choice rejected", err?.error ?? err);
        setError(assistErrorMessage(err));
      })
      .finally(() => {
        setPendingKey(null);
        refresh();
      });
  };

  const stop = (e: { stopPropagation(): void }) => e.stopPropagation();

  return (
    <div
      ref={panelRef}
      className="ygo-card-menu ygo-assisted-options-panel"
      style={{
        ...placement.style,
        width: isMobileLayout && placement.collapsed ? "auto" : 230,
        maxWidth: "calc(100% - 24px)",
        gap: 6,
      }}
      role="presentation"
      onClick={stop}
      onMouseDown={stop}
      onMouseUp={stop}
      onMouseMove={stop}
      onWheel={stop}
    >
      <div
        onPointerDown={placement.onHeaderPointerDown}
        onDoubleClick={placement.resetPosition}
        title="Drag to move · double-click to dock back"
        style={{ display: "flex", alignItems: "center", gap: 6, cursor: "grab", userSelect: "none", touchAction: "none" }}
      >
        <span style={{ opacity: 0.4, fontSize: 12, letterSpacing: "-2px" }}>⋮⋮</span>
        <span style={{ flexGrow: 1, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, whiteSpace: "nowrap" }}>
          Your options{placement.collapsed && optionCount > 0 ? ` (${optionCount})` : ""}
        </span>
        <button
          onPointerDown={stop}
          onClick={placement.toggleCollapsed}
          aria-label={placement.collapsed ? "Expand options" : "Collapse options"}
          aria-expanded={!placement.collapsed}
          title={placement.collapsed ? "Expand" : "Collapse"}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 2px", fontSize: 14, opacity: 0.7, lineHeight: 1 }}
        >
          {placement.collapsed ? "▸" : "▾"}
        </button>
      </div>
      {statusText && (!placement.collapsed || !isActive) && (
        <div
          role="status"
          aria-live="polite"
          style={{
            fontSize: 12, opacity: 0.75, lineHeight: 1.35,
            // Collapsed, it's a one-line chip; expanded, the full sentence.
            ...(placement.collapsed ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 } : {}),
          }}
        >
          {statusText}
        </div>
      )}
      {error && !placement.collapsed && (
        <div
          role="alert"
          style={{
            fontSize: 12, lineHeight: 1.35, padding: "5px 8px", borderRadius: 4,
            background: "rgba(220, 38, 38, 0.18)", borderLeft: "3px solid rgb(239, 68, 68)", color: "#fecaca",
          }}
        >
          {error}
        </div>
      )}
      {!placement.collapsed && sections.map((section) => (
        <div key={section.title} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            {section.title === "Activate" && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: HIGHLIGHT_CSS, display: "inline-block" }} />
            )}
            {section.title}
          </div>
          {section.rows.map((row) => (
            <button
              key={row.key}
              className="ygo-card-item"
              disabled={busy}
              aria-busy={pendingKey === row.key}
              onClick={() => choose(row)}
              onMouseEnter={() => setHoverCode(row.code ?? null)}
              onMouseLeave={() => setHoverCode(null)}
              onFocus={() => setHoverCode(row.code ?? null)}
              onBlur={() => setHoverCode(null)}
              style={{
                display: "flex", alignItems: "center", gap: 6, textAlign: "left", fontWeight: 600, fontSize: 13,
                ...(row.highlight ? { boxShadow: `inset 3px 0 0 ${HIGHLIGHT_CSS}` } : {}),
                // Keep the chosen row readable while the rest dim out.
                ...(pendingKey === row.key ? { opacity: 1 } : {}),
              }}
            >
              <span style={{ flexGrow: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
              {pendingKey === row.key && <span className="ygo-inline-spinner" aria-hidden="true" />}
              {row.count > 1 && <span style={{ opacity: 0.6, fontSize: 11 }}>×{row.count}</span>}
              {row.where && <span style={{ opacity: 0.55, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{row.where}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
