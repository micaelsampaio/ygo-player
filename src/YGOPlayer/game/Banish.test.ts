import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type { YGODuel } from "../core/YGODuel";
import { YGOTaskSequence } from "../core/components/tasks/YGOTaskSequence";
import { Banish } from "./Banish";

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

const position = new THREE.Vector3(8, -2, 0);
const zDeg = (card: THREE.Object3D) => Math.round(THREE.MathUtils.radToDeg(card.rotation.z));

describe("Banish", () => {
  it("adds its click area to the scene and registers it for mouse events", () => {
    const { duel, scene, registerElement } = fakeDuel();
    const banish = new Banish({ duel, player: 0, zone: "B", position });
    expect(scene.children).toContain(banish.gameObject);
    expect(registerElement).toHaveBeenCalledWith(banish);
    expect(banish.cardPosition.toArray()).toEqual([8, -2, 0.8]);
    expect(banish.isMenuVisible).toBe(false);
  });

  it("a click opens the banished-cards menu, or closes it when it is open", () => {
    const { duel, dispatch } = fakeDuel();
    const banish = new Banish({ duel, player: 0, zone: "B", position });
    banish.onMouseClick({} as MouseEvent);
    expect(dispatch).toHaveBeenLastCalledWith("set-ui-menu", { group: "game-overlay", type: "banish", data: { banish } });
    banish.isMenuVisible = true;
    banish.onMouseClick({} as MouseEvent);
    expect(dispatch).toHaveBeenLastCalledWith("close-ui-menu", { group: "game-overlay", type: "banish", data: { banish } });
  });

  it("shows the hover highlight only while hovered", () => {
    const { duel } = fakeDuel();
    const banish = new Banish({ duel, player: 0, zone: "B", position });
    banish.hoverObject = new THREE.Object3D();
    banish.onMouseEnter();
    expect(banish.hoverObject.visible).toBe(true);
    banish.onMouseLeave();
    expect(banish.hoverObject.visible).toBe(false);
  });

  it("banishes a card: it shrinks onto the pile and the glow is removed", () => {
    const { duel } = fakeDuel();
    const banish = new Banish({ duel, player: 0, zone: "B", position });
    const card = new THREE.Object3D();
    card.position.copy(banish.cardPosition).add(new THREE.Vector3(1, 0, 0));
    const sequence = new YGOTaskSequence();
    banish.createBanishCardEffect({ card, sequence });
    expect(card.children).toHaveLength(1);

    run(sequence);

    expect(card.position.distanceTo(banish.cardPosition)).toBeLessThan(1e-6);
    expect(card.scale.toArray().map(v => +v.toFixed(3))).toEqual([0.2, 0.2, 0.2]);
    expect(card.children).toHaveLength(0);
  });

  it("brings a card out lying sideways, turned around on the opponent's side", () => {
    const { duel } = fakeDuel();
    for (const [player, expected] of [[0, 90], [1, 270]] as const) {
      const banish = new Banish({ duel, player, zone: player === 0 ? "B" : "B2", position });
      const card = new THREE.Object3D();
      const sequence = new YGOTaskSequence();
      banish.createMoveFromBanishCardEffect({ card, sequence });

      run(sequence);

      expect(card.visible).toBe(true);
      expect(card.position.distanceTo(banish.cardPosition)).toBeLessThan(1e-6);
      expect(card.scale.toArray().map(v => +v.toFixed(3))).toEqual([1, 1, 1]);
      expect(zDeg(card)).toBe(expected);
      expect(card.children).toHaveLength(0);
    }
  });
});
