import * as THREE from 'three';
import type { YGODuel } from "../core/YGODuel";
import { YGOEntity } from '../core/YGOEntity';
import type { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import type { YGOUiElement } from '../types';
import { YGOClientType, YGODuelPhase } from 'ygo-core';
import { ActionUiMenu } from '../actions/ActionUiMenu';
import { phaseObjectTooltip, turnOwnerLabel } from '../domain/turn-status';
import { prefersReducedMotion } from '../duel-events/utils/battle-fx';
import {
  BATTLE_GLOW_COLOR,
  FLIP_PHASE,
  FLIP_TURN,
  MEDALLION_FONT_FAMILY,
  battleGlowOpacity,
  flashOpacity,
  flipState,
  isBattlePhase,
  medallionCanvasSize,
  medallionChange,
  medallionPalette,
  medallionPhaseWord,
  pulseScale,
} from './phase-medallion';

interface MedallionState {
  turn: number;
  turnPlayer: number;
  phase: YGODuelPhase;
}

interface FlipAnimation {
  elapsed: number;
  duration: number;
  halfTurns: number;
  swapped: boolean;
}

/** Logical texture size; the backing canvas is this × devicePixelRatio (≤2). */
const LOGICAL = 512;
/** Radius of the printed medallion disc (the glb cylinder underneath is r≈1.5). */
const FACE_RADIUS = 1.45;
/** Local height of the placeholder disc inside the player_turn cylinder (top ≈ 0.647). */
const FACE_HEIGHT = 0.674;

/**
 * The Master Duel–style "Turn N / Phase" medallion on the right of the field.
 * Gold-rimmed coin, blue face on the viewer's turn and red on the opponent's;
 * it coin-flips on a phase change (full flip on a turn change) and glows red
 * while in the Battle Phase. Clicking it opens the duel-phase menu.
 */
export class YGOPhaseObject extends YGOEntity implements YGOUiElement {
  public isUiElement: boolean = true;
  private fieldTurn: THREE.Object3D;
  private fieldTurnHover: THREE.Mesh;
  private baseScale = new THREE.Vector3(1, 1, 1);
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public texture: THREE.Texture;
  private glow: THREE.Mesh;
  private glowMaterial: THREE.MeshBasicMaterial;
  public action: ActionUiMenu;
  private tooltip = "";
  private hovered = false;

  /** What the face currently shows / what it should show once a flip passes edge-on. */
  private displayed: MedallionState | null = null;
  private target: MedallionState;
  private flip: FlipAnimation | null = null;
  private clock = 0;
  private reducedMotion = prefersReducedMotion();

  constructor(private duel: YGODuel) {
    super();

    const fieldObject = this.duel.assets.models.get(this.duel.createCdnUrl("/models/field_objects.glb"))?.scene.clone()!;
    const fieldTurn = fieldObject.children.find(children => children.name === "player_turn")! as THREE.Mesh;
    const fieldTurnPlaceHolder = fieldObject.children.find(children => children.name === "player_turn_placeholder")!.clone()! as THREE.Mesh;
    this.fieldTurnHover = fieldObject.children.find(children => children.name === "player_turn_hover")!.clone() as THREE.Mesh;
    this.fieldTurn = fieldTurn;

    // Dark bronze body so the coin's edge reads as metal under the gold rim.
    if (fieldTurn.isMesh) fieldTurn.material = new THREE.MeshBasicMaterial({ color: 0x4a3210 });

    fieldTurn.add(fieldTurnPlaceHolder);
    fieldTurn.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);
    this.fieldTurnHover.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);

    this.canvas = document.createElement("canvas");
    const size = medallionCanvasSize(typeof window !== "undefined" ? window.devicePixelRatio : 1, LOGICAL);
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;

    // Swap the low-poly 18-gon disc for a smooth circle with the same UV orientation
    // (canvas top → local -z) and size it to cover the coin's top face.
    const faceGeometry = new THREE.CircleGeometry(FACE_RADIUS, 72);
    faceGeometry.rotateX(-Math.PI / 2);
    fieldTurnPlaceHolder.geometry = faceGeometry;
    fieldTurnPlaceHolder.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false });

    const normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00555, transparent: true, opacity: 0 });
    const geometry = new THREE.BoxGeometry(3, 3, 0.1);
    const clickElement = new THREE.Mesh(geometry, normalMaterial);
    clickElement.position.set(8, 0, 0.5);

    clickElement.add(fieldTurn);
    clickElement.add(this.fieldTurnHover);

    fieldTurn.position.set(0, 0, -0.5);
    fieldTurnPlaceHolder.position.set(0, FACE_HEIGHT, 0);
    fieldTurnPlaceHolder.rotation.set(0, 0, 0);
    this.baseScale.copy(fieldTurn.scale);

    // Soft glow ring around the coin (flash on change, steady pulse in Battle).
    this.glowMaterial = new THREE.MeshBasicMaterial({
      map: getGlowTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(FACE_RADIUS * 3, FACE_RADIUS * 3), this.glowMaterial);
    this.glow.position.set(0, 0, -0.5 + FACE_HEIGHT - 0.03);
    this.glow.visible = false;
    this.glow.raycast = () => { };
    clickElement.add(this.glow);

    this.gameObject = clickElement;

    const fieldTurnHoverMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
    this.fieldTurnHover.material = fieldTurnHoverMaterial;
    this.fieldTurnHover.visible = false;
    this.fieldTurnHover.position.set(0, 0, -0.5);

    this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
    // Registers for per-frame update() (flip / glow) and adds the object to the scene.
    this.duel.add(this);

    this.gameObject.scale.set(1, 1, 1);

    this.target = { turn: 1, turnPlayer: 0, phase: YGODuelPhase.Draw };
    this.show(this.target);
    this.redrawWhenFontLoads();

    this.action = new ActionUiMenu(duel, { eventType: "duel-phase-menu", eventData: { duel: this.duel, transform: this.gameObject } });

    this.duel.ygo.events.on("set-duel-turn", ({ turn, turnPlayer }) => {
      this.setState({ turn, turnPlayer, phase: YGODuelPhase.Draw });
    })

    this.duel.ygo.events.on("set-duel-phase", ({ phase, turnPlayer }) => {
      const turn = this.duel.ygo.state.turn;
      this.setState({ turn, turnPlayer, phase });
    })
  }

  onMouseClick(): void {
    this.duel.actionManager.setAction(this.action);
  }

  onMouseEnter(): void {
    this.fieldTurnHover.visible = true;
    this.hovered = true;
    const canvas = this.duel.core.renderer.domElement;
    canvas.style.cursor = "pointer";
    canvas.title = this.tooltip;
  }

  onMouseLeave(): void {
    this.fieldTurnHover.visible = false;
    this.hovered = false;
    const canvas = this.duel.core.renderer.domElement;
    canvas.style.cursor = "";
    canvas.removeAttribute("title");
  }

  update(dt: number): void {
    super.update(dt);
    // UI motion runs on wall-clock time, not the duel's time scale.
    const delta = Math.min(Math.max(this.duel.core.unscaledDeltaTime ?? dt, 0), 0.1);
    this.clock += delta;

    let flashT = 1;
    if (this.flip) {
      const flip = this.flip;
      flip.elapsed += delta;
      const t = Math.min(flip.elapsed / flip.duration, 1);
      const { angle, swapped } = flipState(t, flip.halfTurns);
      if (swapped && !flip.swapped) {
        flip.swapped = true;
        this.show(this.target);
      }
      this.fieldTurn.rotation.z = angle;
      this.fieldTurn.scale.copy(this.baseScale).multiplyScalar(pulseScale(t));
      flashT = t;
      if (t >= 1) {
        if (!flip.swapped) this.show(this.target);
        this.flip = null;
        this.fieldTurn.rotation.z = 0;
        this.fieldTurn.scale.copy(this.baseScale);
      }
    }

    const inBattle = !!this.displayed && isBattlePhase(this.displayed.phase);
    const flash = flashT < 1 ? flashOpacity(flashT) : 0;
    const battle = inBattle ? (this.reducedMotion ? 0.4 : battleGlowOpacity(this.clock)) : 0;
    const opacity = Math.max(flash, battle);
    this.glow.visible = opacity > 0.001;
    if (this.glow.visible) {
      this.glowMaterial.opacity = opacity;
      if (inBattle) this.glowMaterial.color.setHex(BATTLE_GLOW_COLOR);
      else if (this.displayed) this.glowMaterial.color.setHex(medallionPalette(this.isViewerTurn(this.displayed.turnPlayer)).glow);
    }
  }

  onDestroy(): void {
    this.texture.dispose();
    this.glowMaterial.dispose();
    this.glow.geometry.dispose();
  }

  /** New turn/phase from the duel: flip to it (or snap, with reduced motion). */
  private setState(next: MedallionState) {
    const state = { ...next, turn: Math.max(next.turn, 1) };
    // Compare with where the face is heading, so turn→phase bursts merge into one flip.
    const change = medallionChange(this.flip && !this.flip.swapped ? this.displayed : this.target, state);
    this.target = state;
    if (change === "none") {
      if (!this.flip || this.flip.swapped) this.show(state);
      return;
    }
    this.reducedMotion = prefersReducedMotion();
    if (this.reducedMotion) {
      this.flip = null;
      this.fieldTurn.rotation.z = 0;
      this.fieldTurn.scale.copy(this.baseScale);
      this.show(state);
      return;
    }
    const spec = change === "turn" ? FLIP_TURN : FLIP_PHASE;
    if (this.flip && !this.flip.swapped) {
      // Still showing the old face: upgrade to a full flip if the turn changed, keep going.
      if (spec.halfTurns > this.flip.halfTurns) {
        this.flip.halfTurns = spec.halfTurns;
        this.flip.duration = spec.duration;
      }
      return;
    }
    this.flip = { elapsed: 0, duration: spec.duration, halfTurns: spec.halfTurns, swapped: false };
  }

  private isViewerTurn(turnPlayer: number): boolean {
    return this.duel.perspective.isPlayerPOV(turnPlayer);
  }

  /** Redraws the face only when what it shows actually changed. */
  private show(state: MedallionState, force = false) {
    const d = this.displayed;
    if (!force && d && d.turn === state.turn && d.turnPlayer === state.turnPlayer && d.phase === state.phase) {
      this.updateTooltip(state);
      return;
    }
    this.displayed = { ...state };
    this.drawFace(state);
    this.updateTooltip(state);
  }

  private updateTooltip({ turn, turnPlayer, phase }: MedallionState) {
    const isPlayerClient = this.duel.client?.type === YGOClientType.PLAYER;
    const owner = isPlayerClient
      ? turnOwnerLabel({ isPlayerClient, isLocalTurn: this.duel.perspective.isPlayer(turnPlayer) })
      : this.duel.ygo.getField(turnPlayer)?.player?.name ?? "";
    this.tooltip = phaseObjectTooltip({ owner, turn, phase, canChangePhase: isPlayerClient });
    if (this.hovered) this.duel.core.renderer.domElement.title = this.tooltip;
  }

  /** The canvas may draw before Barlow Condensed is ready; redraw once it is. */
  private redrawWhenFontLoads() {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts?.load) return;
    const spec = `700 64px ${MEDALLION_FONT_FAMILY}`;
    try {
      if (fonts.check(spec)) return;
      fonts.load(spec).then(loaded => {
        if (loaded.length && this.displayed && this.enabled) this.show(this.displayed, true);
      }).catch(() => { });
    } catch {
      // font loading API unavailable — fallback font is fine
    }
  }

  private drawFace({ turn, turnPlayer, phase }: MedallionState) {
    const ctx = this.ctx;
    const scale = this.canvas.width / LOGICAL;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const c = LOGICAL / 2;
    const palette = medallionPalette(this.isViewerTurn(turnPlayer));
    const circle = (r: number) => {
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
    };

    // Outer gold rim — diagonal metallic sheen.
    const rim = ctx.createLinearGradient(c - 250, c - 250, c + 250, c + 250);
    rim.addColorStop(0, "#fff3c4");
    rim.addColorStop(0.25, "#e7bb52");
    rim.addColorStop(0.5, "#8d5d17");
    rim.addColorStop(0.72, "#f3d27a");
    rim.addColorStop(1, "#6a430f");
    circle(252);
    ctx.fillStyle = rim;
    ctx.fill();

    // Bevel: radial light falloff across the rim.
    const bevel = ctx.createRadialGradient(c, c, 200, c, c, 252);
    bevel.addColorStop(0, "rgba(40,22,2,0.55)");
    bevel.addColorStop(0.35, "rgba(255,240,190,0.25)");
    bevel.addColorStop(0.7, "rgba(0,0,0,0)");
    bevel.addColorStop(1, "rgba(30,16,0,0.6)");
    circle(252);
    ctx.fillStyle = bevel;
    ctx.fill();

    // Inner bronze step (reverse sheen) between rim and face.
    const step = ctx.createLinearGradient(c + 220, c + 220, c - 220, c - 220);
    step.addColorStop(0, "#f6dc8c");
    step.addColorStop(0.5, "#7a4e12");
    step.addColorStop(1, "#c89234");
    circle(222);
    ctx.fillStyle = step;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(40,22,2,0.85)";
    circle(222);
    ctx.stroke();

    // Inner face.
    const face = ctx.createRadialGradient(c, c - 60, 12, c, c, 208);
    face.addColorStop(0, palette.faceInner);
    face.addColorStop(0.55, palette.faceMid);
    face.addColorStop(1, palette.faceOuter);
    circle(206);
    ctx.fillStyle = face;
    ctx.fill();

    // Faint engraved pattern: concentric ring + ticks.
    ctx.save();
    circle(206);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    circle(168);
    ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r0 = i % 2 === 0 ? 176 : 186;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      ctx.lineTo(c + Math.cos(a) * 200, c + Math.sin(a) * 200);
      ctx.stroke();
    }
    // Glossy highlight over the upper half.
    const gloss = ctx.createLinearGradient(0, c - 206, 0, c + 10);
    gloss.addColorStop(0, "rgba(255,255,255,0.28)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.ellipse(c, c - 70, 190, 130, 0, 0, Math.PI * 2);
    ctx.fillStyle = gloss;
    ctx.fill();
    ctx.restore();

    // Accent ring just inside the bronze step.
    ctx.lineWidth = 4;
    ctx.strokeStyle = palette.accent;
    ctx.globalAlpha = 0.7;
    circle(200);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // "TURN N" — small gold line.
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#ffe7a3";
    this.fillFittedText(`TURN ${turn}`, c, c - 88, 60, 280);

    // Gold divider.
    ctx.shadowColor = "transparent";
    const divider = ctx.createLinearGradient(c - 120, 0, c + 120, 0);
    divider.addColorStop(0, "rgba(243,210,122,0)");
    divider.addColorStop(0.5, "rgba(243,210,122,0.95)");
    divider.addColorStop(1, "rgba(243,210,122,0)");
    ctx.fillStyle = divider;
    ctx.fillRect(c - 120, c - 50, 240, 4);

    // Phase word — big, white with a dark outline.
    const word = medallionPhaseWord(phase).toUpperCase();
    this.fitFont(word, 132, 330);
    ctx.lineJoin = "round";
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.strokeText(word, c, c + 36);
    ctx.shadowColor = isBattlePhase(phase) ? "rgba(255,80,60,0.9)" : "rgba(0,0,0,0.5)";
    ctx.shadowBlur = isBattlePhase(phase) ? 18 : 8;
    ctx.shadowOffsetY = isBattlePhase(phase) ? 0 : 3;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(word, c, c + 36);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    this.texture.needsUpdate = true;
  }

  /** Sets ctx.font to the largest size ≤ size at which text fits maxWidth. */
  private fitFont(text: string, size: number, maxWidth: number): number {
    const ctx = this.ctx;
    let fontSize = size;
    ctx.font = `700 ${fontSize}px ${MEDALLION_FONT_FAMILY}`;
    while (fontSize > 16 && ctx.measureText(text).width > maxWidth) {
      fontSize -= 4;
      ctx.font = `700 ${fontSize}px ${MEDALLION_FONT_FAMILY}`;
    }
    return fontSize;
  }

  /** Draws centred text, shrinking the font until it fits maxWidth. */
  private fillFittedText(text: string, x: number, y: number, size: number, maxWidth: number) {
    this.fitFont(text, size, maxWidth);
    this.ctx.fillText(text, x, y);
  }
}

let glowTexture: THREE.CanvasTexture | null = null;

/** Soft ring (transparent centre) drawn once and shared: the medallion's glow halo. */
function getGlowTexture(): THREE.CanvasTexture | null {
  if (glowTexture) return glowTexture;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // Plane is 3·FACE_RADIUS wide → the coin edge sits at 1/1.5 ≈ 0.667 of the half-size.
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.6, "rgba(255,255,255,0)");
  g.addColorStop(0.68, "rgba(255,255,255,1)");
  g.addColorStop(0.8, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}
