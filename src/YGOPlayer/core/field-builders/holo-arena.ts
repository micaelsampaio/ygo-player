/**
 * Holo Arena: a duel floor of polished black glass (reflections, a faint
 * hex etching) with an energy rim; every zone an ornate engraved tile whose
 * lines glow in its side's colour (blue yours, red theirs, violet the Extra
 * Monster Zones) and breathe; summons and activations ripple out as
 * hologram shockwaves; a deep grid and data motes around it.
 * Glows are pushed past white so the bloom pass picks them up — card art
 * never is, so cards stay crisp.
 */
import * as THREE from "three";
import type { YGODuel } from "../YGODuel";
import { BuiltField, layoutBounds, sideGroup, timeUniform, zoneLayout, LaidZone } from "./layout";
import { createFieldEnvironment } from "../render/post-fx";
import { hexEtching, zoneTile } from "../render/procedural";
import { zoneShockwaves } from "./reactions";

const BLUE = new THREE.Color(0x3d8bff);
const RED = new THREE.Color(0xff3f55);
const VIOLET = new THREE.Color(0xb67cff);
const CYAN = new THREE.Color(0x5ff2ff);

function roundedRectPath(x0: number, y0: number, w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

export function buildHoloArena(duel: YGODuel, viewer: number): BuiltField {
  const zones = zoneLayout(duel);
  const b = layoutBounds(zones, 1.8);
  const root = new THREE.Group();
  root.name = "holo-arena";
  const env = createFieldEnvironment(duel.core.renderer);

  // Deep backdrop: two grids at different scales scrolling at different speeds (parallax), a nebula glow.
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 110),
    new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: { uTime: timeUniform },
      vertexShader: `varying vec2 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float uTime; varying vec2 vW;
        float grid(vec2 p, float s, float w) { vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y) / w, 1.0); }
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
        void main() {
          vec2 p1 = vW + vec2(0.0, uTime * 0.45), p2 = vW * 0.5 + vec2(uTime * 0.08, uTime * 0.2);
          float g = grid(p1, 2.5, 1.0) * 0.28 + grid(p1, 12.5, 1.5) * 0.55 + grid(p2, 6.0, 1.0) * 0.18;
          float v = smoothstep(62.0, 6.0, length(vW));
          float neb = noise(vW * 0.06 + uTime * 0.02) * noise(vW * 0.13 - uTime * 0.015);
          vec3 base = mix(vec3(0.002, 0.004, 0.012), vec3(0.01, 0.025, 0.07), v) + vec3(0.05, 0.02, 0.12) * neb * v;
          gl_FragColor = vec4(base + vec3(0.1, 0.42, 0.85) * g * v * 0.5, 1.0);
        }`,
    }),
  );
  backdrop.position.set(0, 0, -4);
  backdrop.renderOrder = -30;
  root.add(backdrop);

  // The glass platform: polished black, reflective, hex-etched.
  const etch = hexEtching(256, 26);
  etch.repeat.set(b.width / 6, b.height / 6);
  // Dark, not a mirror: a rough-ish black with faint reflections (no clear coat — its
  // highlight of the key light bloomed into a glare).
  const glass = new THREE.MeshStandardMaterial({
    color: 0x04060b, metalness: 0.1, roughness: 0.58,
    envMap: env, envMapIntensity: 0.22, normalMap: etch, normalScale: new THREE.Vector2(0.3, 0.3),
  });
  const slab = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRectPath(b.minX, b.minY, b.width, b.height, 1.4), { depth: 0.6, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.14, bevelSegments: 3 }),
    glass,
  );
  slab.position.z = -0.76;
  slab.receiveShadow = true;
  root.add(slab);

  // The energy rim: a bright tube hugging the platform's edge (HDR, so it blooms).
  const rimPath = new THREE.CurvePath<THREE.Vector3>();
  const edge = roundedRectPath(b.minX - 0.05, b.minY - 0.05, b.width + 0.1, b.height + 0.1, 1.45).getPoints(24).map((p) => new THREE.Vector3(p.x, p.y, 0.0));
  for (let i = 0; i < edge.length - 1; i++) rimPath.add(new THREE.LineCurve3(edge[i], edge[i + 1]));
  const rim = new THREE.Mesh(new THREE.TubeGeometry(rimPath as any, 240, 0.06, 6, true), new THREE.MeshBasicMaterial({ color: CYAN.clone().multiplyScalar(1.7), toneMapped: false }));
  root.add(rim);

  // Centre line and the halves' faint tint, with a slow scan (additive).
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(b.width, b.height),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: timeUniform },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
        void main() {
          float side = step(0.5, vUv.y);
          vec3 tint = mix(vec3(0.08, 0.22, 0.8), vec3(0.8, 0.12, 0.2), side) * 0.035;
          float centre = exp(-pow((vUv.y - 0.5) / 0.003, 2.0)) * 1.4 + exp(-pow((vUv.y - 0.5) / 0.03, 2.0)) * 0.06;
          float scan = exp(-pow((vUv.y - fract(uTime * 0.09)) / 0.01, 2.0)) * 0.16;
          gl_FragColor = vec4(tint + vec3(0.35, 0.9, 1.0) * (centre + scan), 1.0);
        }`,
    }),
  );
  surface.position.set(b.cx, b.cy, 0.004);
  surface.renderOrder = -10;
  root.add(surface);

  // Zones: ornate engraved tiles, the engraving glowing in the side's colour.
  const tileMaterials: Array<{ mat: THREE.MeshStandardMaterial; phase: number; base: number; owner: number }> = [];
  const colourOf = (z: LaidZone) => (z.owner === -1 ? VIOLET : z.owner === viewer ? BLUE : RED);
  zones.forEach((z, i) => {
    const pad = 0.28;
    const w = z.width + pad, h = z.height + pad;
    const tex = zoneTile(z.kind, w / h);
    const base = z.kind === "extraMonster" ? 2.0 : 1.5;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0b111d, metalness: 0.6, roughness: 0.46, envMap: env, envMapIntensity: 0.3,
      normalMap: tex.normal, normalScale: new THREE.Vector2(1.2, 1.2),
      emissive: colourOf(z), emissiveMap: tex.glow, emissiveIntensity: base,
      transparent: false,
    });
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    tile.position.set(z.center.x, z.center.y, 0.01);
    tile.receiveShadow = true;
    tile.renderOrder = -8;
    root.add(tile);
    tileMaterials.push({ mat, phase: i * 0.61, base, owner: z.owner });
  });

  // Data motes at three depths (HDR, so the nearest ones bloom).
  const COUNT = 420;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = b.minX - 6 + Math.random() * (b.width + 12);
    positions[i * 3 + 1] = b.minY - 5 + Math.random() * (b.height + 10);
    positions[i * 3 + 2] = [-2.5, 0.1, 1.2][i % 3];
    seeds[i] = Math.random();
  }
  const motes = new THREE.BufferGeometry();
  motes.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  motes.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const points = new THREE.Points(motes, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: timeUniform },
    vertexShader: `
      attribute float aSeed; uniform float uTime; varying float vFade; varying float vSeed;
      void main() {
        float t = fract(uTime * (0.03 + aSeed * 0.05) + aSeed);
        vec3 p = position + vec3(sin(uTime * 0.4 + aSeed * 30.0) * 0.4, cos(uTime * 0.3 + aSeed * 17.0) * 0.4, t * 7.0);
        vFade = sin(t * 3.14159); vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + aSeed * 3.5) * (20.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vFade; varying float vSeed;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vFade;
        vec3 c = mix(vec3(0.37, 0.95, 1.0), vec3(0.7, 0.5, 1.0), step(0.8, vSeed));
        gl_FragColor = vec4(c * a * 1.15, a);
      }`,
  }));
  points.frustumCulled = false;
  root.add(points);

  // Summons and activations ripple out from their zone, in the acting player's colour.
  const ripples = zoneShockwaves(duel, root, (log) => (log.player === viewer ? BLUE : RED).clone().lerp(CYAN, 0.25));

  // The standard turn glow floods a half on this dark glass: this field shows
  // whose turn it is in its own way (the active side's tiles burn brighter,
  // the rim leans to their colour).
  const mySide = sideGroup(zones, viewer, b, viewer, { turnGlow: false });
  const theirSide = sideGroup(zones, 1 - viewer, b, viewer, { turnGlow: false });
  root.add(mySide, theirSide);

  const rimMat = rim.material as THREE.MeshBasicMaterial;
  const rimTarget = new THREE.Color();
  let t = 0;
  let active = 0.5; // 0 = the opponent's turn, 1 = yours (eased)
  const update = (dt: number) => {
    t += dt;
    const turn = duel.ygo?.state?.turnPriority ?? duel.ygo?.state?.turnPlayer;
    active += ((turn === viewer ? 1 : 0) - active) * Math.min(1, dt * 3);
    // The engravings breathe, each tile a little out of step; the active side's burn brighter.
    for (const tm of tileMaterials) {
      const boost = tm.owner === -1 ? 1 : tm.owner === viewer ? 0.7 + 0.5 * active : 0.7 + 0.5 * (1 - active);
      tm.mat.emissiveIntensity = tm.base * boost * (0.82 + 0.18 * Math.sin(t * 1.4 + tm.phase));
    }
    rimTarget.copy(CYAN).lerp(active > 0.5 ? BLUE : RED, Math.abs(active - 0.5) * 0.9).multiplyScalar(1.7);
    rimMat.color.lerp(rimTarget, Math.min(1, dt * 3));
    ripples(dt);
  };
  return { root, sides: [mySide, theirSide], update };
}
