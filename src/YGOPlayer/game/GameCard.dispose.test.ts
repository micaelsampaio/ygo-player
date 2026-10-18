import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import type { Card } from "ygo-core";

// The card shaders read the shared clock uniform; the real core module pulls in the renderer.
vi.mock("../core/YGOPlayerCore", () => ({ globalUniforms: { time: { value: 0 } } }));

import { GameCard } from "./GameCard";
import { GameCardHand } from "./GameCardHand";
import { getCardDepthMaterial, getCardGeometry } from "./materials/card-mesh-resources";
import type { YGODuel } from "../core/YGODuel";

function makeCard(id: number, name = `card-${id}`): Card {
  return { id, name, originalOwner: 0, owner: 0, images: { small_url: `${name}.jpg` } } as unknown as Card;
}

function makeDuel() {
  const textures = new Map<string, THREE.Texture>();
  const getTexture = vi.fn((url: string) => {
    if (!textures.has(url)) textures.set(url, new THREE.Texture());
    return textures.get(url)!;
  });
  const duel = {
    core: { scene: new THREE.Scene() },
    assets: { getTexture },
    fields: [{ settings: { backCardPath: "back.jpg" } }, { settings: { backCardPath: "back.jpg" } }],
    settings: { getShowFaceDownCardsTransparent: () => false },
    gameController: { getComponent: () => undefined },
    destroy: vi.fn(),
  };
  return { duel: duel as unknown as YGODuel, textures, destroy: duel.destroy };
}

function faceMaterials(mesh: THREE.Object3D) {
  return (mesh as THREE.Mesh).material as THREE.Material[];
}

describe("GameCard GPU resources", () => {
  it("shares one box geometry and one edge material across cards", () => {
    const { duel } = makeDuel();
    const a = new GameCard({ duel, card: makeCard(1), stats: false });
    const b = new GameCard({ duel, card: makeCard(2), stats: false });

    expect((a.gameObject as THREE.Mesh).geometry).toBe(getCardGeometry());
    expect((b.gameObject as THREE.Mesh).geometry).toBe(getCardGeometry());
    expect(faceMaterials(a.gameObject)[0]).toBe(getCardDepthMaterial());
    expect(faceMaterials(b.gameObject)[3]).toBe(getCardDepthMaterial());
  });

  it("disposes the previous face materials on setCard, but not shared materials or cached textures", () => {
    const { duel, textures } = makeDuel();
    const card = new GameCard({ duel, card: makeCard(1), stats: false });
    const [, , , , oldFront, oldBack] = faceMaterials(card.gameObject);
    const frontDispose = vi.spyOn(oldFront, "dispose");
    const backDispose = vi.spyOn(oldBack, "dispose");
    const depthDispose = vi.spyOn(getCardDepthMaterial(), "dispose");
    const textureDisposes = [...textures.values()].map(texture => vi.spyOn(texture, "dispose"));

    card.setCard(makeCard(2));

    expect(frontDispose).toHaveBeenCalledTimes(1);
    expect(backDispose).toHaveBeenCalledTimes(1);
    expect(depthDispose).not.toHaveBeenCalled();
    textureDisposes.forEach(spy => expect(spy).not.toHaveBeenCalled());
    expect(faceMaterials(card.gameObject)[4]).not.toBe(oldFront);
  });

  it("disposes its own materials on destroy and leaves the shared geometry alone", () => {
    const { duel, destroy } = makeDuel();
    const card = new GameCard({ duel, card: makeCard(1), stats: false });
    const [, , , , front, back] = faceMaterials(card.gameObject);
    const frontDispose = vi.spyOn(front, "dispose");
    const backDispose = vi.spyOn(back, "dispose");
    const geometryDispose = vi.spyOn(getCardGeometry(), "dispose");

    card.destroy();
    card.destroy(); // a second destroy must not dispose twice

    expect(frontDispose).toHaveBeenCalledTimes(1);
    expect(backDispose).toHaveBeenCalledTimes(1);
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledWith(card);
  });
});

describe("GameCardHand GPU resources", () => {
  it("disposes the replaced face materials on setCard and all of them on destroy", () => {
    const { duel } = makeDuel();
    const hand = new GameCardHand({ duel, player: 0 });
    expect((hand.gameObject as THREE.Mesh).geometry).toBe(getCardGeometry());

    hand.setCard(makeCard(1));
    const [, , , , firstFront, firstBack] = faceMaterials(hand.gameObject);
    const firstDisposes = [vi.spyOn(firstFront, "dispose"), vi.spyOn(firstBack, "dispose")];

    hand.setCard(makeCard(2));
    firstDisposes.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));

    // Hiding swaps the front for the shared black material; destroy must still free the real front.
    const [, , , , front, back] = faceMaterials(hand.gameObject);
    hand.setIsVisible(false);
    const hidden = faceMaterials(hand.gameObject)[4];
    expect(hidden).not.toBe(front);
    const hiddenDispose = vi.spyOn(hidden, "dispose");
    const disposes = [vi.spyOn(front, "dispose"), vi.spyOn(back, "dispose")];

    hand.destroy();

    disposes.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    expect(hiddenDispose).not.toHaveBeenCalled();
  });

  it("keeps its materials when setCard gets the same card again", () => {
    const { duel } = makeDuel();
    const hand = new GameCardHand({ duel, player: 0 });
    hand.setCard(makeCard(1));
    const front = faceMaterials(hand.gameObject)[4];
    const frontDispose = vi.spyOn(front, "dispose");

    hand.setCard(makeCard(1));

    expect(frontDispose).not.toHaveBeenCalled();
    expect(faceMaterials(hand.gameObject)[4]).toBe(front);
  });
});
