import * as THREE from "three";

/** The amber frame Assisted Mode draws around a card: the panel's
 * activatable cards and prompt candidates, and the bot's activation spotlight. */
export const HIGHLIGHT_COLOR = 0xffc93c;
export const HIGHLIGHT_CSS = `#${HIGHLIGHT_COLOR.toString(16)}`;
/** Assisted Mode's second frame: Spell Speed 2+ — a quick effect, a Quick-Play
 * Spell, a Trap, a trigger or chain response — usable in response, not only
 * on your own open game state (amber). */
export const QUICK_COLOR = 0x4f8cff;
export const QUICK_CSS = `#${QUICK_COLOR.toString(16)}`;
/** Assisted Mode's third frame: a card to pick for the effect being resolved (a cost, a target,
 * a discard) — green, so a choice never looks like "you can activate this" (amber). */
export const PICK_COLOR = 0x34d399;
export const PICK_CSS = `#${PICK_COLOR.toString(16)}`;
/** How far the soft glow reaches past the card's edge. */
const GLOW_REACH = 0.55;
const CORNER_RADIUS = 0.12;

const vertexShader = /* glsl */ `
varying vec2 vPos;
uniform vec2 uHalf;
uniform float uReach;
void main() {
  vPos = (uv - 0.5) * 2.0 * (uHalf + uReach);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// A thin bright line just outside the card's rounded edge, a soft glow
// fading outwards, nothing over the card itself. The line is pushed past 1.0
// so the fields with bloom (Holo Arena, Coliseum) make it glow for real.
const fragmentShader = /* glsl */ `
varying vec2 vPos;
uniform vec2 uHalf;
uniform float uRadius;
uniform vec3 uColor;
uniform float uOpacity;
float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  float d = roundedBox(vPos, uHalf, uRadius);
  float line = 1.0 - smoothstep(0.018, 0.05, abs(d - 0.035));
  float glow = d > 0.0 ? exp(-d * 7.0) * 0.6 : exp(d * 30.0) * 0.25;
  float alpha = max(line, glow) * uOpacity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor * (1.0 + line * 0.9), alpha);
  #include <colorspace_fragment>
}`;

const DEFAULT_SIZE = new THREE.Vector2(2.5, 3.5);
const scratchScale = new THREE.Vector3();
const scratchSize = new THREE.Vector3();

/** The target's size on the board right now: its mesh times its live world scale. */
function targetSize(target: THREE.Object3D, out: THREE.Vector2): THREE.Vector2 {
  const geometry = (target as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
  if (!geometry) return out.copy(DEFAULT_SIZE);
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  geometry.boundingBox!.getSize(scratchSize);
  // World scale: a hand card's size also comes from the hand it sits in.
  target.getWorldScale(scratchScale);
  return out.set(scratchSize.x * Math.abs(scratchScale.x), scratchSize.y * Math.abs(scratchScale.y));
}

interface FrameData {
  /** The card size the frame's geometry was built for. */
  builtSize: THREE.Vector2;
  /** The object the frame follows on every render (followHighlightTarget), if any. */
  follow?: THREE.Object3D;
}

const frameData = (frame: THREE.Mesh): FrameData | undefined => frame.userData.highlightFrame as FrameData | undefined;

/** A frame sized to the object's own mesh (hand and field cards differ in size). */
export function createHighlightFrame(target: THREE.Object3D, opacity = 1, color = HIGHLIGHT_COLOR): THREE.Mesh {
  const { x: width, y: height } = targetSize(target, new THREE.Vector2());
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uHalf: { value: new THREE.Vector2(width / 2, height / 2) },
      uReach: { value: GLOW_REACH },
      uRadius: { value: CORNER_RADIUS },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    transparent: true,
    // No depth test: a highlight is drawn over whatever a field theme puts
    // in front of the cards (Holo Arena's glass hid it completely).
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.opacity = opacity;
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(width + GLOW_REACH * 2, height + GLOW_REACH * 2), material);
  // Callers pulse `material.opacity` (the Material API): the shader reads it here.
  const data: FrameData = { builtSize: new THREE.Vector2(width, height) };
  frame.userData.highlightFrame = data;
  frame.onBeforeRender = () => {
    material.uniforms.uOpacity.value = material.opacity;
    // Glued to its card on every rendered frame, not only on the caller's tick: a hover lift, a
    // drag, its slide back or a double-click pulse never shows the frame a step behind the card.
    // (modelViewMatrix is computed from matrixWorld right after this hook.)
    const target = data.follow;
    if (target) {
      placeHighlightFrame(frame, target);
      frame.updateMatrixWorld(true);
    }
  };
  frame.renderOrder = 10;
  return frame;
}

/**
 * The frame follows `target` on every render (placeHighlightFrame from its onBeforeRender), on
 * top of the caller's own placement. For frames at the scene root (not chain-fx's rim, a child of
 * its card).
 */
export function followHighlightTarget(frame: THREE.Mesh, target: THREE.Object3D) {
  const data = frameData(frame);
  if (!data) return;
  data.follow = target;
  // Its last matrix may be anywhere (a card dragged off screen): never culled on that.
  frame.frustumCulled = false;
}

/** Whether the object is still on the board (in a scene, and shown) — a frame on it may show. */
export function isOnBoard(target: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = target;
  while (node) {
    if (!node.visible) return false;
    if ((node as THREE.Scene).isScene) return true;
    node = node.parent;
  }
  return false;
}

const scratchPosition = new THREE.Vector3();
const scratchQuaternion = new THREE.Quaternion();

const scratchLiveSize = new THREE.Vector2();

/**
 * Moves the frame onto the target's live world transform — position, rotation AND size: the frame
 * was built for the card's size when it was created, and a card's scale changes afterwards (the
 * hand's layout, a drag's lift, a double-click pulse), so the frame is rescaled to match.
 */
export function placeHighlightFrame(frame: THREE.Mesh, target: THREE.Object3D) {
  target.getWorldPosition(scratchPosition);
  target.getWorldQuaternion(scratchQuaternion);
  frame.position.copy(scratchPosition);
  frame.position.z += 0.06; // toward the camera, regardless of the card's own flip
  frame.quaternion.copy(scratchQuaternion);
  const data = frameData(frame);
  const material = frame.material as THREE.ShaderMaterial;
  const half = material.uniforms?.uHalf?.value as THREE.Vector2 | undefined;
  if (!data || !half) return;
  const { x: width, y: height } = targetSize(target, scratchLiveSize);
  half.set(width / 2, height / 2);
  // The geometry is (built + 2 reach); the glow's reach stays the same in world units.
  frame.scale.set(
    (width + GLOW_REACH * 2) / (data.builtSize.x + GLOW_REACH * 2),
    (height + GLOW_REACH * 2) / (data.builtSize.y + GLOW_REACH * 2),
    1,
  );
}

export function disposeHighlightFrame(scene: THREE.Scene, frame: THREE.Mesh) {
  scene.remove(frame);
  frame.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
}
