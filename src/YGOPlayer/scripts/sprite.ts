import * as THREE from "three";

export function createAtlasSprite(
  duel: any,
  path: string,
  x: number,
  y: number,
  tilesX: number = 8,
  tilesY: number = 8
): THREE.Sprite {
  const baseTexture = duel.assets.getTexture(duel.createCdnUrl(path));
  const texture = baseTexture.clone();
  texture.needsUpdate = true;
  texture.repeat.set(1 / tilesX, 1 / tilesY);
  texture.offset.set(x / tilesX, 1 - (y + 1) / tilesY);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  return sprite;
}
