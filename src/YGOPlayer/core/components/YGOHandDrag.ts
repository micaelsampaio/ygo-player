import * as THREE from "three";
import { YGOClientType } from "ygo-core";
import { YGOComponent } from "../YGOComponent";
import type { YGODuel } from "../YGODuel";
import type { YGOUiElement } from "../../types";
import type { GameCardHand } from "../../game/GameCardHand";
import type { CardZone } from "../../game/CardZone";
import type { HandDragUiState } from "../YGODuelUIEvents";
import type { YGOPointerDragHandler } from "./YGOMouseEvents";
import { createCardSelectionGeometry } from "../../game/meshes/CardSelectionMesh";
import { HIGHLIGHT_COLOR, PICK_COLOR } from "../../game/meshes/highlight-frame";
import { prefersReducedMotion } from "../../duel-events/utils/battle-fx";
import { selectionOpacity } from "../../domain/assist-zones";
import { stopPulse } from "../../game/object-pulse";
import {
  dragTilt, gestureDecision, TOUCH_LONG_PRESS_MS, TOUCH_SLOP_PX, type DropTarget, type DropZoneState, type HandDropTargets,
} from "../../domain/hand-drag";

/**
 * What a drop from the hand means: which targets a card has and what a drop on one does.
 * Assisted Mode installs one built on the engine's legal moves (ui/hand-drag-assisted.ts);
 * a manual duel could install its own (none does yet).
 */
export interface HandDropProvider {
  /** The card's targets right now, given your zones; null (or nothing lit): it can't be dragged. */
  targets(card: GameCardHand, zones: DropZoneState[]): HandDropTargets | null;
  /** The card was dropped on one of its targets. */
  drop(card: GameCardHand, target: DropTarget, opts: { shift: boolean; event: PointerEvent; targets: HandDropTargets }): void;
}

/** How far above the field the dragged card floats (toward the camera, which looks down at z = 0). */
const DRAG_PLANE_Z = 2.4;
/** The card leans back toward the viewer while lifted. */
const DRAG_LEAN_X = 0.22;
/** Seconds the card takes to slide back into the hand. */
const RETURN_SECONDS = 0.16;
const LIFT_SCALE = 1.08;

interface Candidate {
  pointerId: number;
  pointerType: string;
  card: GameCardHand;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  time: number;
  timer: ReturnType<typeof setTimeout> | undefined;
}

interface Drag {
  pointerId: number;
  pointerType: string;
  card: GameCardHand;
  targets: HandDropTargets;
  zones: Map<string, CardZone>;
  glows: Map<string, THREE.Mesh>;
  hover: DropTarget | null;
  shift: boolean;
  x: number;
  y: number;
  /** Where the press went down, and whether the pointer has left it since (a touch long press released in place is a tap). */
  startX: number;
  startY: number;
  moved: boolean;
  velocityX: number;
  lastMoveTime: number;
  scale: THREE.Vector3;
  rotation: THREE.Euler;
  unsubscribeEsc: () => void;
  time: number;
}

interface Returning {
  card: GameCardHand;
  from: THREE.Vector3;
  fromRotation: THREE.Euler;
  fromScale: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  t: number;
}

/** A hand card, as YGOMouseEvents hands it over (duck-typed: game/ isn't imported at runtime from here). */
function asHandCard(element: YGOUiElement | null): GameCardHand | null {
  const el = element as Partial<GameCardHand> | null;
  if (!el || !el.isUiCardElement || typeof el.handIndex !== "number" || !el.card || !el.gameObject) return null;
  return el as GameCardHand;
}

/** Assisted Mode for the local player (the engine knows every legal move): where dragging can be on. */
export function handDragAvailable(duel: Pick<YGODuel, "assist" | "client" | "ygo">): boolean {
  const options = duel.ygo?.options as { assistedMode?: unknown } | undefined;
  return !!duel.assist && duel.client?.type === YGOClientType.PLAYER && !!options?.assistedMode;
}

/**
 * Drag and drop from the hand. A press on one of your hand cards becomes a drag past the gesture
 * thresholds (domain/hand-drag.ts); the card follows the pointer, lifted and leaning, the zones a
 * drop can use glow (the one under the pointer brighter), and on release the provider makes the
 * move. Anywhere else (or Escape) the card slides back. Pointer events come from YGOMouseEvents;
 * a click (no drag) still opens the card's menu as before.
 */
export class YGOHandDrag extends YGOComponent implements YGOPointerDragHandler {
  private provider: HandDropProvider | null = null;
  private candidate: Candidate | null = null;
  private drag: Drag | null = null;
  private returning: Returning[] = [];
  private suppressClick = false;
  private setTarget: HTMLElement | null = null;
  private lastUiState = "";
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -DRAG_PLANE_Z);
  private onTouchMove = (e: TouchEvent) => this.handleTouchMove(e);
  private onContextMenu = (e: Event) => { if (this.drag || this.candidate) e.preventDefault(); };
  private onKey = (e: KeyboardEvent) => { if (this.drag && e.key === "Shift") { this.drag.shift = e.type === "keydown"; this.publishUi(); } };
  private onDisable = () => this.cancel();
  private canvas: HTMLCanvasElement | null = null;

  constructor(private duel: YGODuel) {
    super("hand_drag");
  }

  public start(): void {
    this.duel.mouseEvents.dragHandler = this;
    this.canvas = this.duel.core.renderer?.domElement ?? null;
    // Not passive: a touch drag must stop the page from scrolling under it.
    this.canvas?.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.canvas?.addEventListener("contextmenu", this.onContextMenu);
    this.duel.events.on("disable-game-actions", this.onDisable);
  }

  public onDestroy(): void {
    this.cancel();
    if (this.duel.mouseEvents.dragHandler === this) this.duel.mouseEvents.dragHandler = null;
    this.canvas?.removeEventListener("touchmove", this.onTouchMove);
    this.canvas?.removeEventListener("contextmenu", this.onContextMenu);
    this.duel.events.off("disable-game-actions", this.onDisable);
  }

  /** Installs what drops mean; the returned function removes it (if still the current one). */
  public setProvider(provider: HandDropProvider): () => void {
    this.provider = provider;
    return () => {
      if (this.provider !== provider) return;
      this.cancel();
      this.provider = null;
    };
  }

  /** The Set chip (ui/components/HandDragOverlay), hit-tested by its box. */
  public setSetTargetElement(el: HTMLElement | null) {
    this.setTarget = el;
  }

  public isDragging(): boolean {
    return !!this.drag;
  }

  public consumeClick(): boolean {
    const suppress = this.suppressClick;
    this.suppressClick = false;
    return suppress;
  }

  // --- pointer --------------------------------------------------------------

  public onPointerDown(event: PointerEvent, element: YGOUiElement | null): void {
    this.suppressClick = false;
    if (this.drag) return;
    this.clearCandidate();
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (this.canvas && event.target !== this.canvas) return;
    const card = asHandCard(element);
    if (!card || !this.canDrag(card)) return;
    const candidate: Candidate = {
      pointerId: event.pointerId, pointerType: event.pointerType, card,
      x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, time: performance.now(), timer: undefined,
    };
    if (event.pointerType !== "mouse") {
      // A long press: still where it went down after TOUCH_LONG_PRESS_MS.
      candidate.timer = setTimeout(() => {
        if (this.candidate !== candidate) return;
        this.evaluate(candidate, candidate.lastX, candidate.lastY, event);
      }, TOUCH_LONG_PRESS_MS);
    }
    this.candidate = candidate;
  }

  public onPointerMove(event: PointerEvent): void {
    const candidate = this.candidate;
    if (candidate && candidate.pointerId === event.pointerId) {
      candidate.lastX = event.clientX;
      candidate.lastY = event.clientY;
      this.evaluate(candidate, event.clientX, event.clientY, event);
      return;
    }
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastMoveTime) / 1000;
    // Smoothed horizontal speed (px/s) for the lean.
    drag.velocityX = drag.velocityX * 0.7 + ((event.clientX - drag.x) / dt) * 0.3;
    drag.lastMoveTime = now;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > TOUCH_SLOP_PX) drag.moved = true;
    drag.shift = event.shiftKey;
    drag.hover = this.targetAt(drag, event.clientX, event.clientY);
    this.publishUi();
  }

  public onPointerUp(event: PointerEvent): void {
    if (this.candidate?.pointerId === event.pointerId) {
      // Never became a drag: the click that follows is an ordinary click.
      this.clearCandidate();
      return;
    }
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const target = this.targetAt(drag, event.clientX, event.clientY);
    const shift = event.shiftKey || drag.shift;
    this.endDrag();
    // A touch long press let go where it started is still a tap: its click opens the card's menu.
    this.suppressClick = drag.pointerType === "mouse" || drag.moved;
    if (target && this.provider) {
      try {
        this.provider.drop(drag.card, target, { shift, event, targets: drag.targets });
      } catch (error) {
        this.duel.logger.warn("YGOHandDrag", "drop failed", error);
      }
    }
  }

  public onPointerCancel(event: PointerEvent): void {
    if (this.candidate?.pointerId === event.pointerId) this.clearCandidate();
    if (this.drag?.pointerId === event.pointerId) this.cancel();
  }

  /** Drops the drag (Escape, an animation starting, the provider going away): the card goes back. */
  public cancel(): void {
    this.clearCandidate();
    if (!this.drag) return;
    this.endDrag();
    // The button may still be down: its click is not a click on the card.
    this.suppressClick = true;
  }

  private evaluate(candidate: Candidate, x: number, y: number, event: PointerEvent) {
    const decision = gestureDecision({
      pointerType: candidate.pointerType, dx: x - candidate.x, dy: y - candidate.y, elapsedMs: performance.now() - candidate.time,
    });
    if (decision === "cancel") this.clearCandidate();
    else if (decision === "drag") this.startDrag(candidate, x, y, event);
  }

  private handleTouchMove(e: TouchEvent) {
    if (this.drag) { if (e.cancelable) e.preventDefault(); return; }
    const candidate = this.candidate;
    const touch = e.touches[0];
    if (!candidate || !touch) return;
    // Pulling up out of the hand: keep the page still so the pull can become a drag.
    const dx = touch.clientX - candidate.x;
    const dy = touch.clientY - candidate.y;
    if (-dy > Math.abs(dx) && e.cancelable) e.preventDefault();
  }

  private clearCandidate() {
    if (this.candidate?.timer) clearTimeout(this.candidate.timer);
    this.candidate = null;
  }

  // --- drag -----------------------------------------------------------------

  private enabledBySetting(): boolean {
    return this.duel.settings?.getConfigFromPath?.("dragFromHand") !== false;
  }

  private canDrag(card: GameCardHand): boolean {
    if (!this.provider || !this.enabledBySetting()) return false;
    if (!this.duel.isGameActive || !this.duel.actionManager.actionsEnabled) return false;
    if (this.duel.commands?.isBusy?.()) return false;
    if (!card.isVisible || !card.gameObject.parent) return false;
    return card.player === this.duel.perspective.playerIndex;
  }

  /** Your field zones a hand card can go to, and whether each holds a card. */
  private myZones(): CardZone[] {
    const field = this.duel.fields[this.duel.perspective.playerIndex];
    if (!field) return [];
    return [...field.monsterZone, ...field.spellTrapZone, field.fieldZone].filter(Boolean);
  }

  private startDrag(candidate: Candidate, x: number, y: number, event: PointerEvent) {
    this.clearCandidate();
    const { card } = candidate;
    if (!this.provider || !this.canDrag(card)) return;
    const cardZones = this.myZones();
    const targets = this.provider.targets(card, cardZones.map((z) => ({ zone: z.zone, occupied: z.hasCard() })));
    if (!targets || (targets.zones.length === 0 && !targets.set)) return;

    // A menu open on another card closes; whatever was hovered (and its preview) is left.
    if (this.duel.actionManager.action?.name !== "IDLE") this.duel.actionManager.clearAction();
    this.duel.mouseEvents.leaveHover(event);
    // Holding a card on the board also counts toward its long-press preview: not while dragging.
    this.duel.events.dispatch("on-card-mouse-up", { card: null, event });
    try { this.canvas?.setPointerCapture(candidate.pointerId); } catch { /* the pointer is already gone */ }

    // A card still sliding back from an earlier drag is taken over, and a double-click pulse
    // still running on it ends: the drag lifts from the card's REST scale, not a mid-animation one
    // (which the slide back would then restore for good — an enlarged card in the hand).
    const resting = this.restScale(card);
    this.returning = this.returning.filter((r) => r.card !== card);

    const zones = new Map<string, CardZone>();
    const glows = new Map<string, THREE.Mesh>();
    for (const cardZone of cardZones) {
      if (!targets.zones.includes(cardZone.zone)) continue;
      zones.set(cardZone.zone, cardZone);
      glows.set(cardZone.zone, this.createGlow(cardZone));
    }

    this.drag = {
      pointerId: candidate.pointerId,
      pointerType: candidate.pointerType,
      card,
      targets,
      zones,
      glows,
      hover: null,
      shift: event.shiftKey,
      x, y,
      startX: candidate.x,
      startY: candidate.y,
      moved: Math.hypot(x - candidate.x, y - candidate.y) > TOUCH_SLOP_PX,
      velocityX: 0,
      lastMoveTime: performance.now(),
      scale: resting,
      rotation: this.handRotation(card),
      unsubscribeEsc: this.duel.globalHotKeysManager.on("escPressed", () => this.cancel()),
      time: 0,
    };
    this.drag.hover = this.targetAt(this.drag, x, y);
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKey);
    this.publishUi();
  }

  /**
   * The scale the card has at rest in the hand: its slot in the hand's layout, else the end of a
   * running pulse / slide back, else its scale now. Ends a running pulse.
   */
  private restScale(card: GameCardHand): THREE.Vector3 {
    const pulseBase = stopPulse(card.gameObject);
    const hand = this.duel.fields[card.player]?.hand;
    const slot = hand?.cards && typeof hand.getCardsTransforms === "function" && hand.cards.includes(card)
      ? hand.getCardsTransforms(hand.cards.length)[card.handIndex]
      : undefined;
    if (slot) return slot.scale.clone();
    const returning = this.returning.find((r) => r.card === card);
    return (returning?.scale ?? pulseBase ?? card.gameObject.scale).clone();
  }

  /** The rotation cards have in this hand (its fan is flat: one for all). */
  private handRotation(card: GameCardHand): THREE.Euler {
    const hand = this.duel.fields[card.player]?.hand;
    return hand ? new THREE.Euler().setFromVector3(hand.getCardsRotation()) : card.gameObject.rotation.clone();
  }

  private endDrag() {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    drag.unsubscribeEsc();
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKey);
    try { this.canvas?.releasePointerCapture(drag.pointerId); } catch { /* not captured */ }
    for (const glow of drag.glows.values()) {
      this.duel.core.scene.remove(glow);
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
    }
    this.publishUi();
    this.sendBack(drag);
  }

  /** The card slides back to its place in the hand (at once with reduced motion). */
  private sendBack(drag: Drag) {
    const { card } = drag;
    if (!card.gameObject.parent) return;
    if (prefersReducedMotion()) {
      this.restore(card, drag.rotation, drag.scale);
      return;
    }
    this.returning.push({
      card,
      from: card.gameObject.position.clone(),
      fromRotation: card.gameObject.rotation.clone(),
      fromScale: card.gameObject.scale.clone(),
      rotation: drag.rotation,
      scale: drag.scale,
      t: 0,
    });
  }

  /** The card back on its rest transform (its hand slot: card.position, the hand's rotation and scale). */
  private restore(card: GameCardHand, rotation: THREE.Euler, scale: THREE.Vector3) {
    card.gameObject.position.copy(card.position);
    card.gameObject.rotation.copy(rotation);
    card.gameObject.scale.copy(scale);
    card.gameObject.renderOrder = 0;
  }

  private targetAt(drag: Drag, x: number, y: number): DropTarget | null {
    if (drag.targets.set && this.overSetTarget(x, y)) return { kind: "set" };
    const objects = [...drag.zones.values()].map((z) => z.gameObject);
    const hit = this.duel.mouseEvents.raycastObjects(x, y, objects)[0];
    if (!hit) return null;
    for (const [zone, cardZone] of drag.zones) if (cardZone.gameObject === hit.object) return { kind: "zone", zone };
    return null;
  }

  private overSetTarget(x: number, y: number): boolean {
    const el = this.setTarget;
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const pad = 10;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  private createGlow(cardZone: CardZone): THREE.Mesh {
    const width = cardZone.size.x * cardZone.scale.x;
    const height = cardZone.size.y * cardZone.scale.y;
    const material = new THREE.MeshBasicMaterial({ color: HIGHLIGHT_COLOR, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(createCardSelectionGeometry(width * 0.98, height * 0.98, 0.14), material);
    mesh.position.copy(cardZone.gameObject.position);
    mesh.position.z += 0.02;
    mesh.rotation.copy(cardZone.gameObject.rotation);
    mesh.renderOrder = 9;
    this.duel.core.scene.add(mesh);
    return mesh;
  }

  private publishUi() {
    const drag = this.drag;
    const state: HandDragUiState | null = drag ? {
      set: drag.targets.set,
      overSet: drag.hover?.kind === "set",
      shift: drag.shift,
      overZone: drag.hover?.kind === "zone",
    } : null;
    const key = JSON.stringify(state);
    if (key === this.lastUiState) return;
    this.lastUiState = key;
    this.duel.events.dispatch("hand-drag-state", state);
  }

  // --- frame ----------------------------------------------------------------

  public update(): void {
    const dt = this.duel.core.unscaledDeltaTime || 1 / 60;
    const reduced = prefersReducedMotion();
    this.updateReturning(dt, reduced);
    const drag = this.drag;
    if (!drag) return;
    const object = drag.card.gameObject;
    // The card left the hand under us (an undo, a rebuilt hand): nothing to drag any more.
    if (!object.parent) { this.cancel(); return; }

    drag.time += dt * 10;
    const ray = this.duel.mouseEvents.rayAt(drag.x, drag.y);
    const point = ray.intersectPlane(this.plane, new THREE.Vector3());
    if (point) {
      if (reduced) object.position.copy(point);
      else object.position.lerp(point, Math.min(1, dt * 30));
    }
    const lean = reduced ? 0 : DRAG_LEAN_X;
    const tilt = dragTilt(drag.velocityX, reduced);
    object.rotation.set(drag.rotation.x - lean, drag.rotation.y + tilt * 0.4, drag.rotation.z + tilt * 0.5);
    // The velocity settles when the pointer rests.
    drag.velocityX *= Math.max(0, 1 - dt * 8);
    object.scale.copy(drag.scale).multiplyScalar(reduced ? 1 : LIFT_SCALE);
    object.renderOrder = 12;

    const hovered = drag.hover?.kind === "zone" ? drag.hover.zone : null;
    const pulse = selectionOpacity(drag.time, reduced, 0.45, 0.85);
    for (const [zone, glow] of drag.glows) {
      const material = glow.material as THREE.MeshBasicMaterial;
      const on = zone === hovered;
      material.opacity = on ? 1 : pulse;
      material.color.setHex(on ? PICK_COLOR : HIGHLIGHT_COLOR);
      glow.scale.setScalar(on && !reduced ? 1.06 : 1);
    }
  }

  private updateReturning(dt: number, reduced: boolean) {
    if (this.returning.length === 0) return;
    this.returning = this.returning.filter((r) => {
      const object = r.card.gameObject;
      if (!object.parent) return false;
      r.t = reduced ? 1 : Math.min(1, r.t + dt / RETURN_SECONDS);
      const k = 1 - (1 - r.t) * (1 - r.t);
      object.position.lerpVectors(r.from, r.card.position, k);
      object.rotation.set(
        THREE.MathUtils.lerp(r.fromRotation.x, r.rotation.x, k),
        THREE.MathUtils.lerp(r.fromRotation.y, r.rotation.y, k),
        THREE.MathUtils.lerp(r.fromRotation.z, r.rotation.z, k),
      );
      object.scale.lerpVectors(r.fromScale, r.scale, k);
      // Lands on the live slot: the hand may have re-laid out while the card slid back.
      if (r.t >= 1) { this.restore(r.card, r.rotation, this.restScale(r.card)); return false; }
      return true;
    });
  }
}
