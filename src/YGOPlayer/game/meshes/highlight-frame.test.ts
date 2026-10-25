import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createHighlightFrame, followHighlightTarget, isOnBoard, placeHighlightFrame } from "./highlight-frame";

const REACH = 0.55;

function card(width = 2.6, height = 3.75) {
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.02));
  scene.add(mesh);
  return { scene, mesh };
}

/** The frame's world-space size (its geometry times its world scale), minus the glow's reach. */
function frameCardSize(frame: THREE.Mesh) {
  frame.updateMatrixWorld(true);
  const geometry = frame.geometry as THREE.PlaneGeometry;
  const scale = frame.getWorldScale(new THREE.Vector3());
  return { width: geometry.parameters.width * scale.x - REACH * 2, height: geometry.parameters.height * scale.y - REACH * 2 };
}

// The renderer calls this right before drawing the frame (the frame ignores its arguments).
const render = (frame: THREE.Mesh) => (frame.onBeforeRender as () => void)();

describe("highlight frame", () => {
  it("matches the card's size when the card's scale changes after the frame was built (pulse, drag lift)", () => {
    const { mesh } = card();
    const frame = createHighlightFrame(mesh);
    mesh.scale.setScalar(1.12); // mid-pulse
    placeHighlightFrame(frame, mesh);
    expect(frameCardSize(frame).width).toBeCloseTo(2.6 * 1.12, 5);
    expect(frameCardSize(frame).height).toBeCloseTo(3.75 * 1.12, 5);
    const half = (frame.material as THREE.ShaderMaterial).uniforms.uHalf.value as THREE.Vector2;
    expect(half.x).toBeCloseTo(1.3 * 1.12, 5);

    mesh.scale.setScalar(1); // the pulse ended
    placeHighlightFrame(frame, mesh);
    expect(frameCardSize(frame).width).toBeCloseTo(2.6, 5);
    expect(half.y).toBeCloseTo(3.75 / 2, 5);
  });

  it("a frame built on an enlarged card shrinks back with it", () => {
    const { mesh } = card();
    mesh.scale.setScalar(1.08); // created while the card was lifted by a drag
    const frame = createHighlightFrame(mesh);
    mesh.scale.setScalar(0.98); // back in a compressed hand
    placeHighlightFrame(frame, mesh);
    expect(frameCardSize(frame).width).toBeCloseTo(2.6 * 0.98, 5);
  });

  it("a followed frame is glued to the card on render: same place and rotation as the card right now", () => {
    const { scene, mesh } = card();
    const frame = createHighlightFrame(mesh);
    scene.add(frame);
    followHighlightTarget(frame, mesh);
    placeHighlightFrame(frame, mesh);
    // The card moves between the caller's ticks (hover lift, drag, slide back).
    mesh.position.set(4, -11.7, 6);
    mesh.rotation.set(-0.22, 0, 0.1);
    scene.updateMatrixWorld();
    render(frame);
    const framePos = new THREE.Vector3().setFromMatrixPosition(frame.matrixWorld);
    expect(framePos.x).toBeCloseTo(4, 6);
    expect(framePos.y).toBeCloseTo(-11.7, 6);
    expect(framePos.z).toBeCloseTo(6.06, 6);
    const q = new THREE.Quaternion();
    frame.matrixWorld.decompose(new THREE.Vector3(), q, new THREE.Vector3());
    expect(q.angleTo(mesh.quaternion)).toBeLessThan(1e-6);
    expect(frame.frustumCulled).toBe(false);
  });

  it("isOnBoard: false once the card is out of the scene or hidden", () => {
    const { scene, mesh } = card();
    expect(isOnBoard(mesh)).toBe(true);
    mesh.visible = false;
    expect(isOnBoard(mesh)).toBe(false);
    mesh.visible = true;
    scene.remove(mesh);
    expect(isOnBoard(mesh)).toBe(false);
  });
});
