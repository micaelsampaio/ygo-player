/**
 * Assisted Mode's three.js glow: pulsing frames around the cards the panel's
 * options (or a held prompt's candidates) point at, and around the Extra
 * Deck pile while something in it can be Special Summoned.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { YGODuel } from "../../core/YGODuel";
import { createHighlightFrame, disposeHighlightFrame, HIGHLIGHT_COLOR, HIGHLIGHT_CSS, QUICK_COLOR, QUICK_CSS, PICK_COLOR, PICK_CSS, placeHighlightFrame } from "../../game/meshes/highlight-frame";
import type { Tone } from "../assist-sections";
import { PromptData, LOC_HAND, LOC_MZONE as LOC_M, LOC_SZONE as LOC_S } from "../assist-prompt";

export const TONE_CSS: Record<Tone, string> = { play: HIGHLIGHT_CSS, quick: QUICK_CSS, pick: PICK_CSS };
export const TONE_COLOR: Record<Tone, number> = { play: HIGHLIGHT_COLOR, quick: QUICK_COLOR, pick: PICK_COLOR };

const PULSE_MIN = 0.45;
const PULSE_MAX = 1;
const PULSE_PERIOD_MS = 1400;

/** The live 3D objects currently showing a card with this code on the
 * viewer's own side — every copy in the hand or on the field. GY/banished
 * cards have no individual object, so they aren't highlighted (the panel
 * row's location tag covers them). */
export function findCardObjects(duel: YGODuel, playerIndex: number, code: number, loc?: number): THREE.Object3D[] {
  const field = duel.fields[playerIndex];
  if (!field) return [];
  // The option's own location, when known: a Fabled Lurrie triggering in the
  // GY must not light up the copy still in the hand.
  const inHandOk = loc === undefined || (loc & LOC_HAND) !== 0;
  const onFieldOk = loc === undefined || (loc & (LOC_M | LOC_S)) !== 0;
  if (!inHandOk && !onFieldOk) return [];
  // The hand's list can briefly hold a replaced (hidden) object for a card
  // next to its live one (a re-deal, a hand refresh): frame the ones on
  // screen, or a frame copies the hidden object's visibility and never shows.
  const inHand = inHandOk ? field.hand.cards.filter((c) => c.card.id === code) : [];
  const shown = inHand.filter((c) => c.gameObject.visible);
  const objects: THREE.Object3D[] = (shown.length ? shown : inHand).map((c) => c.gameObject);
  const zones = onFieldOk ? [...field.monsterZone, ...field.spellTrapZone, field.fieldZone, ...duel.fields[0].extraMonsterZone] : [];
  for (const zone of zones) {
    if (zone.getCardReference()?.id !== code) continue;
    const object = zone.getGameCard()?.gameObject;
    if (object) objects.push(object);
  }
  return objects;
}

function disposeFrame(duel: YGODuel, frame: THREE.Mesh) {
  disposeHighlightFrame(duel.core.scene, frame);
}

/** A card to frame on the board: its code, on whose side (a viewer-relative ygo player index). */
/** `loc`: the option's ocgcore location, when known — only a card there is framed. */
export interface HighlightTarget { code: number; side: number; tone?: Tone; loc?: number }

const targetKey = (t: HighlightTarget) => `${t.side}:${t.code}:${t.tone ?? "play"}:${t.loc ?? "any"}`;

/**
 * Pulsing amber frame around every card with an activatable effect right
 * now (or every candidate of a held effect prompt). Each tick re-copies the
 * card's live transform, so the frame follows hand re-fans (after a summon)
 * and hover lifts instead of going stale. The tick loop only runs while at
 * least one frame exists — this panel is mounted in every duel, assisted or
 * not. `hover` (the row under the pointer) gets the same frame, so any row
 * can be matched to its card.
 */
export function useCardHighlights(duel: YGODuel, targets: HighlightTarget[], hover: HighlightTarget | null) {
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
      // One frame per copy: two Effect Veilers in the hand are both usable.
      const desired = new Map<string, { target: THREE.Object3D; tone: Tone }>();
      for (const [key, t] of wantedRef.current) {
        findCardObjects(duel, t.side, t.code, t.loc).forEach((target, i) => desired.set(`${key}#${i}`, { target, tone: t.tone ?? "play" }));
      }
      for (const [key, entry] of frames) {
        if (desired.get(key)?.target !== entry.target) {
          disposeFrame(duel, entry.frame);
          frames.delete(key);
        }
      }
      for (const [key, { target, tone }] of desired) {
        if (frames.has(key)) continue;
        const frame = createHighlightFrame(target, PULSE_MAX, TONE_COLOR[tone]);
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

/**
 * The viewer's Extra Deck pile gets the same pulsing amber ("play") frame
 * while something in it can be Special Summoned — its cards have no object
 * of their own to frame. Clicking the pile still opens it. The frame follows
 * the pile's top card (it changes as the pile shrinks or grows).
 */
export function useExtraDeckHighlight(duel: YGODuel, active: boolean) {
  usePileHighlight(duel, () => duel.fields[duel.perspective.playerIndex]?.extraDeck?.getCardTransform() ?? null, active, "play");
}

/**
 * The same pulsing frame on any pile of the viewer (Extra Deck, GY, banished) while something in
 * it can be used: `target` gives the object to frame each tick (it can change as the pile changes).
 */
export function usePileHighlight(duel: YGODuel, target: () => THREE.Object3D | null, active: boolean, tone: Tone) {
  const targetRef = useRef(target);
  targetRef.current = target;
  useEffect(() => {
    if (!active) return;
    let entry: { frame: THREE.Mesh; target: THREE.Object3D } | null = null;
    const drop = () => {
      if (entry) disposeFrame(duel, entry.frame);
      entry = null;
    };
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const target = targetRef.current();
      if (entry?.target !== target) {
        drop();
        if (target) {
          entry = { frame: createHighlightFrame(target, PULSE_MAX, TONE_COLOR[tone]), target };
          duel.core.scene.add(entry.frame);
        }
      }
      if (entry) {
        const t = (Date.now() % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
        placeHighlightFrame(entry.frame, entry.target);
        entry.frame.visible = entry.target.visible;
        (entry.frame.material as THREE.MeshBasicMaterial).opacity = PULSE_MIN + (PULSE_MAX - PULSE_MIN) * ((Math.sin(t * Math.PI * 2) + 1) / 2);
      }
      timer = setTimeout(tick, 32);
    };
    tick();
    return () => {
      clearTimeout(timer);
      drop();
    };
  }, [duel, active, tone]);
}

/** Only cards that exist as an object on the board can be framed (hand / field). */
/** `me`: the local player (duel.perspective.playerIndex). */
export function promptTargets(prompt: PromptData | null, me: number): HighlightTarget[] {
  if (!prompt?.candidates) return [];
  return prompt.candidates
    .filter((c) => (c.loc & (LOC_HAND | LOC_M | LOC_S)) !== 0)
    // Green: a card to choose, never the amber "you can play this".
    .map((c) => ({ code: c.code, side: c.ctrl === prompt.player ? me : 1 - me, loc: c.loc, tone: "pick" as const }));
}
