/**
 * Assisted Mode's "Your choice" section: the effect prompt the engine is
 * holding for the human, answered from the panel or on the field.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { YGODuel } from "../../core/YGODuel";
import { YGOStatic } from "../../core/YGOStatic";
import { HIGHLIGHT_CSS } from "../../game/meshes/highlight-frame";
import { useFieldSelection } from "./field-selection";
import { EnginePlace, pickZone, placeToYgoZone, samePlace, ZoneHighlight, zoneHighlights } from "../assist-zones";
import { PileChoicePopup } from "./pile-choice/PileChoicePopup";
import { pileTabs, reopenLabel, usesPilePicker } from "./pile-choice/pile-choice";
import { ndcToContainer, positionGlyph, shortPositionLabel } from "../field-overlay";
import {
  CardRefData, PromptData, candidateWhere, isSelectionValid, optionLabel, toggleSelection,
  groupCandidates, positionChoices, promptSubtitle, promptTitle, toggleGroupSelection, LOC_HAND, LOC_MZONE as LOC_M, LOC_SZONE as LOC_S,
} from "../assist-prompt";
import { findCardObjects, type HighlightTarget } from "./assist-highlights";

/**
 * The panel's container (its offsetParent), found from an element rendered
 * inside the panel — where overlays that must show even with the panel
 * collapsed or moved away are portaled to.
 */
function useOffsetParentContainer<T extends HTMLElement>() {
  const probeRef = useRef<T | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const panel = probeRef.current?.closest(".ygo-assisted-options-panel") as HTMLElement | null;
    setContainer((panel?.offsetParent as HTMLElement | null) ?? null);
  }, []);
  return [probeRef, container] as const;
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
 * one answers it. The glow comes back after animations; if the player
 * dismisses it (Esc / click away) it stays off until they ask for it again
 * from the panel. Cleared once the prompt is answered or goes away.
 */
function useFieldZoneSelection(duel: YGODuel, zones: ZoneHighlight[], enabled: boolean, onPick: (place: EnginePlace) => void) {
  return useFieldSelection(duel, zones.map((z) => ({ zone: z.zone, value: z.place })), zones.map((z) => z.zone).join(","), {
    selectionType: "zone",
    enabled,
    onPick,
    dismissible: true,
  });
}

/**
 * A card prompt answered on the field: the candidates that are on the board
 * are picked by clicking the card itself (the target of "destroy 1 card on
 * the field", a Tribute, a material), as in a manual duel — each click is
 * that candidate's choice. The panel list stays as the fallback.
 */
function useFieldCardSelection(duel: YGODuel, targets: Array<{ index: number; zone: string }>, enabled: boolean, onPick: (index: number) => void) {
  useFieldSelection(duel, targets.map((t) => ({ zone: t.zone, value: t.index })), targets.map((t) => `${t.index}@${t.zone}`).join(","), {
    selectionType: "card",
    enabled,
    onPick,
  });
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
  const card = code !== undefined ? findCardObjects(duel, me, code)[0] ?? null : null;
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
  const [probeRef, container] = useOffsetParentContainer<HTMLSpanElement>();
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const choices = positionChoices(prompt.positions);

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
export function PromptView({ duel, prompt, busy, pendingKey, respond, onHover }: {
  duel: YGODuel;
  prompt: PromptData;
  busy: boolean;
  pendingKey: string | null;
  respond: (key: string, data: any) => void;
  onHover: (target: HighlightTarget | null) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  // A choice from a pile (Deck, GY, banished, Extra Deck) opens in a pile
  // view by itself; closing it only minimizes it (the button below reopens it).
  const pilePicker = usesPilePicker(prompt);
  const [pickerOpen, setPickerOpen] = useState(pilePicker);
  const [probeRef, pickerContainer] = useOffsetParentContainer<HTMLDivElement>();
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

  // Candidates on the field are also picked by clicking the card there.
  const cardPrompt = prompt.kind === "card" || prompt.kind === "tribute" || prompt.kind === "unselectCard";
  const fieldTargets = cardPrompt
    ? candidates.flatMap((c, index) => {
      if (!(c.loc & (LOC_M | LOC_S)) || (prompt.kind !== "unselectCard" && selected.includes(index))) return [];
      const zone = placeToYgoZone({ player: c.ctrl, loc: c.loc & LOC_M ? LOC_M : LOC_S, seq: c.seq }, prompt.player, me);
      return zone ? [{ index, zone }] : [];
    })
    : [];
  const pickOnField = (index: number) => {
    if (prompt.kind === "unselectCard") { respond(`pick:${index}`, { index }); return; }
    // One card to choose: clicking it is the answer. Several: it's one of the picks (then Confirm).
    if ((prompt.max ?? 1) <= 1 && (prompt.min ?? 1) <= 1) { respond("confirm", { indices: [index] }); return; }
    setSelected((prev) => toggleSelection(prompt, prev, index));
  };
  useFieldCardSelection(duel, fieldTargets, !busy && !(pilePicker && pickerOpen), pickOnField);
  // …and candidates in the hand by clicking the card in the hand (they have
  // the yellow frame): the click picks it instead of opening its menu.
  const handPickRef = useRef<(player: number, code: number) => boolean>(() => false);
  handPickRef.current = (player, code) => {
    if (!cardPrompt || busy || (pilePicker && pickerOpen)) return false;
    const matches = candidates
      .map((c, index) => ({ c, index }))
      .filter(({ c }) => (c.loc & LOC_HAND) !== 0 && c.code === code && (c.ctrl === prompt.player ? me : 1 - me) === player);
    if (matches.length === 0) return false;
    // Copies of a card in the hand are the same choice: take one not picked yet.
    pickOnField((matches.find((m) => !selected.includes(m.index)) ?? matches[0]).index);
    return true;
  };
  useEffect(() => {
    const pick = (player: number, code: number) => handPickRef.current(player, code);
    duel.assistHandPick = pick;
    return () => {
      if (duel.assistHandPick === pick) duel.assistHandPick = null;
    };
  }, [duel]);

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
    <div ref={probeRef} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: HIGHLIGHT_CSS, display: "inline-block" }} />
        Your choice
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, opacity: 0.7 }}>{subtitle}</div>}
      {pilePicker && (
        <button
          className="ygo-card-item"
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{ fontWeight: 700, fontSize: 13, justifyContent: "center", boxShadow: `inset 0 0 0 1px ${HIGHLIGHT_CSS}` }}
        >
          {reopenLabel(pileTabs(prompt))}
        </button>
      )}
      {body}
      {pilePicker && pickerOpen && pickerContainer && (
        <PileChoicePopup
          duel={duel}
          prompt={prompt}
          container={pickerContainer}
          selected={selected}
          busy={busy}
          pendingKey={pendingKey}
          onToggle={(group) => setSelected((prev) => toggleGroupSelection(prompt, prev, group))}
          onPick={(i) => respond(`pick:${i}`, { index: i })}
          onConfirm={() => respond("confirm", { indices: selected })}
          onCancel={prompt.cancelable ? () => respond("cancel", { indices: [] }) : undefined}
          onFinish={prompt.finishable || prompt.cancelable ? () => respond("finish", { index: -1 }) : undefined}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
