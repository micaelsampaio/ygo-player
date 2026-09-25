import * as THREE from "three";
import { createCardSelectionGeometry } from "./CardSelectionMesh";

/** The amber frame Assisted Mode draws around a card: the panel's
 * activatable cards and prompt candidates, and the bot's activation spotlight. */
export const HIGHLIGHT_COLOR = 0xffc93c;
export const HIGHLIGHT_CSS = `#${HIGHLIGHT_COLOR.toString(16)}`;
const FRAME_MARGIN = 0.18;
const FRAME_BORDER = 0.14;

/** A frame sized to the object's own mesh (hand and field cards differ in size). */
export function createHighlightFrame(target: THREE.Object3D, opacity = 1): THREE.Mesh {
  let width = 2.5, height = 3.5;
  const geometry = (target as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
  if (geometry) {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    width = size.x * target.scale.x;
    height = size.y * target.scale.y;
  }
  const frame = new THREE.Mesh(
    createCardSelectionGeometry(width + FRAME_MARGIN * 2, height + FRAME_MARGIN * 2, FRAME_BORDER),
    // DoubleSide: face-down set cards are flipped 180°, which would otherwise turn the frame's back to the camera.
    new THREE.MeshBasicMaterial({ color: HIGHLIGHT_COLOR, opacity, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  frame.renderOrder = 10;
  return frame;
}

const scratchPosition = new THREE.Vector3();
const scratchQuaternion = new THREE.Quaternion();

/** Moves the frame onto the target's live world transform. */
export function placeHighlightFrame(frame: THREE.Mesh, target: THREE.Object3D) {
  target.getWorldPosition(scratchPosition);
  target.getWorldQuaternion(scratchQuaternion);
  frame.position.copy(scratchPosition);
  frame.position.z += 0.06; // toward the camera, regardless of the card's own flip
  frame.quaternion.copy(scratchQuaternion);
}

export function disposeHighlightFrame(scene: THREE.Scene, frame: THREE.Mesh) {
  scene.remove(frame);
  frame.geometry.dispose();
  (frame.material as THREE.Material).dispose();
}
