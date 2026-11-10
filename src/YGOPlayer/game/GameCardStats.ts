import * as THREE from "three";
import type { YGODuel } from "../core/YGODuel";
import { Card } from "ygo-core";
import { YGOGameUtils } from "ygo-core";
import { YGOMath } from "../core/YGOMath";
import { StatsRenderState, formatStat, statsCanvasScale, statsRenderKey } from "./card-stats-format";

/** Logical canvas size; the backing store is this × statsCanvasScale(devicePixelRatio). */
const LOGICAL = 128;
/** The number not for the current position (and the slash). */
const MUTED = "#AAAAAA";

/** Raised in blue, lowered in red, else white (Micael's colours). */
function diffColor(diff: number): string {
  if (diff > 0) return "#67bcf5";
  if (diff < 0) return "#f57067";
  return "#FFFFFF";
}

/** A changed stat in its diff colour; an unchanged one white when it's the current position's, else muted. */
function statColorOf(value: number, base: number, emphasised: boolean): string {
  const diff = value - base;
  if (Number.isFinite(diff) && diff !== 0) return diffColor(diff);
  return emphasised ? "#FFFFFF" : MUTED;
}

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

    // Micael's layout (the field stats before 2026-10-24): ATK/DEF on a dark band along the card's
    // outer edge, the level / rank / link in the corner above it, Xyz materials in the other corner.
    this.renderAtkDef(state);
    this.renderLevel(state);
    this.renderMaterials(state);

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

  /** Bold Arial with a thin black outline (Micael's field stats). */
  private drawText(text: string, x: number, y: number, size: number, color: string) {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px Arial`;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private measure(text: string, size: number): number {
    this.ctx.font = `bold ${size}px Arial`;
    return this.ctx.measureText(text).width;
  }

  /** ATK / DEF centred on a dark band: the current position's number at 20px, the other at 16px. */
  private renderAtkDef(s: StatsRenderState) {
    const ctx = this.ctx;
    const hasDef = !s.isLink;
    const atkStr = formatStat(s.atk);
    const defStr = hasDef ? formatStat(s.def) : "";
    const slashStr = hasDef ? "/" : "";
    const y = s.isPlayerSide ? LOGICAL - 10 : 35;

    const band = ctx.createLinearGradient(0, 0, LOGICAL, 0);
    band.addColorStop(0, "rgba(0, 0, 0, 0)");
    band.addColorStop(0.25, "rgba(0, 0, 0, 0.5)");
    band.addColorStop(0.75, "rgba(0, 0, 0, 0.5)");
    band.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.beginPath();
    ctx.fillStyle = band;
    ctx.rect(LOGICAL * 0.1, y - 25, LOGICAL * 0.8, 25);
    ctx.fill();

    const atkSize = s.isAttackPosition || !hasDef ? 20 : 16;
    const defSize = s.isAttackPosition ? 16 : 20;
    const atkWidth = this.measure(atkStr, atkSize);
    const slashWidth = this.measure(slashStr, 20);
    const defWidth = this.measure(defStr, defSize);
    let x = LOGICAL / 2 - (atkWidth + slashWidth + defWidth) / 2;

    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    this.drawText(atkStr, x, y, atkSize, statColorOf(s.atk, s.baseAtk, s.isAttackPosition || !hasDef));
    x += atkWidth;
    if (!hasDef) return;
    this.drawText(slashStr, x, y, 20, MUTED);
    x += slashWidth;
    this.drawText(defStr, x, y, defSize, statColorOf(s.def, s.baseDef, !s.isAttackPosition));
  }

  /** The level / rank / link: icon and number in the corner above the band (your right side). */
  private renderLevel(s: StatsRenderState) {
    const level = s.level;
    if (!level || level <= 0) return;
    const iconPath = s.isLink
      ? `${this.duel.config.cdnUrl}/images/ui/ic_link128.png`
      : s.isXyz
        ? `${this.duel.config.cdnUrl}/images/ui/ic_rank128.png`
        : `${this.duel.config.cdnUrl}/images/ui/ic_stars128.png`;
    const x = s.isPlayerSide ? LOGICAL - 30 : 30;
    const y = s.isPlayerSide ? LOGICAL - 50 : 55;
    this.drawIcon(iconPath, x - 24, y - 12);
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    this.drawText(String(level), x, y, 20, diffColor(s.isLink ? 0 : level - s.baseLevel));
  }

  /** Xyz materials: icon and count in the other corner. */
  private renderMaterials(s: StatsRenderState) {
    if (!s.isXyz) return;
    const x = s.isPlayerSide ? 30 : LOGICAL - 30;
    const y = s.isPlayerSide ? LOGICAL - 50 : 55;
    this.drawIcon(`${this.duel.config.cdnUrl}/images/ui/ic_xyz_materials128.png`, x - 24, y - 12);
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    this.drawText(String(s.materials), x, y, 20, "#FFFFFF");
  }

  private drawIcon(path: string, x: number, y: number) {
    const icon = this.duel.assets.getImage(path);
    if (!icon || (icon.complete === false) || !icon.width) return;
    this.ctx.drawImage(icon, 0, 0, icon.width, icon.height, x, y, 20, 20);
  }
}
