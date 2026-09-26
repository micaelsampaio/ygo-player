/**
 * Stone Coliseum: the duel on a sculpted stone dais in a sand arena ringed
 * by tiered seating and pillars; every zone a stone tile with its filigree
 * and glyph inlaid in gold that catches the firelight; four bronze braziers
 * burning (HDR flame, embers, flickering warm light); slanting shafts of
 * light with dust in them. The camera looks almost straight down, so the
 * scenery is built to read from above: fire as swirling radial flame,
 * pillars as capitals, the tiers as rings at the screen's edge.
 * Whose turn it is: the active side's braziers flare and its gold warms.
 */
import * as THREE from "three";
import type { YGODuel } from "../YGODuel";
import { BuiltField, layoutBounds, sideGroup, timeUniform, zoneLayout, LaidZone } from "./layout";
import { createFieldEnvironment } from "../render/post-fx";
import { goldInlay, sand, stoneBlocks, zoneTile } from "../render/procedural";
import { zoneShockwaves } from "./reactions";

const GOLD = new THREE.Color(0xe8b248);

function roundedRect(x0: number, y0: number, w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

function ellipseShape(cx: number, cy: number, rx: number, ry: number, hole?: [number, number]): THREE.Shape {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0);
  if (hole) {
    const h = new THREE.Path();
    h.absellipse(cx, cy, hole[0], hole[1], 0, Math.PI * 2, true, 0);
    s.holes.push(h);
  }
  return s;
}

/** A radial fire seen from above: swirling noise flame, pushed past white so it blooms. */
function fireMaterial(seed: number) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: timeUniform, uSeed: { value: seed }, uGain: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform float uSeed; uniform float uGain; varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; } return v; }
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0, ang = atan(p.y, p.x);
        float t = uTime * 1.6 + uSeed;
        float swirl = fbm(vec2(ang * 1.6 + t * 0.6, r * 3.0 - t * 2.2));
        float body = smoothstep(1.0, 0.0, r + (swirl - 0.5) * 0.9);
        float core = smoothstep(0.45, 0.0, r);
        vec3 col = mix(vec3(0.9, 0.18, 0.02), vec3(1.0, 0.62, 0.12), body) + vec3(1.0, 0.92, 0.6) * core;
        float a = clamp(body * 1.2, 0.0, 1.0);
        gl_FragColor = vec4(col * a * (1.6 + 1.4 * core) * uGain, a);
      }`,
  });
}

export function buildColiseum(duel: YGODuel, viewer: number): BuiltField {
  const zones = zoneLayout(duel);
  const b = layoutBounds(zones, 1.6);
  const root = new THREE.Group();
  root.name = "coliseum";
  const env = createFieldEnvironment(duel.core.renderer);

  // Warm fill: firelight from above and sand bounce from below.
  root.add(new THREE.HemisphereLight(0xffe0b0, 0x4a3420, 0.55));

  // Sand, rippled, far and wide.
  const sandTex = sand(256);
  sandTex.color.repeat.set(16, 11); sandTex.normal.repeat.set(16, 11);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 110), new THREE.MeshStandardMaterial({ map: sandTex.color, normalMap: sandTex.normal, roughness: 1 }));
  floor.position.z = -1.8;
  floor.receiveShadow = true;
  root.add(floor);

  // Tiered seating: three stone rings stepping up and out, at the screen's edge.
  const tierStone = stoneBlocks(512, 8, 2, [160, 146, 124]);
  const rx0 = b.width / 2 + 5.5, ry0 = b.height / 2 + 4.5;
  for (let i = 0; i < 3; i++) {
    const inner: [number, number] = [rx0 + i * 2.6, ry0 + i * 2.2];
    const geo = new THREE.ExtrudeGeometry(ellipseShape(b.cx, b.cy, inner[0] + 2.8, inner[1] + 2.4, inner), { depth: 1.2 + i * 1.1, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 96 });
    const tex = { map: tierStone.color.clone(), normalMap: tierStone.normal.clone() };
    tex.map.repeat.set(0.18, 0.18); tex.normalMap.repeat.set(0.18, 0.18); tex.map.needsUpdate = tex.normalMap.needsUpdate = true;
    const tier = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ ...tex, color: 0xf2e6d2, roughness: 0.92 }));
    tier.position.z = -1.8;
    tier.receiveShadow = true;
    root.add(tier);
  }

  // Pillars on the first tier: a lathed base, shaft and capital (from above: the capitals).
  const pillarProfile = [
    [0, 0], [1.05, 0], [1.05, 0.3], [0.85, 0.45], [0.72, 0.55], [0.66, 4.4], [0.8, 4.55], [1.15, 4.75], [1.2, 5.05], [0, 5.05],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pillarGeo = new THREE.LatheGeometry(pillarProfile, 20);
  pillarGeo.rotateX(Math.PI / 2);
  const pillarMat = new THREE.MeshStandardMaterial({ map: tierStone.color, normalMap: tierStone.normal, color: 0xf5ecdc, roughness: 0.85 });
  const PILLARS = 18;
  for (let i = 0; i < PILLARS; i++) {
    const a = (i / PILLARS) * Math.PI * 2;
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(b.cx + Math.cos(a) * (rx0 + 1.4), b.cy + Math.sin(a) * (ry0 + 1.2), -0.6);
    root.add(pillar);
  }

  // The dais: sculpted stone blocks, a dark trim band, a gold edge.
  const daisStone = stoneBlocks(512, 4, 4, [178, 160, 134]);
  for (const t of [daisStone.color, daisStone.normal, daisStone.roughness]) t.repeat.set(b.width / 4.5, b.height / 4.5);
  const trim = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(b.minX - 1.1, b.minY - 1.1, b.width + 2.2, b.height + 2.2, 1.6), { depth: 0.9, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 }),
    new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 }),
  );
  trim.position.z = -1.5;
  root.add(trim);
  const dais = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(b.minX, b.minY, b.width, b.height, 1.1), { depth: 0.8, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 }),
    new THREE.MeshStandardMaterial({ map: daisStone.color, normalMap: daisStone.normal, normalScale: new THREE.Vector2(1.1, 1.1), roughnessMap: daisStone.roughness, roughness: 1 }),
  );
  dais.position.z = -0.9;
  dais.receiveShadow = true;
  root.add(dais);
  const goldMat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 0.8 });
  const edgePts = roundedRect(b.minX - 0.05, b.minY - 0.05, b.width + 0.1, b.height + 0.1, 1.15).getPoints(24).map((p) => new THREE.Vector3(p.x, p.y, 0.0));
  const edgePath = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < edgePts.length - 1; i++) edgePath.add(new THREE.LineCurve3(edgePts[i], edgePts[i + 1]));
  root.add(new THREE.Mesh(new THREE.TubeGeometry(edgePath as any, 240, 0.09, 6, true), goldMat));

  // Zones: stone tiles with the filigree and glyph inlaid in gold.
  const inlays: Array<{ mat: THREE.MeshStandardMaterial; owner: number }> = [];
  zones.forEach((z: LaidZone) => {
    const pad = 0.28;
    const w = z.width + pad, h = z.height + pad;
    const tile = zoneTile(z.kind, w / h);
    const gold = goldInlay(tile, z.owner === -1 ? [74, 66, 78] : z.owner === viewer ? [70, 72, 78] : [82, 66, 60]);
    const mat = new THREE.MeshStandardMaterial({
      map: gold.color, metalnessMap: gold.metalness, metalness: 1, roughness: 0.62,
      normalMap: tile.normal, normalScale: new THREE.Vector2(1.4, 1.4), envMap: env, envMapIntensity: 0.9,
      emissive: GOLD, emissiveMap: tile.glow, emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(z.center.x, z.center.y, 0.012);
    mesh.receiveShadow = true;
    mesh.renderOrder = -8;
    root.add(mesh);
    inlays.push({ mat, owner: z.owner });
  });

  // Braziers: a bronze bowl on a stone plinth, the fire, a flickering light, embers.
  const bronze = new THREE.MeshStandardMaterial({ color: 0x7a5530, metalness: 0.9, roughness: 0.38, envMap: env, envMapIntensity: 0.6 });
  const bowlGeo = new THREE.LatheGeometry([[0, 0], [0.45, 0.05], [0.95, 0.35], [1.25, 0.8], [1.35, 1.0], [1.18, 1.02], [0, 0.9]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  bowlGeo.rotateX(Math.PI / 2);
  const spots: Array<[number, number, number]> = [
    [b.minX - 1.5, b.cy - b.height * 0.24, viewer], [b.maxX + 1.5, b.cy - b.height * 0.24, viewer],
    [b.minX - 1.5, b.cy + b.height * 0.24, 1 - viewer], [b.maxX + 1.5, b.cy + b.height * 0.24, 1 - viewer],
  ];
  const braziers: Array<{ light: THREE.PointLight; fire: THREE.ShaderMaterial; owner: number; seed: number }> = [];
  const emberPos: number[] = [], emberSeed: number[] = [];
  spots.forEach(([x, y, owner], i) => {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.4, 16), new THREE.MeshStandardMaterial({ map: tierStone.color, normalMap: tierStone.normal, roughness: 0.9 }));
    plinth.rotation.x = Math.PI / 2;
    plinth.position.set(x, y, -0.6);
    root.add(plinth);
    const bowl = new THREE.Mesh(bowlGeo, bronze);
    bowl.position.set(x, y, 0.1);
    bowl.castShadow = true;
    root.add(bowl);
    const coals = new THREE.Mesh(new THREE.CircleGeometry(1.15, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a14).multiplyScalar(1.3) }));
    coals.position.set(x, y, 1.0);
    root.add(coals);
    const fire = fireMaterial(i * 3.3);
    const flame = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), fire);
    flame.position.set(x, y, 1.15);
    flame.renderOrder = 6;
    root.add(flame);
    const light = new THREE.PointLight(0xff9a48, 30, 22, 1.5);
    light.position.set(x, y, 3.2);
    root.add(light);
    braziers.push({ light, fire, owner, seed: i * 1.9 });
    for (let k = 0; k < 40; k++) { emberPos.push(x + (Math.random() - 0.5) * 1.2, y + (Math.random() - 0.5) * 1.2, 1.1); emberSeed.push(Math.random()); }
  });
  const embers = new THREE.BufferGeometry();
  embers.setAttribute("position", new THREE.Float32BufferAttribute(emberPos, 3));
  embers.setAttribute("aSeed", new THREE.Float32BufferAttribute(emberSeed, 1));
  const emberPoints = new THREE.Points(embers, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: timeUniform },
    vertexShader: `
      attribute float aSeed; uniform float uTime; varying float vFade;
      void main() {
        float t = fract(uTime * (0.22 + aSeed * 0.35) + aSeed * 9.0);
        float a = aSeed * 40.0 + uTime * 0.6;
        vec3 p = position + vec3(cos(a) * 2.2 * t, sin(a) * 2.2 * t, t * 5.0);
        vFade = (1.0 - t) * smoothstep(0.0, 0.1, t);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.6 + aSeed * 2.6) * (20.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vFade;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vFade; gl_FragColor = vec4(vec3(1.0, 0.55, 0.16) * a * 2.2, a); }`,
  }));
  emberPoints.frustumCulled = false;
  root.add(emberPoints);

  // Shafts of light slanting across the arena, dust drifting in them.
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: timeUniform },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      void main() {
        float across = exp(-pow((vUv.x - 0.5) / 0.22, 2.0));
        float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
        float shimmer = 0.85 + 0.15 * sin(uTime * 0.7 + vUv.y * 9.0);
        float a = across * along * shimmer * 0.075;
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * a, a);
      }`,
  });
  for (const [x, w, rot] of [[b.cx - b.width * 0.3, 5, 0.55], [b.cx + b.width * 0.05, 7, 0.55], [b.cx + b.width * 0.36, 4, 0.55]]) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(w, b.height * 2.4), shaftMat);
    shaft.rotation.z = rot;
    shaft.position.set(x, b.cy, 2.4);
    shaft.renderOrder = 7;
    root.add(shaft);
  }
  const DUST = 220;
  const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dustPos[i * 3] = b.minX + Math.random() * b.width; dustPos[i * 3 + 1] = b.minY + Math.random() * b.height; dustPos[i * 3 + 2] = 0.5 + Math.random() * 3; dustSeed[i] = Math.random(); }
  const dust = new THREE.BufferGeometry();
  dust.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dust.setAttribute("aSeed", new THREE.BufferAttribute(dustSeed, 1));
  const dustPoints = new THREE.Points(dust, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: timeUniform },
    vertexShader: `
      attribute float aSeed; uniform float uTime; varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.2 + aSeed * 50.0) * 0.8, cos(uTime * 0.17 + aSeed * 31.0) * 0.8, sin(uTime * 0.3 + aSeed * 13.0) * 0.4);
        vA = 0.35 + 0.35 * sin(uTime * 0.9 + aSeed * 20.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.0 + aSeed * 1.6) * (20.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA * 0.6; gl_FragColor = vec4(vec3(1.0, 0.9, 0.7) * a, a); }`,
  }));
  dustPoints.frustumCulled = false;
  root.add(dustPoints);

  // Summons and activations: a golden runic flash from the zone.
  const ripples = zoneShockwaves(duel, root, () => GOLD.clone());

  const mySide = sideGroup(zones, viewer, b, viewer, { turnGlow: false });
  const theirSide = sideGroup(zones, 1 - viewer, b, viewer, { turnGlow: false });
  root.add(mySide, theirSide);

  let t = 0;
  let active = 0.5;
  const update = (dt: number) => {
    t += dt;
    const turn = duel.ygo?.state?.turnPriority ?? duel.ygo?.state?.turnPlayer;
    active += ((turn === viewer ? 1 : 0) - active) * Math.min(1, dt * 3);
    for (const br of braziers) {
      const mine = br.owner === viewer ? active : 1 - active;
      const flare = 0.75 + 0.45 * mine;
      const f = 0.85 + 0.1 * Math.sin(t * 8 + br.seed) + 0.05 * Math.sin(t * 21 + br.seed * 3);
      br.light.intensity = 30 * flare * f;
      br.fire.uniforms.uGain.value = flare;
    }
    for (const inl of inlays) {
      const mine = inl.owner === -1 ? 0.5 : inl.owner === viewer ? active : 1 - active;
      inl.mat.emissiveIntensity = 0.2 + 0.55 * mine;
    }
    ripples(dt);
  };
  return { root, sides: [mySide, theirSide], update };
}
