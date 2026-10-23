import * as THREE from "three";
import { YGOTask } from "../../core/components/tasks/YGOTask";
import type { YGODuel } from "../../core/YGODuel";
import { CARD_DEPTH, CARD_HEIGHT_SIZE, CARD_RATIO } from "../../constants";
import { Ease } from "../../scripts/ease";
import { prefersReducedMotion } from "./battle-fx";

/** Box face order of a card mesh: right, left, top, bottom, front (+z), back (-z). */
const FRONT_FACE = 4;
const BACK_FACE = 5;

interface Shard {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  spinAxis: THREE.Vector3;
  spinSpeed: number;
}

/**
 * The card face split into jittered triangles: a cols x rows grid whose inner
 * corners are nudged, each cell cut along an alternating diagonal. Each shard's
 * geometry is centred on its own centroid (so it spins about itself) and keeps
 * the UVs of the part of the card it was cut from.
 */
function buildShardGeometries(width: number, height: number, cols: number, rows: number): { geometry: THREE.BufferGeometry; center: THREE.Vector3 }[] {
  const corners: THREE.Vector2[][] = [];
  for (let r = 0; r <= rows; r++) {
    corners.push([]);
    for (let c = 0; c <= cols; c++) {
      const inner = r > 0 && r < rows && c > 0 && c < cols;
      const jx = inner ? (Math.random() - 0.5) * 0.6 : 0;
      const jy = inner ? (Math.random() - 0.5) * 0.6 : 0;
      corners[r].push(new THREE.Vector2(((c + jx) / cols - 0.5) * width, ((r + jy) / rows - 0.5) * height));
    }
  }

  const shards: { geometry: THREE.BufferGeometry; center: THREE.Vector3 }[] = [];
  const addTriangle = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2) => {
    const cx = (a.x + b.x + c.x) / 3;
    const cy = (a.y + b.y + c.y) / 3;
    const positions = new Float32Array(9);
    const uvs = new Float32Array(6);
    [a, b, c].forEach((p, i) => {
      positions[i * 3] = p.x - cx;
      positions[i * 3 + 1] = p.y - cy;
      uvs[i * 2] = p.x / width + 0.5;
      uvs[i * 2 + 1] = p.y / height + 0.5;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    shards.push({ geometry, center: new THREE.Vector3(cx, cy, 0) });
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bl = corners[r][c], br = corners[r][c + 1], tl = corners[r + 1][c], tr = corners[r + 1][c + 1];
      // Counter-clockwise, so the shard faces +z like the card face it came from.
      if ((r + c) % 2 === 0) {
        addTriangle(bl, br, tr);
        addTriangle(bl, tr, tl);
      } else {
        addTriangle(bl, br, tl);
        addTriangle(br, tr, tl);
      }
    }
  }
  return shards;
}

/** Whether the camera sees the card's front (+z) face rather than its back. */
function frontFaceVisible(duel: YGODuel, card: THREE.Object3D): boolean {
  const camera = duel.core?.camera as THREE.Camera | undefined;
  if (!camera) return true;
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(card.getWorldQuaternion(new THREE.Quaternion()));
  const toCamera = camera.getWorldPosition(new THREE.Vector3()).sub(card.getWorldPosition(new THREE.Vector3()));
  return normal.dot(toCamera) >= 0;
}

/** A transparent copy of the face material the viewer sees (the textures stay the asset cache's). */
function shardMaterial(card: THREE.Object3D, front: boolean): THREE.Material {
  const materials = (card as THREE.Mesh).material;
  const face = Array.isArray(materials) ? materials[front ? FRONT_FACE : BACK_FACE] : materials;
  const material = face ? face.clone() : new THREE.MeshBasicMaterial({ color: 0xd8d8d8 });
  material.transparent = true;
  material.side = THREE.DoubleSide;
  material.depthWrite = false;
  material.opacity = 1;
  return material;
}

/**
 * Master Duel's destruction: the card flashes white and breaks into ~18 shards
 * that burst outward, spinning, and fade (about 0.6s). The card itself should be
 * hidden by the caller once this starts; the shards copy its world transform and
 * the face the camera sees. Under reduced motion the shards only fade in place.
 * Every mesh/material it makes is removed and disposed when it ends (also when
 * fast-forwarded by a skip).
 */
export class CardShatterTask extends YGOTask {
  private root: THREE.Object3D | null = null;
  private shards: Shard[] = [];
  private material: THREE.Material | null = null;
  private flash: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private readonly duration: number;
  private readonly crack = 0.06;
  private readonly flashDuration = 0.2;
  private readonly still: boolean;

  constructor(private duel: YGODuel, private card: THREE.Object3D, duration = 0.6) {
    super();
    this.still = prefersReducedMotion();
    this.duration = this.still ? Math.min(duration, 0.3) : duration;
  }

  public start(): void {
    const { card, duel } = this;
    card.updateWorldMatrix(true, false);
    const front = frontFaceVisible(duel, card);

    const root = new THREE.Object3D();
    card.matrixWorld.decompose(root.position, root.quaternion, root.scale);
    // A face root whose +z points at the viewer: the back face is the front one turned around y.
    const face = new THREE.Object3D();
    face.position.z = front ? CARD_DEPTH / 2 + 0.01 : -CARD_DEPTH / 2 - 0.01;
    if (!front) face.rotation.y = Math.PI;
    root.add(face);

    const height = CARD_HEIGHT_SIZE;
    const width = height / CARD_RATIO;
    this.material = shardMaterial(card, front);

    for (const { geometry, center } of buildShardGeometries(width, height, 3, 3)) {
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.position.copy(center);
      mesh.renderOrder = 10;
      face.add(mesh);
      const out = new THREE.Vector2(center.x / width, center.y / height);
      if (out.lengthSq() < 1e-4) out.set(Math.random() - 0.5, Math.random() - 0.5);
      out.normalize();
      const speed = 5 + Math.random() * 6;
      this.shards.push({
        mesh,
        velocity: new THREE.Vector3(out.x * speed + (Math.random() - 0.5) * 2, out.y * speed + (Math.random() - 0.5) * 2, 3 + Math.random() * 5),
        spinAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        spinSpeed: 8 + Math.random() * 10,
      });
    }

    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.still ? 0.6 : 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(width, height), flashMaterial);
    this.flash.position.z = 0.02;
    this.flash.renderOrder = 11;
    face.add(this.flash);

    this.root = root;
    duel.core.scene.add(root);
  }

  public update(dt: number): void {
    if (!this.root) return this.completeTask();
    this.elapsedTime += dt;
    const t = this.elapsedTime;

    if (this.flash) {
      const k = Math.min(1, t / this.flashDuration);
      this.flash.material.opacity = (this.still ? 0.6 : 1) * (1 - Ease.easeOutQuad(k));
      const s = 1 + 0.15 * k;
      this.flash.scale.set(s, s, 1);
    }

    if (!this.still && t > this.crack) {
      const step = Math.min(dt, t - this.crack);
      const drag = Math.max(0, 1 - 2.5 * step);
      for (const shard of this.shards) {
        shard.mesh.position.addScaledVector(shard.velocity, step);
        shard.velocity.multiplyScalar(drag);
        shard.mesh.rotateOnAxis(shard.spinAxis, shard.spinSpeed * step);
      }
    }

    // Opaque through the crack and the first of the burst, then fading out.
    const fadeStart = this.still ? 0 : this.duration * 0.3;
    if (this.material && t > fadeStart) {
      this.material.opacity = 1 - Ease.easeInQuad(Math.min(1, (t - fadeStart) / (this.duration - fadeStart)));
    }

    if (t >= this.duration) {
      this.dispose();
      this.completeTask();
    }
  }

  public finish(): void {
    this.dispose();
  }

  private dispose(): void {
    if (!this.root) return;
    this.duel.core.scene.remove(this.root);
    for (const shard of this.shards) shard.mesh.geometry.dispose();
    this.material?.dispose();
    if (this.flash) {
      this.flash.geometry.dispose();
      this.flash.material.dispose();
    }
    this.root = null;
    this.shards = [];
    this.material = null;
    this.flash = null;
  }
}
