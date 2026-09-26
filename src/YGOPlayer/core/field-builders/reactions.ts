/**
 * A field that answers the duel: a summon or an activation sends a
 * shockwave out from its zone. Rings are pooled; each lives ~0.8 s.
 */
import * as THREE from "three";
import type { YGODuel } from "../YGODuel";
import { getZonePosition } from "../../scripts/ygo-utils";

const TRIGGERS = new Set(["Normal Summon", "Tribute Summon", "Special Summon", "Synchro Summon", "Link Summon", "Fusion Summon", "XYZ Summon", "Activate"]);
const LIFE = 0.8;

export function zoneShockwaves(duel: YGODuel, root: THREE.Object3D, color: (log: any) => THREE.Color) {
  const pool: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; age: number }> = [];
  const make = () => {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color() }, uAge: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uAge; varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float radius = uAge * 0.95;
          float ring = exp(-pow((d - radius) / 0.06, 2.0));
          float core = exp(-d * 6.0) * (1.0 - uAge) * 0.8;
          float a = (ring + core) * (1.0 - uAge);
          gl_FragColor = vec4(uColor * a * 3.0, a);
        }`,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), mat);
    mesh.visible = false;
    mesh.renderOrder = 5;
    root.add(mesh);
    const item = { mesh, mat, age: LIFE };
    pool.push(item);
    return item;
  };
  const spawn = (log: any) => {
    const zone = log?.zone;
    if (!zone || !/^(M|S|EMZ|F)/.test(String(zone))) return;
    let pos: THREE.Vector3;
    try { pos = getZonePosition(duel, zone); } catch { return; }
    const item = pool.find((p) => p.age >= LIFE) ?? make();
    item.age = 0;
    item.mat.uniforms.uColor.value.copy(color(log));
    item.mesh.position.set(pos.x, pos.y, 0.08);
    item.mesh.visible = true;
  };
  duel.ygo.events.on("new-log", (log: any) => {
    if (duel.commands?.isRecovering?.()) return;
    if (TRIGGERS.has(log?.type)) spawn(log);
  });
  return (dt: number) => {
    for (const p of pool) {
      if (p.age >= LIFE) continue;
      p.age = Math.min(LIFE, p.age + dt);
      p.mat.uniforms.uAge.value = p.age / LIFE;
      if (p.age >= LIFE) p.mesh.visible = false;
    }
  };
}
