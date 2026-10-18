import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { disposeEffectMesh, GameModalOverlayMesh } from "./mesh-utils";

describe("disposeEffectMesh", () => {
  it("detaches the modal and frees its material but keeps the shared unit plane", () => {
    const scene = new THREE.Scene();
    const modal = GameModalOverlayMesh();
    const other = GameModalOverlayMesh();
    scene.add(modal);
    const material = vi.spyOn(modal.material, "dispose");
    const geometry = vi.spyOn(modal.geometry, "dispose");

    disposeEffectMesh(modal);

    expect(modal.parent).toBeNull();
    expect(material).toHaveBeenCalledTimes(1);
    expect(geometry).not.toHaveBeenCalled();
    expect(other.geometry).toBe(modal.geometry);
    expect(other.material).not.toBe(modal.material);
  });

  it("frees a mesh's own geometry", () => {
    const parent = new THREE.Object3D();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshBasicMaterial());
    parent.add(mesh);
    const geometry = vi.spyOn(mesh.geometry, "dispose");

    disposeEffectMesh(mesh);

    expect(parent.children).toHaveLength(0);
    expect(geometry).toHaveBeenCalledTimes(1);
  });
});
