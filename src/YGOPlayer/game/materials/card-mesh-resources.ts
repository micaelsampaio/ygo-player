import * as THREE from "three";
import { CARD_DEPTH, CARD_HEIGHT_SIZE, CARD_RATIO } from "../../constants";

// GPU resources shared by every card mesh (field cards and hand cards). They are
// created lazily once and never disposed by a card: CardZone rebuilds its GameCard on
// every zone change, so per-instance copies piled up during long replays.
// YGOPlayerCore.destroyScene may dispose them on teardown; three re-uploads a disposed
// geometry/material the next time it is rendered, so reusing them afterwards is safe.

let cardGeometry: THREE.BoxGeometry | undefined;
let cardPlaneGeometry: THREE.PlaneGeometry | undefined;
let depthMaterial: THREE.MeshBasicMaterial | undefined;
const colorMaterials = new Map<number, THREE.MeshBasicMaterial>();

/** Box used by every card mesh (width x height x depth of a card). */
export function getCardGeometry(): THREE.BoxGeometry {
  if (!cardGeometry) {
    const height = CARD_HEIGHT_SIZE, width = height / CARD_RATIO, depth = CARD_DEPTH;
    cardGeometry = new THREE.BoxGeometry(width, height, depth);
  }
  return cardGeometry;
}

/** Flat card-sized plane (used by the face-down transparent overlay). */
export function getCardPlaneGeometry(): THREE.PlaneGeometry {
  if (!cardPlaneGeometry) {
    const height = CARD_HEIGHT_SIZE, width = height / CARD_RATIO;
    cardPlaneGeometry = new THREE.PlaneGeometry(width, height);
  }
  return cardPlaneGeometry;
}

/** Grey material for the four edge faces of a card. */
export function getCardDepthMaterial(): THREE.MeshBasicMaterial {
  if (!depthMaterial) depthMaterial = new THREE.MeshBasicMaterial({ color: 0xb5b5b5 });
  return depthMaterial;
}

/** Untextured flat-colour material (placeholders before a card is set, hidden hand cards). */
export function getCardColorMaterial(color: number): THREE.MeshBasicMaterial {
  let material = colorMaterials.get(color);
  if (!material) {
    material = new THREE.MeshBasicMaterial({ color });
    colorMaterials.set(color, material);
  }
  return material;
}

/** Face order of a BoxGeometry: right, left, top, bottom (edges), front, back. */
export function buildCardFaceMaterials(front: THREE.Material, back: THREE.Material): THREE.Material[] {
  const depth = getCardDepthMaterial();
  return [depth, depth, depth, depth, front, back];
}

/** True for materials owned by this module, which a card must never dispose. */
export function isSharedCardMaterial(material: THREE.Material): boolean {
  if (material === depthMaterial) return true;
  for (const shared of colorMaterials.values()) {
    if (shared === material) return true;
  }
  return false;
}

/**
 * Dispose the per-instance materials in `materials`, skipping the shared ones.
 * Textures are not disposed: card textures come from the YGOAssets cache and are
 * reused by other cards.
 */
export function disposeCardMaterials(materials: THREE.Material | THREE.Material[] | undefined) {
  if (!materials) return;
  const list = Array.isArray(materials) ? materials : [materials];
  const seen = new Set<THREE.Material>();
  for (const material of list) {
    if (!material || seen.has(material)) continue;
    seen.add(material);
    if (isSharedCardMaterial(material)) continue;
    material.dispose();
  }
}
