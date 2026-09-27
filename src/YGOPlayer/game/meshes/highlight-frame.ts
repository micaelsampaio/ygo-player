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

/** A frame sized to the object's own mesh (hand and field cards differ in size). */
export function createHighlightFrame(target: THREE.Object3D, opacity = 1, color = HIGHLIGHT_COLOR): THREE.Mesh {
  let width = 2.5, height = 3.5;
  const geometry = (target as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
  if (geometry) {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    // World scale: a hand card's size also comes from the hand it sits in.
    const scale = target.getWorldScale(new THREE.Vector3());
    width = size.x * scale.x;
    height = size.y * scale.y;
  }
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
  frame.onBeforeRender = () => { material.uniforms.uOpacity.value = material.opacity; };
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
  frame.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
}
