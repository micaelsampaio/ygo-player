import * as THREE from "three";
import { YGOTask } from "../../core/components/tasks/YGOTask";
import type { YGODuel } from "../../core/YGODuel";

/** The viewer asked for less motion: shakes and sweeps are skipped (the attack still plays). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

let chevronTexture: THREE.CanvasTexture | null = null;

/** A strip of chevrons pointing along +x, drawn once: the attack arrow's body (it repeats along its length). */
function getChevronTexture(): THREE.CanvasTexture | null {
  if (chevronTexture) return chevronTexture;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const glow = ctx.createLinearGradient(0, 0, 0, 64);
  glow.addColorStop(0, "rgba(120,190,255,0)");
  glow.addColorStop(0.5, "rgba(120,190,255,0.35)");
  glow.addColorStop(1, "rgba(120,190,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 64);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const [x, w, color] of [[30, 14, "rgba(70,160,255,0.9)"], [30, 6, "rgba(235,248,255,1)"], [94, 14, "rgba(70,160,255,0.9)"], [94, 6, "rgba(235,248,255,1)"]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x - 14, 10);
    ctx.lineTo(x + 14, 32);
    ctx.lineTo(x - 14, 54);
    ctx.stroke();
  }
  chevronTexture = new THREE.CanvasTexture(canvas);
  chevronTexture.wrapS = THREE.RepeatWrapping;
  chevronTexture.colorSpace = THREE.SRGBColorSpace;
  return chevronTexture;
}

/** The arrow's mesh: a chevron band pivoted at its start (scale x is its length), drawn over the board. */
function createArrowMesh(width: number): { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial } | null {
  const texture = getChevronTexture();
  if (!texture) return null;
  const map = texture.clone();
  map.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const geometry = new THREE.PlaneGeometry(1, width);
  geometry.translate(0.5, 0, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 999;
  return { mesh, material };
}

function disposeArrowMesh(duel: YGODuel, mesh: THREE.Mesh, material: THREE.MeshBasicMaterial) {
  duel.core.scene.remove(mesh);
  mesh.geometry.dispose();
  material.map?.dispose();
  material.dispose();
}

/**
 * The aiming arrow while an attacker picks its target: from the attacker to the pointer (or the
 * target it is over), streaming. Call update() every frame while shown.
 */
export class AimArrow {
  private arrow: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial } | null = null;

  constructor(private duel: YGODuel, private width = 2.6) {}

  public show(from: THREE.Vector3, to: THREE.Vector3, dt: number) {
    if (!this.arrow) {
      this.arrow = createArrowMesh(this.width);
      if (!this.arrow) return;
      this.duel.core.scene.add(this.arrow.mesh);
    }
    const { mesh, material } = this.arrow;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    mesh.visible = length > 1;
    mesh.position.set(from.x, from.y, Math.max(from.z, to.z) + 0.6);
    mesh.rotation.z = Math.atan2(dy, dx);
    mesh.scale.x = Math.max(0.001, length);
    material.map!.repeat.set(Math.max(1, length / (this.width * 2)), 1);
    material.map!.offset.x -= dt * 2.5;
    material.opacity = Math.min(1, material.opacity + dt * 6);
  }

  public hide() {
    if (!this.arrow) return;
    disposeArrowMesh(this.duel, this.arrow.mesh, this.arrow.material);
    this.arrow = null;
  }
}

/**
 * The Master Duel attack arrow: a glowing band of chevrons from `from` to `to` that grows out of
 * the attacker, streams toward the target for `hold` seconds, then fades. Disposes itself.
 */
export class AttackArrowTask extends YGOTask {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private length = 0;
  private readonly grow = 0.2;
  private readonly fade = 0.2;

  constructor(private duel: YGODuel, private from: THREE.Vector3, private to: THREE.Vector3, private hold = 0.45, private width = 3) {
    super();
  }

  public start(): void {
    const dir = new THREE.Vector3().subVectors(this.to, this.from);
    dir.z = 0;
    this.length = dir.length();
    const arrow = this.length < 0.5 ? null : createArrowMesh(this.width);
    if (!arrow) return this.completeTask();
    // Pivot at the attacker's end, so scaling x grows it toward the target.
    this.mesh = arrow.mesh;
    this.material = arrow.material;
    this.material.map!.repeat.set(Math.max(1, this.length / (this.width * 2)), 1);
    this.mesh.position.set(this.from.x, this.from.y, Math.max(this.from.z, this.to.z) + 0.6);
    this.mesh.rotation.z = Math.atan2(dir.y, dir.x);
    this.mesh.scale.set(0.001, 1, 1);
    this.duel.core.scene.add(this.mesh);
  }

  public update(dt: number): void {
    if (!this.mesh || !this.material) return;
    this.elapsedTime += dt;
    const t = this.elapsedTime;
    const map = this.material.map!;
    map.offset.x -= dt * 2.5;
    if (t < this.grow) {
      const k = t / this.grow;
      this.mesh.scale.x = this.length * (1 - (1 - k) ** 3);
      this.material.opacity = k;
    } else if (t < this.grow + this.hold) {
      this.mesh.scale.x = this.length;
      this.material.opacity = 1;
    } else if (t < this.grow + this.hold + this.fade) {
      this.material.opacity = 1 - (t - this.grow - this.hold) / this.fade;
    } else {
      this.completeTask();
    }
  }

  public finish(): void {
    if (this.mesh && this.material) disposeArrowMesh(this.duel, this.mesh, this.material);
    this.mesh = null;
    this.material = null;
  }
}

/** A short decaying camera shake on impact (skipped under reduced motion); the camera ends where it started. */
export class CameraShakeTask extends YGOTask {
  private base: THREE.Vector3 | null = null;

  constructor(private duel: YGODuel, private intensity = 0.6, private duration = 0.3) {
    super();
  }

  public start(): void {
    if (prefersReducedMotion()) return this.completeTask();
    this.base = this.duel.core.camera.position.clone();
  }

  public update(dt: number): void {
    if (!this.base) return;
    this.elapsedTime += dt;
    const k = 1 - this.elapsedTime / this.duration;
    if (k <= 0) return this.completeTask();
    const amp = this.intensity * k * k;
    const camera = this.duel.core.camera;
    camera.position.set(this.base.x + (Math.random() * 2 - 1) * amp, this.base.y + (Math.random() * 2 - 1) * amp, this.base.z);
  }

  public finish(): void {
    if (this.base) this.duel.core.camera.position.copy(this.base);
    this.base = null;
  }
}

/** A particle sprite from the CDN (cached by the duel's assets, so never disposed here). */
export function particleTexture(duel: YGODuel, name: string): THREE.Texture {
  return duel.assets.getTexture(duel.createCdnUrl(`/images/particles/${name}.png`));
}

function additiveMaterial(map: THREE.Texture | null, color: THREE.ColorRepresentation): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
}

/** Takes an effect group out of the scene and frees its (shared) geometry and material. */
function disposeGroup(duel: YGODuel, group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material) {
  duel.core.scene.remove(group);
  geometry.dispose();
  material.dispose();
}

const easeOutCubic = (k: number) => 1 - (1 - k) ** 3;

export interface ImpactStreaksOptions {
  count?: number;
  /** Average streak length (world units). */
  length?: number;
  width?: number;
  color?: THREE.ColorRepresentation;
  duration?: number;
}

/**
 * Radial speed lines bursting out of an impact: `count` additive trace streaks at spread-out
 * random angles that shoot outward, stretch and fade (~0.35s). Skipped under reduced motion.
 */
export class ImpactStreaksTask extends YGOTask {
  private group: THREE.Group | null = null;
  private geometry: THREE.PlaneGeometry | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private streaks: { mesh: THREE.Mesh; angle: number; length: number; inner: number }[] = [];
  private readonly count: number;
  private readonly length: number;
  private readonly width: number;
  private readonly duration: number;
  private readonly color: THREE.ColorRepresentation;

  constructor(private duel: YGODuel, private position: THREE.Vector3, { count = 8, length = 9, width = 1.4, color = 0xffffff, duration = 0.35 }: ImpactStreaksOptions = {}) {
    super();
    this.count = count;
    this.length = length;
    this.width = width;
    this.duration = duration;
    this.color = color;
  }

  public start(): void {
    if (prefersReducedMotion()) return this.completeTask();
    // trace_01 is a vertical streak: lay it along +x, pivoted at its inner end.
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.geometry.rotateZ(-Math.PI / 2);
    this.geometry.translate(0.5, 0, 0);
    this.material = additiveMaterial(particleTexture(this.duel, "trace_01"), this.color);
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.group.position.z += 0.3;
    const step = (Math.PI * 2) / this.count;
    for (let i = 0; i < this.count; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.renderOrder = 1000;
      const angle = i * step + (Math.random() - 0.5) * step * 0.8;
      mesh.rotation.z = angle;
      mesh.scale.set(0.001, this.width, 1);
      this.group.add(mesh);
      this.streaks.push({ mesh, angle, length: this.length * (0.6 + Math.random() * 0.8), inner: 0.8 + Math.random() * 1.2 });
    }
    this.duel.core.scene.add(this.group);
  }

  public update(dt: number): void {
    if (!this.group || !this.material) return;
    this.elapsedTime += dt;
    const k = Math.min(1, this.elapsedTime / this.duration);
    const grow = easeOutCubic(Math.min(1, k / 0.35));
    for (const { mesh, angle, length, inner } of this.streaks) {
      const r = inner + length * 0.7 * easeOutCubic(k);
      mesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      mesh.scale.set(Math.max(0.001, length * grow * (1 - 0.5 * k)), this.width * (1 - 0.7 * k), 1);
    }
    this.material.opacity = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
    if (k >= 1) this.completeTask();
  }

  public finish(): void {
    if (this.group && this.geometry && this.material) disposeGroup(this.duel, this.group, this.geometry, this.material);
    this.group = null;
    this.geometry = null;
    this.material = null;
    this.streaks = [];
  }
}

export interface ImpactSparksOptions {
  count?: number;
  /** Initial speed (world units / s). */
  speed?: number;
  color?: THREE.ColorRepresentation;
  duration?: number;
}

/**
 * Sparks flying out of an impact: elongated additive specks shot outward (and a little up) that
 * slow down under drag, fall back toward the board and fade. Disposes itself.
 */
export class ImpactSparksTask extends YGOTask {
  private group: THREE.Group | null = null;
  private geometry: THREE.PlaneGeometry | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private sparks: { mesh: THREE.Mesh; velocity: THREE.Vector3; size: number }[] = [];
  private readonly count: number;
  private readonly speed: number;
  private readonly duration: number;
  private readonly color: THREE.ColorRepresentation;

  constructor(private duel: YGODuel, private position: THREE.Vector3, { count = 14, speed = 26, color = 0xffd36b, duration = 0.5 }: ImpactSparksOptions = {}) {
    super();
    this.count = count;
    this.speed = speed;
    this.duration = duration;
    this.color = color;
  }

  public start(): void {
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.geometry.rotateZ(-Math.PI / 2);
    this.material = additiveMaterial(particleTexture(this.duel, "trace_01"), this.color);
    this.material.opacity = 1;
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.group.position.z += 0.4;
    const step = (Math.PI * 2) / this.count;
    for (let i = 0; i < this.count; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.renderOrder = 1001;
      const angle = i * step + (Math.random() - 0.5) * step;
      const speed = this.speed * (0.5 + Math.random() * 0.8);
      const velocity = new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, speed * 0.35 * Math.random());
      mesh.rotation.z = angle;
      mesh.scale.set(0.001, 0.001, 1);
      this.group.add(mesh);
      this.sparks.push({ mesh, velocity, size: 0.35 + Math.random() * 0.3 });
    }
    this.duel.core.scene.add(this.group);
  }

  public update(dt: number): void {
    if (!this.group || !this.material) return;
    this.elapsedTime += dt;
    const k = Math.min(1, this.elapsedTime / this.duration);
    const drag = Math.exp(-5 * dt);
    for (const { mesh, velocity, size } of this.sparks) {
      velocity.x *= drag;
      velocity.y *= drag;
      velocity.z -= 30 * dt;
      mesh.position.addScaledVector(velocity, dt);
      if (mesh.position.z < 0) {
        mesh.position.z = 0;
        velocity.z = 0;
      }
      const planar = Math.hypot(velocity.x, velocity.y);
      if (planar > 0.01) mesh.rotation.z = Math.atan2(velocity.y, velocity.x);
      // Stretched along its motion while fast, a speck as it slows.
      mesh.scale.set(size + planar * 0.12, size * (1 - 0.6 * k), 1);
    }
    this.material.opacity = 1 - k * k;
    if (k >= 1) this.completeTask();
  }

  public finish(): void {
    if (this.group && this.geometry && this.material) disposeGroup(this.duel, this.group, this.geometry, this.material);
    this.group = null;
    this.geometry = null;
    this.material = null;
    this.sparks = [];
  }
}

/**
 * A full-screen flash: an additive plane just in front of the camera (following it, so a camera
 * shake doesn't uncover an edge) that peaks fast and fades over `duration`. Skipped under reduced motion.
 */
export class ScreenFlashTask extends YGOTask {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private readonly distance = 1;

  constructor(private duel: YGODuel, private peak = 0.6, private duration = 0.12, private color: THREE.ColorRepresentation = 0xffffff) {
    super();
  }

  public start(): void {
    if (prefersReducedMotion()) return this.completeTask();
    const camera = this.duel.core.camera;
    const height = 2 * this.distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 1.4;
    this.material = additiveMaterial(null, this.color);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * Math.max(1, camera.aspect), height), this.material);
    this.mesh.renderOrder = 10000;
    this.mesh.frustumCulled = false;
    this.follow();
    this.duel.core.scene.add(this.mesh);
  }

  private follow() {
    const camera = this.duel.core.camera;
    this.mesh!.quaternion.copy(camera.quaternion);
    this.mesh!.position.copy(camera.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), this.distance);
  }

  public update(dt: number): void {
    if (!this.mesh || !this.material) return;
    this.elapsedTime += dt;
    const k = Math.min(1, this.elapsedTime / this.duration);
    this.follow();
    this.material.opacity = this.peak * (k < 0.25 ? k / 0.25 : (1 - (k - 0.25) / 0.75) ** 2);
    if (k >= 1) this.completeTask();
  }

  public finish(): void {
    if (this.mesh && this.material) {
      this.duel.core.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
    this.mesh = null;
    this.material = null;
  }
}

/**
 * The struck card recoils: knocked `distance` along `direction` and eased back, with a decaying
 * jitter (the jitter is skipped under reduced motion). Its transform is restored when it ends.
 */
export class RecoilTask extends YGOTask {
  private basePosition: THREE.Vector3 | null = null;
  private baseRotationZ = 0;
  private dir = new THREE.Vector3();
  private shake = true;

  constructor(private object: THREE.Object3D, direction: THREE.Vector3, private distance = 0.7, private duration = 0.22, private jitter = 0.15) {
    super();
    this.dir.set(direction.x, direction.y, 0);
    if (this.dir.lengthSq() > 0) this.dir.normalize();
  }

  public start(): void {
    this.basePosition = this.object.position.clone();
    this.baseRotationZ = this.object.rotation.z;
    this.shake = !prefersReducedMotion();
  }

  public update(dt: number): void {
    if (!this.basePosition) return;
    this.elapsedTime += dt;
    const k = Math.min(1, this.elapsedTime / this.duration);
    const push = this.distance * (k < 0.25 ? easeOutCubic(k / 0.25) : 1 - easeOutCubic((k - 0.25) / 0.75));
    const amp = this.shake ? this.jitter * (1 - k) : 0;
    this.object.position.copy(this.basePosition).addScaledVector(this.dir, push);
    this.object.position.x += (Math.random() * 2 - 1) * amp;
    this.object.position.y += (Math.random() * 2 - 1) * amp;
    this.object.rotation.z = this.baseRotationZ + (Math.random() * 2 - 1) * amp * 0.3;
    if (k >= 1) this.completeTask();
  }

  public finish(): void {
    if (this.basePosition) {
      this.object.position.copy(this.basePosition);
      this.object.rotation.z = this.baseRotationZ;
    }
    this.basePosition = null;
  }
}

/**
 * The attacker winding up: over `charge` seconds it swells to `peakScale` with a warm glow
 * behind it, then over `release` it snaps back as the glow fades (the scale-up is skipped under
 * reduced motion). The glow is a child of `object`, removed and the scale restored at the end.
 */
export class ChargeGlowTask extends YGOTask {
  private glow: THREE.Mesh | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private baseScale: THREE.Vector3 | null = null;
  private scaleUp = true;

  constructor(private duel: YGODuel, private object: THREE.Object3D, private size: { width: number; height: number }, private charge = 0.5, private release = 0.25, private peakScale = 1.12, private color: THREE.ColorRepresentation = 0xffc65a) {
    super();
  }

  public start(): void {
    this.baseScale = this.object.scale.clone();
    this.scaleUp = !prefersReducedMotion();
    this.material = additiveMaterial(particleTexture(this.duel, "light_01"), this.color);
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(this.size.width * 1.7, this.size.height * 1.45), this.material);
    this.glow.position.z = -0.05;
    this.glow.renderOrder = 998;
    this.object.add(this.glow);
  }

  public update(dt: number): void {
    if (!this.baseScale || !this.material) return;
    this.elapsedTime += dt;
    const t = this.elapsedTime;
    let s: number;
    if (t < this.charge) {
      const k = easeOutCubic(t / this.charge);
      s = 1 + (this.peakScale - 1) * k;
      this.material.opacity = 0.9 * k;
    } else {
      const k = Math.min(1, (t - this.charge) / this.release);
      s = this.peakScale - (this.peakScale - 1) * k;
      this.material.opacity = 0.9 * (1 - k);
      if (k >= 1) this.completeTask();
    }
    if (this.scaleUp) this.object.scale.copy(this.baseScale).multiplyScalar(s);
  }

  public finish(): void {
    if (this.baseScale) this.object.scale.copy(this.baseScale);
    if (this.glow && this.material) {
      this.object.remove(this.glow);
      this.glow.geometry.dispose();
      this.material.dispose();
    }
    this.glow = null;
    this.material = null;
    this.baseScale = null;
  }
}
