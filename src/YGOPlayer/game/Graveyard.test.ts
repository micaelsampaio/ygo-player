import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type { YGODuel } from "../core/YGODuel";
import { YGOTaskSequence } from "../core/components/tasks/YGOTaskSequence";
import { Graveyard } from "./Graveyard";

/** Just what a pile zone touches: the scene, the mouse events and the event bus. */
function fakeDuel() {
  const scene = new THREE.Scene();
  const registerElement = vi.fn();
  const dispatch = vi.fn();
  const duel = {
    core: { scene },
    perspective: { isPlayerPOV: (player: number) => player === 0 },
    gameController: { getComponent: () => ({ registerElement }) },
    events: { dispatch },
  } as unknown as YGODuel;
  return { duel, scene, registerElement, dispatch };
}

/** Runs a task sequence to the end, in 50 ms steps. */
function run(sequence: YGOTaskSequence) {
  sequence.start();
  for (let i = 0; i < 200 && !sequence.isCompleted(); ++i) sequence.update(0.05);
  expect(sequence.isCompleted()).toBe(true);
}

const position = new THREE.Vector3(8, -6, 0);

describe("Graveyard", () => {
  it("adds its click area to the scene and registers it for mouse events", () => {
    const { duel, scene, registerElement } = fakeDuel();
    const gy = new Graveyard({ duel, player: 0, zone: "GY", position });
    expect(scene.children).toContain(gy.gameObject);
    expect(registerElement).toHaveBeenCalledWith(gy);
    expect(gy.cardPosition.toArray()).toEqual([8, -6, 0.8]);
    expect(gy.position.toArray()).toEqual([8, -6, 0.1]);
  });

  it("is turned around on the opponent's side", () => {
    const { duel } = fakeDuel();
    expect(new Graveyard({ duel, player: 0, zone: "GY", position }).rotation.z).toBeCloseTo(0);
    expect(new Graveyard({ duel, player: 1, zone: "GY2", position }).rotation.z).toBeCloseTo(Math.PI);
  });

  it("a click opens the GY menu, or closes it when it is open", () => {
    const { duel, dispatch } = fakeDuel();
    const gy = new Graveyard({ duel, player: 0, zone: "GY", position });
    gy.onMouseClick({} as MouseEvent);
    expect(dispatch).toHaveBeenLastCalledWith("set-ui-menu", { group: "game-overlay", type: "gy", data: { graveyard: gy } });
    gy.isMenuVisible = true;
    gy.onMouseClick({} as MouseEvent);
    expect(dispatch).toHaveBeenLastCalledWith("close-ui-menu", { group: "game-overlay", type: "gy", data: { graveyard: gy } });
  });

  it("sends a card in: it shrinks onto the pile and the glow is removed", () => {
    const { duel } = fakeDuel();
    const gy = new Graveyard({ duel, player: 1, zone: "GY2", position });
    const card = new THREE.Object3D();
    card.position.set(100, 0, 0);
    card.visible = false;
    const sequence = new YGOTaskSequence();
    gy.createSendToGraveyardEffect({ card, sequence });
    expect(card.children).toHaveLength(1);

    run(sequence);

    expect(card.visible).toBe(true);
    expect(card.position.distanceTo(gy.cardPosition)).toBeLessThan(1e-6);
    expect(card.scale.toArray().map(v => +v.toFixed(3))).toEqual([0.2, 0.2, 0.2]);
    expect(card.children).toHaveLength(0);
  });

  it("brings a card out: it pops up from the pile at full size", () => {
    const { duel } = fakeDuel();
    const gy = new Graveyard({ duel, player: 0, zone: "GY", position });
    const card = new THREE.Object3D();
    card.visible = false;
    const sequence = new YGOTaskSequence();
    gy.createMoveFromGraveyardEffect({ card, sequence });

    run(sequence);

    expect(card.visible).toBe(true);
    expect(card.position.distanceTo(gy.cardPosition)).toBeLessThan(1e-6);
    expect(card.scale.toArray().map(v => +v.toFixed(3))).toEqual([1, 1, 1]);
    expect(card.children).toHaveLength(0);
  });
});
