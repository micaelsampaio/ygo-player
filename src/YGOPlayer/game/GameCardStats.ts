import { TextGeometry } from "three/examples/jsm/Addons.js";
import * as THREE from "three";
import { YGODuel } from "../core/YGODuel";
import { Card } from "ygo-core";
import { YGOGameUtils } from "ygo-core";
import { YGOMath } from "../core/YGOMath";

export class GameCardStats {
  public parent: THREE.Object3D;
  public duel: YGODuel;
  public card: Card;

  // canvas
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // cached data to update
  private atk: number = -9;
  private def: number = -9;
  private level: number = -9;
  private materials: number = -9;
  private owner: number = -9;

  private texture: THREE.Texture;
  private mesh: THREE.Mesh;

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

    this.canvas = document.createElement("canvas");
    this.canvas.width = 128;
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext("2d")!;

    this.texture = new THREE.Texture(this.canvas);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), material);

    this.parent.add(this.mesh);
    this.mesh.position.set(0, -0.5, 0.2);
    this.mesh.visible = false;

    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy =
      this.duel.core.renderer.capabilities.getMaxAnisotropy();

    // document.body.appendChild(this.canvas);
    // this.canvas.style.position = "fixed";
    // this.canvas.style.top = "50px";
    // this.canvas.style.right = "50px";
  }

  show() {
    this.mesh.visible = true;
  }

  hide() {
    this.mesh.visible = false;
  }

  destroy() {
    this.canvas = null as any;
    this.texture.dispose();
    this.parent.remove(this.mesh);
  }

  needsUpdate(): boolean {
    const atk = this.card.currentAtk;
    const def = this.card.currentDef;
    const level = typeof this.card.currentLevel !== "undefined" ? this.card.currentLevel : this.card.linkval;
    const owner = this.card.owner;
    const materials = this.card.materials.length;

    if (this.atk !== atk) return true;
    if (this.def !== def) return true;
    if (this.level !== level) return true;
    if (this.owner !== owner) return true;
    if (this.materials !== materials) return true;

    return false;
  }

  render() {
    if (!this.needsUpdate()) return;

    const isPlayer1 = this.card.owner === 0;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // this.ctx.beginPath(); // Start a new path
    // this.ctx.rect(0, 0, 256, 256); // Add a rectangle to the current path
    // this.ctx.fillStyle = "rgba(0,0,255,0.3)"
    // this.ctx.fill(); // Render the path

    this.renderAtkDef();
    this.renderLevel();
    this.renderMaterials();

    this.texture.needsUpdate = true;

    if (YGOGameUtils.isAttack(this.card)) {
      this.mesh.position.set(0, -1, 0.2);
      this.mesh.rotation.set(0, 0, 0);
    } else {
      this.mesh.position.set(-1, 0, 0.2);
      this.mesh.rotation.set(0, 0, YGOMath.degToRad(-90));
    }

    if (!isPlayer1) {
      this.mesh.rotateZ(YGOMath.degToRad(180));
    }
  }

  renderAtkDef() {
    const isPlayer1 = this.card.owner === 0;
    const atk = this.card.currentAtk;
    const def = this.card.currentDef;
    const hasDef = !YGOGameUtils.isLinkMonster(this.card);

    const y = isPlayer1 ? this.canvas.height - 10 : 35;
    this.atk = atk;
    this.def = def;

    const atkStr = `${this.atk}`;
    const slashStr = hasDef ? "/" : "";
    const defStr = hasDef ? `${this.def}` : "";

    const isAtkPosition = YGOGameUtils.isAttack(this.card);

    this.ctx.beginPath();

    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.25, "rgba(0, 0, 0, 0.5)");
    gradient.addColorStop(0.75, "rgba(0, 0, 0, 0.5)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    this.ctx.fillStyle = gradient;
    this.ctx.rect(this.canvas.width * 0.1, y - 25, this.canvas.width * 0.8, 25);
    this.ctx.fill();

    this.ctx.textBaseline = "bottom";

    if (isAtkPosition) {
      this.ctx.font = "bold 20px Arial";
    } else {
      this.ctx.font = "bold 16px Arial";
    }

    const atkWidth = this.ctx.measureText(atkStr).width;
    this.ctx.font = "bold 20px Arial";
    const slashWidth = this.ctx.measureText(slashStr).width;
    if (!isAtkPosition) {
      this.ctx.font = "bold 20px Arial";
    } else {
      this.ctx.font = "bold 16px Arial";
    }
    const defWidth = this.ctx.measureText(defStr).width;

    const totalWidth = atkWidth + slashWidth + defWidth;
    let x = (this.canvas.width / 2) - (totalWidth / 2);

    if (isAtkPosition) {
      this.ctx.font = "bold 20px Arial";
    } else {
      this.ctx.font = "bold 16px Arial";
    }

    const atkDiff = this.atk - this.card.atk;
    const defDiff = this.def - this.card.def;

    this.ctx.fillStyle = atkDiff !== 0 ? getColorDiff(atkDiff) : isAtkPosition ? "#FFFFFF" : "#AAAAAA";
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(atkStr, x, y);
    this.ctx.fillText(atkStr, x, y);
    x += atkWidth;

    if (hasDef) {
      this.ctx.font = "bold 20px Arial";
      this.ctx.fillStyle = "#AAAAAA";
      this.ctx.strokeText(slashStr, x, y);
      this.ctx.fillText(slashStr, x, y);
      x += slashWidth;

      if (!isAtkPosition) {
        this.ctx.font = "bold 20px Arial";
      } else {
        this.ctx.font = "bold 16px Arial";
      }

      this.ctx.fillStyle = defDiff !== 0 ? getColorDiff(defDiff) : !isAtkPosition ? "#FFFFFF" : "#AAAAAA";
      this.ctx.strokeText(defStr, x, y);
      this.ctx.fillText(defStr, x, y);
    }
  }

  renderLevel() {
    this.ctx.textBaseline = "middle";

    const isPlayer1 = this.card.owner === 0;
    const level = typeof this.card.currentLevel !== "undefined" ? this.card.currentLevel : this.card.linkval;
    const levelStr = String(level);
    const x = isPlayer1 ? this.canvas.width - 30 : 30;
    const y = isPlayer1 ? this.canvas.height - 50 : 55;
    let iconPath: string;
    let levelDifference = 0;

    if (YGOGameUtils.isLinkMonster(this.card)) {
      iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_link128.png`;
    } else if (YGOGameUtils.isXYZMonster(this.card)) {
      iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_rank128.png`;
    } else {
      iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_stars128.png`;
      levelDifference = this.card.currentLevel - this.card.level;
    }

    const icon = this.duel.assets.getImage(iconPath);

    this.ctx.drawImage(
      icon,
      0,
      0,
      icon.width,
      icon.height,
      x - 24,
      y - 12,
      20,
      20
    );

    this.ctx.font = "Bold 20px Arial";
    this.ctx.fillStyle = getColorDiff(levelDifference);
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(levelStr, x, y);
    this.ctx.fillText(levelStr, x, y);

    this.level = level as any;
  }

  renderMaterials() {
    if (!YGOGameUtils.isXYZMonster(this.card)) return;

    this.ctx.textBaseline = "middle";

    const isPlayer1 = this.card.owner === 0;
    const materials = this.card.materials.length;
    const materialsStr = String(materials);
    let iconPath = `${this.duel.config.cdnUrl}/images/ui/ic_xyz_materials128.png`;

    const x = isPlayer1 ? 30 : this.canvas.width - 30;
    const y = isPlayer1 ? this.canvas.height - 50 : 55;

    const icon = this.duel.assets.getImage(iconPath);

    this.ctx.drawImage(icon, 0, 0, icon.width, icon.height, x - 24, y - 12, 20, 20);

    this.ctx.font = "Bold 20px Arial";
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(materialsStr, x, y);
    this.ctx.fillText(materialsStr, x, y);

    this.materials = materials;
  }
}

function getColorDiff(value: number) {
  if (value > 0) return "#67bcf5";
  if (value < 0) return "#f57067";
  return "#FFFFFF";
}