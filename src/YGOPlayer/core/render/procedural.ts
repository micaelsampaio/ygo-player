/**
 * Textures drawn in code: a height map turned into a normal map (so an
 * engraving catches the light), and the ornate zone tiles — a bevelled rim,
 * corner filigree and a glyph per zone kind, with a glow mask for the lines
 * that emit light.
 */
import * as THREE from "three";
import type { ZoneKind } from "../field-builders/layout";

/** Sobel over a greyscale height canvas → tangent-space normal map. */
export function normalMapFromHeight(height: HTMLCanvasElement, strength = 2.5): THREE.CanvasTexture {
  const w = height.width, h = height.height;
  const src = height.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(w, h);
  const H = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
      const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
      const nx = -dx * strength, ny = -dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * w + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** The glyph at a tile's centre, drawn as strokes (the same path is embossed and glows). */
function glyph(ctx: CanvasRenderingContext2D, kind: ZoneKind, cx: number, cy: number, s: number) {
  ctx.beginPath();
  switch (kind) {
    case "monster": { // a circle with a four-point star: a summoning seal
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = i % 2 === 0 ? s * 0.78 : s * 0.3;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case "spell": // nested diamonds
      for (const k of [1, 0.55]) { ctx.moveTo(cx, cy - s * k); ctx.lineTo(cx + s * k * 0.75, cy); ctx.lineTo(cx, cy + s * k); ctx.lineTo(cx - s * k * 0.75, cy); ctx.closePath(); }
      break;
    case "field": // a hexagon with a dot
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; const x = cx + Math.cos(a) * s, y = cy + Math.sin(a) * s; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.moveTo(cx + s * 0.18, cy); ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2);
      break;
    case "extraMonster": // double ring with rune ticks
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      ctx.moveTo(cx + s * 0.68, cy); ctx.arc(cx, cy, s * 0.68, 0, Math.PI * 2);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.moveTo(cx + Math.cos(a) * s * 0.74, cy + Math.sin(a) * s * 0.74); ctx.lineTo(cx + Math.cos(a) * s * 0.94, cy + Math.sin(a) * s * 0.94); }
      break;
    case "gy": // a circle with a cross
      ctx.arc(cx, cy, s * 0.8, 0, Math.PI * 2);
      ctx.moveTo(cx, cy - s * 0.55); ctx.lineTo(cx, cy + s * 0.55); ctx.moveTo(cx - s * 0.35, cy - s * 0.15); ctx.lineTo(cx + s * 0.35, cy - s * 0.15);
      break;
    case "banished": // a spiral
      for (let i = 0; i <= 60; i++) { const a = i * 0.28, r = (i / 60) * s * 0.85; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      break;
    default: // deck / extra: stacked cards
      for (const d of [-0.2, 0, 0.2]) ctx.rect(cx - s * 0.45 + d * s, cy - s * 0.65 - d * s, s * 0.9, s * 1.3);
  }
}

export interface TileTextures { normal: THREE.Texture; glow: THREE.Texture; height: HTMLCanvasElement }

const tileCache = new Map<string, TileTextures>();

/**
 * An ornate zone tile for `kind`, at the zone's aspect ratio: a raised,
 * bevelled rim, a recessed panel, corner filigree and the kind's glyph.
 * `glow` is white where the engraving emits light.
 */
export function zoneTile(kind: ZoneKind, aspect: number): TileTextures {
  const key = `${kind}:${aspect.toFixed(2)}`;
  const hit = tileCache.get(key);
  if (hit) return hit;
  const H = 384, W = Math.round(H * aspect);
  const height = canvas(W, H), glow = canvas(W, H);
  const hctx = height.ctx, gctx = glow.ctx;
  const m = H * 0.06, r = H * 0.09, rim = H * 0.05;

  // Height: base, raised rim (a bright band fading inward = a bevel), recessed panel.
  hctx.fillStyle = "#555"; hctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    hctx.strokeStyle = `rgb(${Math.round(210 - t * 120)},${Math.round(210 - t * 120)},${Math.round(210 - t * 120)})`;
    hctx.lineWidth = rim / 10 + 1;
    roundRect(hctx, m + t * rim, m + t * rim, W - 2 * (m + t * rim), H - 2 * (m + t * rim), Math.max(2, r - t * rim));
    hctx.stroke();
  }
  hctx.fillStyle = "#3a3a3a";
  roundRect(hctx, m + rim, m + rim, W - 2 * (m + rim), H - 2 * (m + rim), r * 0.6);
  hctx.fill();

  // Corner filigree: an L with a curl and a dot, engraved (dark) with a glowing core.
  const corner = (ctx: CanvasRenderingContext2D, cx: number, cy: number, sx: number, sy: number) => {
    const L = H * 0.16;
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * L); ctx.lineTo(cx, cy + sy * L * 0.25);
    ctx.quadraticCurveTo(cx, cy, cx + sx * L * 0.25, cy);
    ctx.lineTo(cx + sx * L, cy);
    ctx.moveTo(cx + sx * L * 0.42 + H * 0.022, cy + sy * L * 0.42);
    ctx.arc(cx + sx * L * 0.42, cy + sy * L * 0.42, H * 0.022, 0, Math.PI * 2);
    ctx.stroke();
  };
  const inset = m + rim + H * 0.05;
  const drawDecor = (ctx: CanvasRenderingContext2D, style: string, width: number) => {
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
    corner(ctx, inset, inset, 1, 1); corner(ctx, W - inset, inset, -1, 1);
    corner(ctx, inset, H - inset, 1, -1); corner(ctx, W - inset, H - inset, -1, -1);
    glyph(ctx, kind, W / 2, H / 2, Math.min(W, H) * 0.2);
    ctx.stroke();
  };
  drawDecor(hctx, "#1c1c1c", H * 0.03);   // engraved grooves
  drawDecor(hctx, "#6a6a6a", H * 0.008);  // a raised hairline in the groove

  // Glow mask: the groove cores and a thin line inside the rim.
  gctx.fillStyle = "#000"; gctx.fillRect(0, 0, W, H);
  drawDecor(gctx, "#fff", H * 0.012);
  gctx.strokeStyle = "rgba(255,255,255,0.8)"; gctx.lineWidth = H * 0.006;
  roundRect(gctx, m + rim * 0.5, m + rim * 0.5, W - 2 * m - rim, H - 2 * m - rim, r * 0.8);
  gctx.stroke();

  const glowTex = new THREE.CanvasTexture(glow.c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  const out = { normal: normalMapFromHeight(height.c, 3), glow: glowTex, height: height.c };
  tileCache.set(key, out);
  return out;
}

/** A subtle hexagonal etching over a large surface (height → normal), tiled. */
export function hexEtching(size = 256, cell = 32): THREE.CanvasTexture {
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#5a5a5a"; ctx.lineWidth = 2;
  const hw = cell * Math.sqrt(3) / 2;
  for (let row = -1; row < size / (cell * 1.5) + 1; row++) {
    for (let col = -1; col < size / (hw * 2) + 1; col++) {
      const x = col * hw * 2 + (row % 2) * hw, y = row * cell * 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; const px = x + Math.cos(a) * cell, py = y + Math.sin(a) * cell; i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke();
    }
  }
  const n = normalMapFromHeight(c, 1.5);
  n.wrapS = n.wrapT = THREE.RepeatWrapping;
  return n;
}

function hash2(x: number, y: number) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function valueNoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, oct = 4) { let v = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += amp * valueNoise(x * f, y * f); amp *= 0.5; f *= 2; } return v; }

export interface StoneTextures { color: THREE.Texture; normal: THREE.Texture; roughness: THREE.Texture }

/**
 * Sculpted stone blocks: offset courses of blocks, each a slightly different
 * tone, chisel-mark noise, weathered edges and deep mortar joints — colour,
 * normal and roughness maps from one height field.
 */
export function stoneBlocks(size = 512, cols = 4, rows = 4, tone: [number, number, number] = [150, 138, 120]): StoneTextures {
  const color = canvas(size, size), height = canvas(size, size), rough = canvas(size, size);
  const cImg = color.ctx.createImageData(size, size), hImg = height.ctx.createImageData(size, size), rImg = rough.ctx.createImageData(size, size);
  const bw = size / cols, bh = size / rows, joint = size * 0.012;
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / bh);
    for (let x = 0; x < size; x++) {
      const off = (row % 2) * bw * 0.5;
      const col = Math.floor(((x + off) % size) / bw);
      const lx = (x + off) % bw, ly = y % bh;
      const edge = Math.min(lx, bw - lx, ly, bh - ly);
      const blockSeed = hash2(col + row * 17, row);
      const n = fbm(x / 38 + blockSeed * 10, y / 38, 5);
      const chisel = fbm(x / 7, y / 7, 2);
      const inJoint = edge < joint;
      const bevel = Math.min(1, edge / (joint * 3.2));
      const h = inJoint ? 0.08 : 0.35 + 0.45 * bevel * (0.75 + 0.25 * n) + chisel * 0.08;
      const i = (y * size + x) * 4;
      const shade = (inJoint ? 0.45 : 0.82 + 0.22 * blockSeed) * (0.85 + 0.3 * n) * (0.93 + 0.07 * chisel);
      cImg.data[i] = Math.min(255, tone[0] * shade); cImg.data[i + 1] = Math.min(255, tone[1] * shade); cImg.data[i + 2] = Math.min(255, tone[2] * shade); cImg.data[i + 3] = 255;
      const hv = Math.round(h * 255); hImg.data[i] = hImg.data[i + 1] = hImg.data[i + 2] = hv; hImg.data[i + 3] = 255;
      const rv = Math.round((inJoint ? 0.98 : 0.78 + 0.18 * n) * 255); rImg.data[i] = rImg.data[i + 1] = rImg.data[i + 2] = rv; rImg.data[i + 3] = 255;
    }
  }
  color.ctx.putImageData(cImg, 0, 0); height.ctx.putImageData(hImg, 0, 0); rough.ctx.putImageData(rImg, 0, 0);
  const colorTex = new THREE.CanvasTexture(color.c); colorTex.colorSpace = THREE.SRGBColorSpace;
  const roughTex = new THREE.CanvasTexture(rough.c); roughTex.colorSpace = THREE.NoColorSpace;
  const normal = normalMapFromHeight(height.c, 4);
  for (const t of [colorTex, roughTex, normal]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { color: colorTex, normal, roughness: roughTex };
}

/** Rippled sand: warm noise with soft wind ripples (colour + normal). */
export function sand(size = 256): { color: THREE.Texture; normal: THREE.Texture } {
  const color = canvas(size, size), height = canvas(size, size);
  const cImg = color.ctx.createImageData(size, size), hImg = height.ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = fbm(x / 24, y / 24, 4);
    const ripple = 0.5 + 0.5 * Math.sin((x * 0.18 + y * 0.05) + n * 6);
    const i = (y * size + x) * 4;
    const s2 = 0.86 + 0.16 * n + 0.04 * hash2(x, y);
    cImg.data[i] = 196 * s2; cImg.data[i + 1] = 162 * s2; cImg.data[i + 2] = 112 * s2; cImg.data[i + 3] = 255;
    const hv = Math.round((0.4 + 0.3 * ripple + 0.3 * n) * 255); hImg.data[i] = hImg.data[i + 1] = hImg.data[i + 2] = hv; hImg.data[i + 3] = 255;
  }
  color.ctx.putImageData(cImg, 0, 0); height.ctx.putImageData(hImg, 0, 0);
  const c = new THREE.CanvasTexture(color.c); c.colorSpace = THREE.SRGBColorSpace;
  const n = normalMapFromHeight(height.c, 1.2);
  for (const t of [c, n]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return { color: c, normal: n };
}

/** A zone tile's gold inlay as stone + gold colour and metalness maps (from the tile's glow mask). */
export function goldInlay(tile: TileTextures, stone: [number, number, number] = [118, 108, 96]): { color: THREE.Texture; metalness: THREE.Texture } {
  const mask = (tile.glow as THREE.CanvasTexture).image as HTMLCanvasElement;
  const w = mask.width, h = mask.height;
  const m = mask.getContext("2d")!.getImageData(0, 0, w, h).data;
  const hdata = tile.height.getContext("2d")!.getImageData(0, 0, w, h).data;
  const col = canvas(w, h), met = canvas(w, h);
  const cImg = col.ctx.createImageData(w, h), mImg = met.ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const g = m[i * 4] / 255;
    const shade = 0.75 + 0.5 * (hdata[i * 4] / 255);
    const n = 0.9 + 0.2 * hash2(i % w, Math.floor(i / w));
    cImg.data[i * 4] = stone[0] * shade * n * (1 - g) + 232 * g;
    cImg.data[i * 4 + 1] = stone[1] * shade * n * (1 - g) + 178 * g;
    cImg.data[i * 4 + 2] = stone[2] * shade * n * (1 - g) + 72 * g;
    cImg.data[i * 4 + 3] = 255;
    const mv = Math.round(g * 255); mImg.data[i * 4] = mImg.data[i * 4 + 1] = mImg.data[i * 4 + 2] = mv; mImg.data[i * 4 + 3] = 255;
  }
  col.ctx.putImageData(cImg, 0, 0); met.ctx.putImageData(mImg, 0, 0);
  const color = new THREE.CanvasTexture(col.c); color.colorSpace = THREE.SRGBColorSpace;
  const metalness = new THREE.CanvasTexture(met.c); metalness.colorSpace = THREE.NoColorSpace;
  return { color, metalness };
}

