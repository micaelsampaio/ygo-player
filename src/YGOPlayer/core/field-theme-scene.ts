/**
 * The scene side of the field themes (field-themes.ts): recolouring a table
 * model's palette texture.
 */
import * as THREE from "three";
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
