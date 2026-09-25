import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { YGODuel } from "../../core/YGODuel";
import { YGOClientType, YGOGameUtils } from "ygo-core";
import { YGOStatic } from "../../core/YGOStatic";
import { createHighlightFrame, disposeHighlightFrame, HIGHLIGHT_CSS, placeHighlightFrame } from "../../game/meshes/highlight-frame";
import { ActionCardSelection } from "../../actions/ActionSelectCard";
import { CardZone } from "../../game/CardZone";
import { getGameZone } from "../../scripts/ygo-utils";
import { EnginePlace, pickZone, promptKey, samePlace, ZoneHighlight, zoneHighlights } from "../assist-zones";
import { assistErrorMessage, assistUnavailableReason, phaseLabel } from "../duel-status";
import { useDuelTurnState } from "../use-duel-turn-state";
import { assistPanelTitle, mustStayOpen, opponentWaitingText } from "../assist-respond";
import { clampPanelPosition } from "./panel-position";
import { useStopAtEveryWindow } from "./duel-preferences";
import { ndcToContainer, positionGlyph, shortPositionLabel } from "../field-overlay";
import {
  CardRefData, PromptData, candidateWhere, isSelectionValid, locationLabel, optionLabel,
  groupCandidates, positionChoices, promptSubtitle, promptTitle, toggleGroupSelection, LOC_HAND, LOC_MZONE as LOC_M, LOC_SZONE as LOC_S,
} from "../assist-prompt";

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
  | { available: true; pending: "battle"; options: BattleOptions; nextPhase?: string | null }
  /** The human's own chain window: chain a card, or don't respond. */
  | { available: true; pending: "chain"; respond: { activatable: CardRefData[]; canPass: boolean; forced: boolean } }
  /** An effect's follow-up choice the engine is holding for the human. */
  | { available: true; pending: "prompt"; prompt: PromptData };

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

const LOCATION_MZONE = LOC_M;
const LOCATION_SZONE = LOC_S;

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
  if (!result.available || result.pending === "prompt") return [];
  if (result.pending === "chain") {
    const rows = cardRows(duel, result.respond.activatable, "Activate", "id", true);
    if (result.respond.canPass) {
      rows.push({ key: "pass", label: "Don't respond", commandType: "Pass", data: {}, count: 1, highlight: false });
    }
    return [{ title: "Respond", rows }];
  }
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

  const options = (result as { options: BattleOptions }).options;
  return [
    { title: "Activate", rows: cardRows(duel, options.activatable, "Activate", "id", true) },
    { title: "Attack", rows: cardRows(duel, options.attackable, "Attack", "attackingId") },
    nextPhaseSection,
  ].filter((s) => s.rows.length > 0);
}

const PULSE_MIN = 0.45;
const PULSE_MAX = 1;
const PULSE_PERIOD_MS = 1400;

/** The live 3D object currently showing a card with this code on the
 * viewer's own side — hand or field. GY/banished cards have no individual
 * object, so they aren't highlighted (the panel row's location tag covers them). */
function findCardObject(duel: YGODuel, playerIndex: number, code: number): THREE.Object3D | null {
  const field = duel.fields[playerIndex];
  if (!field) return null;

  const handCard = field.hand.getCardFromCardId(code);
  if (handCard) return handCard.gameObject;

  const zones = [...field.monsterZone, ...field.spellTrapZone, field.fieldZone, ...duel.fields[0].extraMonsterZone];
  for (const zone of zones) {
    if (zone.getCardReference()?.id === code) return zone.getGameCard()?.gameObject ?? null;
  }
  return null;
}

function disposeFrame(duel: YGODuel, frame: THREE.Mesh) {
  disposeHighlightFrame(duel.core.scene, frame);
}

/** A card to frame on the board: its code, on whose side (a viewer-relative ygo player index). */
interface HighlightTarget { code: number; side: number }

const targetKey = (t: HighlightTarget) => `${t.side}:${t.code}`;

/**
 * Pulsing amber frame around every card with an activatable effect right
 * now (or every candidate of a held effect prompt). Each tick re-copies the
 * card's live transform, so the frame follows hand re-fans (after a summon)
 * and hover lifts instead of going stale. The tick loop only runs while at
 * least one frame exists — this panel is mounted in every duel, assisted or
 * not. `hover` (the row under the pointer) gets the same frame, so any row
 * can be matched to its card.
 */
function useCardHighlights(duel: YGODuel, targets: HighlightTarget[], hover: HighlightTarget | null) {
  const framesRef = useRef<Map<string, { frame: THREE.Mesh; target: THREE.Object3D }>>(new Map());
  const wanted = new Map<string, HighlightTarget>(targets.map((t) => [targetKey(t), t]));
  if (hover) wanted.set(targetKey(hover), hover);
  const wantedKey = [...wanted.keys()].sort().join(",");
  const wantedRef = useRef(wanted);
  wantedRef.current = wanted;

  // Frames follow their cards every tick, and re-find them: a window often
  // opens mid-animation (the card isn't in the hand yet) or right before the
  // hand re-lays out (its card objects are replaced) — checking only when the
  // option list changed left those cards unframed or framing a stale object.
  useEffect(() => {
    if (!wantedKey) {
      for (const { frame } of framesRef.current.values()) disposeFrame(duel, frame);
      framesRef.current.clear();
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const reconcile = () => {
      const frames = framesRef.current;
      const want = wantedRef.current;
      for (const [key, entry] of frames) {
        const t = want.get(key);
        const target = t ? findCardObject(duel, t.side, t.code) : null;
        if (target !== entry.target) {
          disposeFrame(duel, entry.frame);
          frames.delete(key);
        }
      }
      for (const [key, t] of want) {
        if (frames.has(key)) continue;
        const target = findCardObject(duel, t.side, t.code);
        if (!target) continue; // not on the board yet — retried next tick
        const frame = createHighlightFrame(target, PULSE_MAX);
        duel.core.scene.add(frame);
        frames.set(key, { frame, target });
      }
    };
    // Plain setTimeout (CardLongPressEffect's precedent) rather than hooking the engine's render loop.
    let n = 0;
    const tick = () => {
      if (n++ % 8 === 0) reconcile(); // ~4x a second is plenty to catch re-layouts
      const t = (Date.now() % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
      const opacity = PULSE_MIN + (PULSE_MAX - PULSE_MIN) * ((Math.sin(t * Math.PI * 2) + 1) / 2);
      for (const { frame, target } of framesRef.current.values()) {
        placeHighlightFrame(frame, target);
        frame.visible = target.visible;
        (frame.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
      timer = setTimeout(tick, 32);
    };
    tick();
    return () => clearTimeout(timer);
  }, [duel, wantedKey]);

  useEffect(() => {
    const frames = framesRef.current;
    return () => {
      for (const { frame } of frames.values()) disposeFrame(duel, frame);
      frames.clear();
    };
  }, [duel]);
}

/** Only cards that exist as an object on the board can be framed (hand / field). */
function promptTargets(prompt: PromptData | null): HighlightTarget[] {
  if (!prompt?.candidates) return [];
  const me = YGOStatic.playerIndex;
  return prompt.candidates
    .filter((c) => (c.loc & (LOC_HAND | LOC_M | LOC_S)) !== 0)
    .map((c) => ({ code: c.code, side: c.ctrl === prompt.player ? me : 1 - me }));
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

/** A button in the "Your choice" section — same look as the option rows. */
function ChoiceButton({ label, where, onClick, disabled, busy, selected, highlight, onHover }: {
  label: string;
  where?: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  selected?: boolean;
  highlight?: boolean;
  onHover?: (on: boolean) => void;
}) {
  return (
    <button
      className="ygo-card-item"
      type="button"
      disabled={disabled}
      aria-busy={busy}
      aria-pressed={selected}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6, textAlign: "left", fontWeight: 600, fontSize: 13,
        ...(highlight ? { boxShadow: `inset 3px 0 0 ${HIGHLIGHT_CSS}` } : {}),
        ...(selected ? { background: "rgba(255, 201, 60, 0.22)", outline: `1px solid ${HIGHLIGHT_CSS}` } : {}),
        ...(busy ? { opacity: 1 } : {}),
      }}
    >
      {selected !== undefined && <span aria-hidden="true" style={{ width: 12, opacity: selected ? 1 : 0.35 }}>{selected ? "✓" : "○"}</span>}
      <span style={{ flexGrow: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {busy && <span className="ygo-inline-spinner" aria-hidden="true" />}
      {where && <span style={{ opacity: 0.55, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{where}</span>}
    </button>
  );
}

/**
 * A held zone prompt (SELECT_PLACE) is answered on the field: every free zone
 * glows with the same pulsing frame the free-form "choose a zone" uses
 * (ActionCardSelection — steady under prefers-reduced-motion) and a click on
 * one answers it. Animations briefly clear the field action
 * (disable-game-actions), so the glow is put back on the next
 * enable-game-actions; if the player dismisses it (Esc / click away) it stays
 * off until they ask for it again from the panel. Cleared once the prompt is
 * answered or goes away.
 */
function useFieldZoneSelection(duel: YGODuel, zones: ZoneHighlight[], enabled: boolean, onPick: (place: EnginePlace) => void) {
  const [dismissed, setDismissed] = useState(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const zonesKey = zones.map((z) => z.zone).join(",");

  useEffect(() => {
    if (!enabled || dismissed || zones.length === 0) return;
    const selection = duel.gameController?.getComponent<ActionCardSelection>("action_card_selection");
    if (!selection) return;
    let id = -1;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      if (disposed || (id !== -1 && selection.isSelecting(id))) return;
      const byZone = new Map<CardZone, ZoneHighlight>();
      for (const z of zones) {
        const cardZone = getGameZone(duel, YGOGameUtils.getZoneData(z.zone as any));
        if (cardZone) byZone.set(cardZone, z);
      }
      if (byZone.size === 0) return;
      id = selection.startSelection({
        zones: [...byZone.keys()],
        selectionType: "zone",
        onSelectionCompleted: (cardZone: CardZone) => {
          const z = byZone.get(cardZone);
          if (z && !disposed) onPickRef.current(z.place);
        },
        onCanceled: () => { if (!disposed) setDismissed(true); },
      });
    };

    start();
    const onEnable = () => { clearTimeout(timer); timer = setTimeout(start, 0); };
    duel.events.on("enable-game-actions", onEnable);
    return () => {
      disposed = true;
      clearTimeout(timer);
      duel.events.off("enable-game-actions", onEnable);
      // Still showing (the prompt went away, or the panel is answering it): take it down.
      if (id !== -1 && selection.isSelecting(id)) duel.actionManager.clearAction();
    };
    // `zones` is rebuilt every render; zonesKey is its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel, zonesKey, enabled, dismissed]);

  return { dismissed, showAgain: () => setDismissed(false) };
}

/** The zone prompt's part of "Your choice": pick on the field; the list is a collapsed fallback. */
function PlaceChoice({ duel, prompt, busy, pendingKey, respond }: {
  duel: YGODuel;
  prompt: PromptData;
  busy: boolean;
  pendingKey: string | null;
  respond: (key: string, data: any) => void;
}) {
  const [picked, setPicked] = useState<EnginePlace[]>([]);
  const need = prompt.count || 1;
  const { onField, offField } = zoneHighlights(prompt, YGOStatic.playerIndex, picked);
  // With nothing to click on the field, the list is the only way to answer.
  const [listOpen, setListOpen] = useState(onField.length === 0);

  const pick = (place: EnginePlace) => {
    const result = pickZone(prompt, picked, place);
    if (result.done) respond(`zone:${place.player}:${place.loc}:${place.seq}`, result.data);
    else setPicked(result.picked);
  };
  const field = useFieldZoneSelection(duel, onField, !busy, pick);
  const listed = [...onField.map((z) => ({ ...z.place, label: z.label })), ...offField];

  return <>
    {need > 1 && (
      <div style={{ fontSize: 12, opacity: 0.75 }}>{`Picked ${picked.length} of ${need}`}</div>
    )}
    {busy && pendingKey?.startsWith("zone:") && (
      <div style={{ fontSize: 12, opacity: 0.75, display: "flex", alignItems: "center", gap: 6 }}>
        <span className="ygo-inline-spinner" aria-hidden="true" /> Placing…
      </div>
    )}
    {field.dismissed && onField.length > 0 && (
      <ChoiceButton label="Show the zones on the field" disabled={busy} highlight onClick={field.showAgain} />
    )}
    {picked.length > 0 && (
      <ChoiceButton label="Clear picks" disabled={busy} onClick={() => setPicked([])} />
    )}
    <button
      type="button"
      onClick={() => setListOpen((open) => !open)}
      aria-expanded={listOpen}
      style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "2px 0", fontSize: 11, opacity: 0.6, textAlign: "left" }}
    >
      {listOpen ? "▾" : "▸"} Pick from a list
    </button>
    {listOpen && listed.map((z) => {
      const key = `zone:${z.player}:${z.loc}:${z.seq}`;
      const place = { player: z.player, loc: z.loc, seq: z.seq };
      return (
        <ChoiceButton
          key={key}
          label={z.label}
          disabled={busy}
          busy={pendingKey === key}
          selected={need > 1 ? picked.some((p) => samePlace(p, place)) : undefined}
          onClick={() => pick(place)}
        />
      );
    })}
  </>;
}

/** Where the position buttons go: the card itself when it's on the board
 * (hand / field), else the middle of the viewer's Monster Zones, where it
 * is about to land (a card summoned from the Extra Deck, GY…). */
function positionAnchor(duel: YGODuel, code: number | undefined): THREE.Vector3 | null {
  const me = YGOStatic.playerIndex;
  const card = code !== undefined ? findCardObject(duel, me, code) : null;
  if (card) return card.getWorldPosition(new THREE.Vector3());
  const zones = duel.fields[me]?.monsterZone ?? [];
  const middle = zones[Math.floor(zones.length / 2)];
  return middle ? middle.position.clone() : null;
}

/**
 * The position prompt answered on the field: one button per allowed
 * position (ATK upright / DEF sideways / face-down hatched) floating next
 * to the card, in the panel's container (so it shows even with the panel
 * collapsed or moved away). The panel's own buttons stay as the fallback.
 * Follows the card (re-projected a few times a second: hand re-fans, window resizes).
 */
function PositionFieldChoice({ duel, prompt, busy, pendingKey, respond }: {
  duel: YGODuel;
  prompt: PromptData;
  busy: boolean;
  pendingKey: string | null;
  respond: (key: string, data: any) => void;
}) {
  const probeRef = useRef<HTMLSpanElement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const choices = positionChoices(prompt.positions);

  useLayoutEffect(() => {
    const panel = probeRef.current?.closest(".ygo-assisted-options-panel") as HTMLElement | null;
    setContainer((panel?.offsetParent as HTMLElement | null) ?? null);
  }, []);

  useEffect(() => {
    if (!container) return;
    const update = () => {
      const anchor = positionAnchor(duel, prompt.code);
      const canvas = duel.core.renderer.domElement;
      const next = anchor ? ndcToContainer(anchor.project(duel.core.camera), canvas.getBoundingClientRect(), container.getBoundingClientRect()) : null;
      setPoint((prev) => (prev && next && Math.abs(prev.x - next.x) < 1 && Math.abs(prev.y - next.y) < 1 ? prev : next));
    };
    update();
    const timer = setInterval(update, 150);
    return () => clearInterval(timer);
  }, [duel, container, prompt.code]);

  const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
  const overlay = container && point && choices.length > 0 ? createPortal(
    <div
      className="ygo-card-menu ygo-assisted-position-choice"
      role="group"
      aria-label="Choose a position"
      onClick={stop}
      onMouseDown={stop}
      onMouseUp={stop}
      onMouseMove={stop}
      onWheel={stop}
      style={{
        position: "absolute", left: point.x, top: point.y, transform: "translate(-50%, calc(-100% - 12px))",
        flexDirection: "row", width: "auto", gap: 6, padding: 6, zIndex: 111,
        boxShadow: `0 0 0 1px ${HIGHLIGHT_CSS}, 0 4px 14px rgba(0, 0, 0, 0.45)`,
      }}
    >
      {choices.map(({ position, label }) => {
        const key = `position:${position}`;
        const glyph = positionGlyph(position);
        return (
          <button
            key={position}
            className="ygo-card-item"
            type="button"
            title={label}
            aria-label={label}
            disabled={busy}
            aria-busy={pendingKey === key}
            onClick={() => respond(key, { position })}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 52, padding: "6px 8px", fontSize: 12, fontWeight: 700, boxShadow: `inset 0 0 0 1px ${HIGHLIGHT_CSS}` }}
          >
            <span
              aria-hidden="true"
              style={{
                width: glyph.sideways ? 22 : 16, height: glyph.sideways ? 16 : 22, borderRadius: 2,
                border: `2px solid ${HIGHLIGHT_CSS}`,
                background: glyph.faceDown
                  ? `repeating-linear-gradient(45deg, ${HIGHLIGHT_CSS} 0 2px, transparent 2px 5px)`
                  : "rgba(255, 201, 60, 0.25)",
              }}
            />
            {pendingKey === key ? <span className="ygo-inline-spinner" aria-hidden="true" /> : shortPositionLabel(position)}
          </button>
        );
      })}
    </div>,
    container,
  ) : null;

  return <><span ref={probeRef} hidden />{overlay}</>;
}

/**
 * "Your choice": an effect prompt the engine is holding for the human (which
 * card to pick, which monster to Tribute, yes/no, an option, a position, a
 * zone). Answers with a 'Respond Prompt' choose.
 */
function PromptView({ duel, prompt, busy, pendingKey, respond, onHover }: {
  duel: YGODuel;
  prompt: PromptData;
  busy: boolean;
  pendingKey: string | null;
  respond: (key: string, data: any) => void;
  onHover: (target: HighlightTarget | null) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const nameOf = (code: number) => duel.ygo?.state?.getCardData(code)?.name;
  // Code 0: a card the server keeps hidden from you (an opponent's hand or Set card).
  const cardName = (code: number) => (code === 0 ? "Hidden card" : nameOf(code) ?? `#${code}`);
  const me = YGOStatic.playerIndex;
  const hoverFor = (c: CardRefData) => (on: boolean) =>
    onHover(on ? { code: c.code, side: c.ctrl === prompt.player ? me : 1 - me } : null);
  const title = promptTitle(prompt, nameOf);
  const subtitle = promptSubtitle(prompt, nameOf);
  const candidates = prompt.candidates ?? [];
  const onBoard = (c: CardRefData) => (c.loc & (LOC_HAND | LOC_M | LOC_S)) !== 0;

  let body: ReactNode = null;
  switch (prompt.kind) {
    case "card":
    case "tribute": {
      const valid = isSelectionValid(prompt, selected);
      body = <>
        {groupCandidates(candidates).map((group) => {
          const c = candidates[group.indices[0]];
          const copies = group.indices.length;
          const picked = group.indices.filter((i) => selected.includes(i)).length;
          const multi = (prompt.max ?? 1) > 1;
          return (
            <ChoiceButton
              key={group.key}
              label={`${cardName(c.code)}${copies > 1 ? ` ×${copies}` : ""}${multi && copies > 1 && picked ? ` (${picked} picked)` : ""}`}
              where={candidateWhere(c, prompt.player)}
              selected={picked > 0}
              highlight={onBoard(c)}
              disabled={busy}
              onClick={() => setSelected((prev) => toggleGroupSelection(prompt, prev, group))}
              onHover={hoverFor(c)}
            />
          );
        })}
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <button
            className="ygo-card-item"
            type="button"
            disabled={busy || !valid}
            aria-busy={pendingKey === "confirm"}
            onClick={() => respond("confirm", { indices: selected })}
            style={{ flexGrow: 1, fontWeight: 700, fontSize: 13, justifyContent: "center", ...(valid ? { boxShadow: `inset 0 0 0 1px ${HIGHLIGHT_CSS}` } : {}) }}
          >
            {pendingKey === "confirm" ? <span className="ygo-inline-spinner" aria-hidden="true" /> : `Confirm${(prompt.max ?? 1) > 1 ? ` (${selected.length})` : ""}`}
          </button>
          {prompt.cancelable && (
            <button className="ygo-card-item" type="button" disabled={busy} onClick={() => respond("cancel", { indices: [] })} style={{ fontSize: 13 }}>
              Cancel
            </button>
          )}
        </div>
      </>;
      break;
    }
    case "unselectCard":
      body = <>
        {candidates.map((c, i) => (
          <ChoiceButton
            key={`${i}:${c.code}:${c.loc}:${c.seq}`}
            label={cardName(c.code)}
            where={candidateWhere(c, prompt.player)}
            selected={!!c.selected}
            highlight={onBoard(c)}
            disabled={busy}
            busy={pendingKey === `pick:${i}`}
            onClick={() => respond(`pick:${i}`, { index: i })}
            onHover={hoverFor(c)}
          />
        ))}
        {(prompt.finishable || prompt.cancelable) && (
          <ChoiceButton label={prompt.finishable ? "Done" : "Cancel"} disabled={busy} busy={pendingKey === "finish"} onClick={() => respond("finish", { index: -1 })} />
        )}
      </>;
      break;
    case "effectYesNo":
    case "yesNo":
      body = <div style={{ display: "flex", gap: 6 }}>
        <button className="ygo-card-item" type="button" disabled={busy} aria-busy={pendingKey === "yes"} onClick={() => respond("yes", { yes: 1 })}
          style={{ flexGrow: 1, fontWeight: 700, fontSize: 13, justifyContent: "center", boxShadow: `inset 0 0 0 1px ${HIGHLIGHT_CSS}` }}>
          {pendingKey === "yes" ? <span className="ygo-inline-spinner" aria-hidden="true" /> : "Yes"}
        </button>
        <button className="ygo-card-item" type="button" disabled={busy} aria-busy={pendingKey === "no"} onClick={() => respond("no", { yes: 0 })}
          style={{ flexGrow: 1, fontWeight: 700, fontSize: 13, justifyContent: "center" }}>
          {pendingKey === "no" ? <span className="ygo-inline-spinner" aria-hidden="true" /> : "No"}
        </button>
      </div>;
      break;
    case "option":
      body = <>
        {(prompt.options ?? []).map((desc, i) => (
          <ChoiceButton key={`${i}:${desc}`} label={optionLabel(desc, i, nameOf)} disabled={busy} busy={pendingKey === `option:${i}`} onClick={() => respond(`option:${i}`, { option: i })} />
        ))}
      </>;
      break;
    case "position":
      // Picked on the field, next to the card; the panel buttons are the fallback.
      body = <>
        <PositionFieldChoice duel={duel} prompt={prompt} busy={busy} pendingKey={pendingKey} respond={respond} />
        {positionChoices(prompt.positions).map(({ position, label }) => (
          <ChoiceButton key={position} label={label} disabled={busy} busy={pendingKey === `position:${position}`} onClick={() => respond(`position:${position}`, { position })} />
        ))}
      </>;
      break;
    case "place":
      body = <PlaceChoice duel={duel} prompt={prompt} busy={busy} pendingKey={pendingKey} respond={respond} />;
      break;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: HIGHLIGHT_CSS, display: "inline-block" }} />
        Your choice
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, opacity: 0.7 }}>{subtitle}</div>}
      {body}
    </div>
  );
}

const ERROR_VISIBLE_MS = 6000;
const NOTICE_VISIBLE_MS = 6000;

/**
 * Opt-in ("assisted mode") panel showing the human player the REAL legal
 * options ocgcore currently offers — the same data botDecision.ts already
 * drives the bot from — instead of only the free-form honor-system card
 * menus. The human's own chain windows ("Respond") and the effect prompts the
 * engine holds for them ("Your choice": which card, which Tribute, yes/no…)
 * are shown here too. Additive: when there's nothing to offer (not your
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
  // Short-lived notice (e.g. a card-menu move the engine doesn't offer right now).
  const [notice, setNotice] = useState<string | null>(null);
  const [hover, setHover] = useState<HighlightTarget | null>(null);
  const requestIdRef = useRef(0);
  const turnState = useDuelTurnState(duel);

  const enabled = !!duel.assist && duel.client.type === YGOClientType.PLAYER && !!duel.ygo?.options?.assistedMode;
  const [stopAtEveryWindow, setStopAtEveryWindow] = useStopAtEveryWindow(duel, enabled);

  const refresh = () => {
    if (!enabled || !duel.assist) return;
    const requestId = ++requestIdRef.current;
    duel.assist.query().then((res: AssistQueryResult) => {
      if (requestIdRef.current !== requestId) return; // superseded by a newer query
      setResult(res);
      duel.assistOptions = res; // card menus route matching moves through the engine
    }).catch(() => {
      if (requestIdRef.current !== requestId) return;
      setResult({ available: false });
      duel.assistOptions = null;
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
    // A card's own menu can make an assisted move too (YGOGameActions.routeAssisted).
    const onMenuStart = () => { setPendingKey("menu"); setError(null); };
    const onMenuDone = (payload?: { error?: unknown; notices?: string[] }) => {
      setPendingKey(null);
      if (payload?.error) setError(assistErrorMessage(payload.error));
      if (payload?.notices?.length) setNotice(payload.notices.join(" · "));
      refresh();
    };
    const onNotice = (payload?: { message?: string }) => { if (payload?.message) setNotice(payload.message); };
    // An undo / redo moved the duel (in a bot duel the server rebuilt its
    // engine there): the options on screen belong to the old position.
    const onTimelineMoved = () => { setError(null); refresh(); };
    duel.events.on("assist-refresh", onTimelineMoved);
    duel.events.on("enable-game-actions", onEnable);
    duel.events.on("assist-choice-start", onMenuStart);
    duel.events.on("assist-choice-done", onMenuDone);
    duel.events.on("assist-notice", onNotice);
    return () => {
      duel.events.off("enable-game-actions", onEnable);
      duel.events.off("assist-choice-start", onMenuStart);
      duel.events.off("assist-choice-done", onMenuDone);
      duel.events.off("assist-notice", onNotice);
      duel.events.off("assist-refresh", onTimelineMoved);
      duel.assistOptions = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel, enabled]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), ERROR_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const isActive = enabled && result.available;
  const sections = isActive ? sectionsFor(duel, result) : [];
  const prompt = isActive && result.pending === "prompt" ? result.prompt : null;
  const optionCount = sections.reduce((total, section) => total + section.rows.length, 0) + (prompt ? 1 : 0);
  const me = YGOStatic.playerIndex;
  const highlightTargets: HighlightTarget[] = [
    ...sections.flatMap((s) => s.rows).filter((r) => r.highlight && r.code !== undefined).map((r) => ({ code: r.code as number, side: me })),
    ...promptTargets(prompt),
  ];

  useCardHighlights(duel, highlightTargets, isActive ? hover : null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const placement = usePanelPlacement(panelRef, isMobileLayout);

  if (!enabled) return null;

  const busy = pendingKey !== null;
  const activePending = isActive ? result.pending : null;
  const decision = { pending: activePending, isLocalTurn: turnState.isLocalTurn };
  // A held prompt is the one thing the engine is waiting on — keep it on
  // screen even when the panel is collapsed. So is a chain window during the
  // opponent's turn: in a bot duel its turn is paused until you answer.
  const collapsed = placement.collapsed && !mustStayOpen(decision);
  const waitingText = opponentWaitingText({ ...decision, botDuel: !!(duel.ygo?.options as { botDuel?: unknown } | undefined)?.botDuel });
  const statusText = isActive
    ? (sections.length === 0 && !prompt ? "No options right now." : null)
    : assistUnavailableReason({
      loading,
      gameActive: duel.isGameActive,
      isLocalTurn: turnState.isLocalTurn,
      hasPriority: turnState.hasPriority,
    });

  const send = (key: string, commandType: string, data: any) => {
    if (busy || !duel.assist) return;
    setPendingKey(key);
    setError(null);
    setHover(null);
    duel.assist.choose({ commandType, data })
      .then((res: any) => {
        // e.g. "Bot activated Ash Blossom & Joyous Spring in response to your Bonfire"
        if (Array.isArray(res?.notices) && res.notices.length) setNotice(res.notices.join(" · "));
      })
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
  const choose = (row: OptionRow) => send(row.key, row.commandType, row.data);
  const respondPrompt = (key: string, data: any) => send(`prompt:${key}`, "Respond Prompt", data);
  const promptPendingKey = pendingKey?.startsWith("prompt:") ? pendingKey.slice("prompt:".length) : null;

  const stop = (e: { stopPropagation(): void }) => e.stopPropagation();

  return (
    <div
      ref={panelRef}
      className="ygo-card-menu ygo-assisted-options-panel"
      style={{
        ...placement.style,
        width: isMobileLayout && collapsed ? "auto" : 230,
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
          {assistPanelTitle(decision)}{collapsed && optionCount > 0 ? ` (${optionCount})` : ""}
        </span>
        <button
          onPointerDown={stop}
          onClick={placement.toggleCollapsed}
          aria-label={collapsed ? "Expand options" : "Collapse options"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand" : "Collapse"}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 2px", fontSize: 14, opacity: 0.7, lineHeight: 1 }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
      </div>
      {statusText && (!collapsed || !isActive) && (
        <div
          role="status"
          aria-live="polite"
          style={{
            fontSize: 12, opacity: 0.75, lineHeight: 1.35,
            // Collapsed, it's a one-line chip; expanded, the full sentence.
            ...(collapsed ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 } : {}),
          }}
        >
          {statusText}
        </div>
      )}
      {waitingText && (
        <div
          role="status"
          aria-live="assertive"
          style={{
            fontSize: 12, fontWeight: 600, lineHeight: 1.35, padding: "5px 8px", borderRadius: 4,
            background: "rgba(255, 201, 60, 0.2)", borderLeft: `3px solid ${HIGHLIGHT_CSS}`,
          }}
        >
          {waitingText}
        </div>
      )}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            fontSize: 12, lineHeight: 1.35, padding: "5px 8px", borderRadius: 4,
            background: "rgba(255, 201, 60, 0.14)", borderLeft: `3px solid ${HIGHLIGHT_CSS}`,
          }}
        >
          {notice}
        </div>
      )}
      {error && !collapsed && (
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
      {prompt && (
        <PromptView
          key={promptKey(prompt)}
          duel={duel}
          prompt={prompt}
          busy={busy}
          pendingKey={promptPendingKey}
          respond={respondPrompt}
          onHover={setHover}
        />
      )}
      {!collapsed && sections.map((section) => (
        <div key={section.title} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            {(section.title === "Activate" || section.title === "Respond") && (
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
              onMouseEnter={() => setHover(row.code !== undefined ? { code: row.code, side: me } : null)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(row.code !== undefined ? { code: row.code, side: me } : null)}
              onBlur={() => setHover(null)}
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
      {!collapsed && (
        <label
          title="Stop at each of your chain windows, even when you have nothing to chain (the bot waits for you)"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.7, marginTop: 2, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={stopAtEveryWindow}
            onChange={(e) => setStopAtEveryWindow(e.target.checked)}
          />
          Stop at every window
        </label>
      )}
    </div>
  );
}
