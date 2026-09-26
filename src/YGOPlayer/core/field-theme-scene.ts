/**
 * The scene side of the field themes (field-themes.ts): recolouring a table
 * model's palette texture, and the drawn playmat.
 */
import * as THREE from "three";
import type { YGODuel } from "./YGODuel";
import { CARD_HEIGHT_SIZE, CARD_RATIO } from "../constants";
import { FieldTheme } from "./field-themes";

/** Recolours every palette texture of a table model in place (both halves share the material). */
export function recolorModel(root: THREE.Object3D, recolor: NonNullable<FieldTheme["recolor"]>): void {
  const done = new Map<THREE.Texture, THREE.Texture>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const m = material as THREE.MeshStandardMaterial;
      if (!m?.map) continue;
      let next = done.get(m.map);
      if (!next) {
        next = recolorTexture(m.map, recolor);
        done.set(m.map, next);
      }
      m.map = next;
      m.needsUpdate = true;
    }
  });
}

function recolorTexture(texture: THREE.Texture, recolor: NonNullable<FieldTheme["recolor"]>): THREE.Texture {
  const image = texture.image as CanvasImageSource & { width: number; height: number };
  if (!image?.width) return texture;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return texture;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const [r, g, b] = recolor(data.data[i], data.data[i + 1], data.data[i + 2]);
    data.data[i] = r; data.data[i + 1] = g; data.data[i + 2] = b;
  }
  ctx.putImageData(data, 0, 0);
  const next = new THREE.CanvasTexture(canvas);
  next.flipY = texture.flipY;
  next.colorSpace = texture.colorSpace;
  next.magFilter = texture.magFilter;
  next.minFilter = texture.minFilter;
  next.wrapS = texture.wrapS;
  next.wrapT = texture.wrapT;
  next.generateMipmaps = texture.generateMipmaps;
  return next;
}

const MAT_W = 44;
const MAT_H = 30;
const PX = 48; // canvas pixels per world unit

/**
 * The playmat: one flat mesh, drawn in code — a dark cloth with a border and
 * each zone printed where the real zones are (their world positions and
 * sizes), the two halves tinted blue (you) and red (the opponent).
 */
export function createPlaymat(duel: YGODuel, viewer: number): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = MAT_W * PX;
  canvas.height = MAT_H * PX;
  const ctx = canvas.getContext("2d")!;
  const toPx = (v: THREE.Vector3) => ({ x: (v.x + MAT_W / 2) * PX, y: (MAT_H / 2 - v.y) * PX });

  // Cloth.
  const bg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 60, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
  bg.addColorStop(0, "#1b3a66");
  bg.addColorStop(1, "#0a1628");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(201, 214, 234, 0.35)";
  ctx.lineWidth = 6;
  roundRect(ctx, 24, 24, canvas.width - 48, canvas.height - 48, 36);
  ctx.stroke();
  // Centre line.
  ctx.strokeStyle = "rgba(201, 214, 234, 0.18)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, canvas.height / 2);
  ctx.lineTo(canvas.width - 60, canvas.height / 2);
  ctx.stroke();

  const zone = (center: THREE.Vector3, w: number, h: number, owner: number, label: string, round = false) => {
    const c = toPx(center);
    const pw = w * PX, ph = h * PX;
    const mine = owner === viewer;
    ctx.fillStyle = mine ? "rgba(47, 91, 255, 0.10)" : "rgba(224, 52, 47, 0.10)";
    ctx.strokeStyle = mine ? "rgba(120, 160, 255, 0.75)" : "rgba(255, 130, 120, 0.75)";
    ctx.lineWidth = 4;
    if (round) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, pw / 2, ph / 2, 0, 0, Math.PI * 2);
    } else {
      roundRect(ctx, c.x - pw / 2, c.y - ph / 2, pw, ph, 14);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(201, 214, 234, 0.45)";
    ctx.font = `600 ${Math.round(PX * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, c.x, c.y);
  };

  // Piles are drawn a little under card size: the GY and banished zones sit closer than a card's height.
  const cardW = CARD_HEIGHT_SIZE / CARD_RATIO + 0.2;
  const cardH = CARD_HEIGHT_SIZE * 0.82;
  duel.fields.forEach((field, owner) => {
    if (!field) return;
    field.monsterZone.forEach((z) => zone(z.position, z.size.x, z.size.y, owner, "MONSTER"));
    field.spellTrapZone.forEach((z) => zone(z.position, z.size.x, z.size.y, owner, "SPELL / TRAP"));
    if (field.fieldZone) zone(field.fieldZone.position, field.fieldZone.size.x, field.fieldZone.size.y, owner, "FIELD");
    const piles: Array<[THREE.Vector3 | undefined, string]> = [
      [field.graveyard?.cardPosition, "GY"],
      [field.banishedZone?.cardPosition, "BANISHED"],
      [field.mainDeck?.getCardTransform?.().position, "DECK"],
      [field.extraDeck?.getCardTransform?.().position, "EXTRA"],
    ];
    for (const [pos, label] of piles) if (pos) zone(pos, cardW, cardH, owner, label);
  });
  // The Extra Monster Zones belong to neither side.
  (duel.fields[0]?.extraMonsterZone ?? []).forEach((z) => zone(z.position, z.size.x, z.size.y, viewer, "EXTRA MONSTER", true));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(MAT_W, MAT_H),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0 }),
  );
  mesh.position.set(0, 0, -0.02);
  mesh.receiveShadow = true;
  // A background: drawn first and never in the depth buffer, or it covers
  // the cards (they don't all write depth) even though it's behind them.
  mesh.renderOrder = -10;
  (mesh.material as THREE.Material).depthWrite = false;
  mesh.name = "playmat";
  return mesh;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
