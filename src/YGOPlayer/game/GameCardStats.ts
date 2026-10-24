import * as THREE from "three";
import type { YGODuel } from "../core/YGODuel";
import { Card } from "ygo-core";
import { YGOGameUtils } from "ygo-core";
import { YGOMath } from "../core/YGOMath";
import {
  STAT_FONT_FAMILY,
  STAT_OUTLINE_COLOR,
  STAT_SECONDARY_BASE_COLOR,
  STAT_SHADOW_COLOR,
  StatsRenderState,
  fitFontSize,
  formatStat,
  statColor,
  statsCanvasScale,
  statsRenderKey,
} from "./card-stats-format";

/** Logical canvas size; the backing store is this × statsCanvasScale(devicePixelRatio). */
const LOGICAL = 128;
/** Emphasised (current position) and secondary numeral sizes, in logical px. */
const MAIN_SIZE = 27;
const SECONDARY_SIZE = 20;
const ROW_SIZE = 15;
const ICON_SIZE = 15;
/** The ATK/DEF row may not run wider than this. */
const MAX_ROW_WIDTH = LOGICAL - 8;

export class GameCardStats {
  public parent: THREE.Object3D;
  public duel: YGODuel;
  public card: Card;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number;

  /** Key of what the texture currently shows (see statsRenderKey). */
  private renderKey = "";

  private texture: THREE.Texture;
  private mesh: THREE.Mesh;
  private destroyed = false;

  constructor({
    parent,
    card,
    duel,
  }: {
    parent: THREE.Object3D;
    card: Card;
    duel: YGODuel;
  }) {
    this.parent = parent;
    this.card = card;
    this.duel = duel;

    this.scale = statsCanvasScale(typeof window !== "undefined" ? window.devicePixelRatio : 1);
    this.canvas = document.createElement("canvas");
    this.canvas.width = LOGICAL * this.scale;
    this.canvas.height = LOGICAL * this.scale;
    this.ctx = this.canvas.getContext("2d")!;

    this.texture = new THREE.Texture(this.canvas);
    const material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), material);

    this.parent.add(this.mesh);
    this.mesh.position.set(0, -0.5, 0.2);
    this.mesh.visible = false;

    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = this.duel.core.renderer.capabilities.getMaxAnisotropy();

    this.redrawWhenFontLoads();
  }

  show() {
    this.mesh.visible = true;
  }

  hide() {
    this.mesh.visible = false;
  }

  destroy() {
    this.destroyed = true;
    this.canvas.width = this.canvas.height = 0;
    this.texture.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.geometry.dispose();
    this.parent.remove(this.mesh);
  }

  private currentState(): StatsRenderState {
    const card = this.card;
    const isLink = YGOGameUtils.isLinkMonster(card);
    return {
      atk: card.currentAtk,
      def: card.currentDef,
      baseAtk: card.atk,
      baseDef: card.def,
      level: isLink ? card.linkval : card.currentLevel,
      baseLevel: isLink ? card.linkval : card.level,
      materials: card.materials?.length ?? 0,
      isPlayerSide: this.duel.perspective.isPlayerPOV(card.owner),
      isAttackPosition: YGOGameUtils.isAttack(card),
      isLink,
      isXyz: YGOGameUtils.isXYZMonster(card),
    };
  }

  needsUpdate(): boolean {
    return statsRenderKey(this.currentState()) !== this.renderKey;
  }

  render() {
    if (this.destroyed) return;
    const state = this.currentState();
    const key = statsRenderKey(state);
    if (key === this.renderKey) return;
    this.renderKey = key;

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    // The player's plate hangs below their card, the opponent's above theirs (the mesh is turned
    // for them): either way the numerals sit on the outer edge with the level row beneath.
    const numbersY = state.isPlayerSide ? 94 : 26;
    const rowY = numbersY + 22;

    this.renderAtkDef(state, numbersY);
    this.renderLevel(state, rowY);
    this.renderMaterials(state, rowY);

    this.texture.needsUpdate = true;

    if (state.isAttackPosition) {
      this.mesh.position.set(0, -1, 0.2);
      this.mesh.rotation.set(0, 0, 0);
    } else {
      this.mesh.position.set(-1, 0, 0.2);
      this.mesh.rotation.set(0, 0, YGOMath.degToRad(-90));
    }

    if (!state.isPlayerSide) {
      this.mesh.rotateZ(YGOMath.degToRad(180));
    }
  }

  /** Bold numerals with a dark outline and soft drop shadow, Master Duel style. */
  private drawOutlinedText(text: string, x: number, y: number, size: number, color: string) {
    const ctx = this.ctx;
    ctx.font = `800 ${size}px ${STAT_FONT_FAMILY}`;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeStyle = STAT_OUTLINE_COLOR;
    ctx.lineWidth = Math.max(3, size * 0.2);
    ctx.shadowColor = STAT_SHADOW_COLOR;
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    ctx.strokeText(text, x, y);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private measure(text: string, size: number): number {
    this.ctx.font = `800 ${size}px ${STAT_FONT_FAMILY}`;
    return this.ctx.measureText(text).width;
  }

  private renderAtkDef(s: StatsRenderState, y: number) {
    const ctx = this.ctx;
    const hasDef = !s.isLink;
    const atkStr = formatStat(s.atk);
    const defStr = hasDef ? formatStat(s.def) : "";
    const slashStr = hasDef ? "/" : "";

    // Link monsters have no DEF: their ATK is always the emphasised number.
    let atkSize = s.isAttackPosition || !hasDef ? MAIN_SIZE : SECONDARY_SIZE;
    let defSize = s.isAttackPosition ? SECONDARY_SIZE : MAIN_SIZE;
    let slashSize = SECONDARY_SIZE;

    const total = () => this.measure(atkStr, atkSize) + this.measure(slashStr, slashSize) + this.measure(defStr, defSize);
    const fitted = fitFontSize(MAIN_SIZE, total(), MAX_ROW_WIDTH);
    if (fitted !== MAIN_SIZE) {
      const k = fitted / MAIN_SIZE;
      atkSize *= k;
      defSize *= k;
      slashSize *= k;
    }

    const atkWidth = this.measure(atkStr, atkSize);
    const slashWidth = this.measure(slashStr, slashSize);
    const defWidth = this.measure(defStr, defSize);
    let x = LOGICAL / 2 - (atkWidth + slashWidth + defWidth) / 2;

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    // Align the baselines so the smaller number sits on the same line as the big one.
    const baseline = y + MAIN_SIZE * 0.36;

    this.drawOutlinedText(atkStr, x, baseline, atkSize, statColor(s.atk, s.baseAtk, s.isAttackPosition || !hasDef));
    x += atkWidth;

    if (!hasDef) return;

    this.drawOutlinedText(slashStr, x, baseline, slashSize, STAT_SECONDARY_BASE_COLOR);
    x += slashWidth;
    this.drawOutlinedText(defStr, x, baseline, defSize, statColor(s.def, s.baseDef, !s.isAttackPosition));
  }

  private renderLevel(s: StatsRenderState, y: number) {
    const level = s.level;
    if (!level || level <= 0) return;

    let iconPath: string;
    if (s.isLink) {
      iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_link128.png`;
    } else if (s.isXyz) {
      iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_rank128.png`;
    } else {
      iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_stars128.png`;
    }

    const levelStr = String(level);
    const textWidth = this.measure(levelStr, ROW_SIZE);
    const hasMaterials = s.isXyz;
    const groupWidth = ICON_SIZE + 2 + textWidth;
    // Level on the left, overlay units on the right (a lone level row is centred).
    const x = hasMaterials ? LOGICAL / 2 - 6 - groupWidth : LOGICAL / 2 - groupWidth / 2;

    this.drawIcon(iconPath, x, y);
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    this.drawOutlinedText(levelStr, x + ICON_SIZE + 2, y + 1, ROW_SIZE, statColor(level, s.baseLevel));
  }

  private renderMaterials(s: StatsRenderState, y: number) {
    if (!s.isXyz) return;

    const iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_xyz_materials128.png`;
    const x = LOGICAL / 2 + 6;

    this.drawIcon(iconPath, x, y);
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    this.drawOutlinedText(String(s.materials), x + ICON_SIZE + 2, y + 1, ROW_SIZE, "#ffffff");
  }

  private drawIcon(path: string, x: number, centerY: number) {
    const icon = this.duel.assets.getImage(path);
    if (!icon || (icon.complete === false) || !icon.width) return;
    const ctx = this.ctx;
    ctx.shadowColor = STAT_SHADOW_COLOR;
    ctx.shadowBlur = 3;
    ctx.drawImage(icon, 0, 0, icon.width, icon.height, x, centerY - ICON_SIZE / 2, ICON_SIZE, ICON_SIZE);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  /** The canvas may draw before Barlow Condensed is ready; redraw once it is. */
  private redrawWhenFontLoads() {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts?.load) return;
    const spec = `800 ${MAIN_SIZE}px ${STAT_FONT_FAMILY}`;
    try {
      if (fonts.check(spec)) return;
      fonts.load(spec).then(loaded => {
        if (!loaded.length || this.destroyed || !this.renderKey) return;
        this.renderKey = "";
        this.render();
      }).catch(() => { });
    } catch {
      // font loading API unavailable — the fallback font is fine
    }
  }
}
