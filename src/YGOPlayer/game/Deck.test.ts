import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type { YGODuel } from "../core/YGODuel";
import { YGOTaskSequence } from "../core/components/tasks/YGOTaskSequence";
import { Deck } from "./Deck";

/** What the Deck touches: the scene, textures, mouse events, actions and the core field. */
function fakeDuel({ deckSize = 40, autoChangePlayer = false } = {}) {
  const scene = new THREE.Scene();
  const registerElement = vi.fn();
  const setAction = vi.fn();
  const setActivePlayer = vi.fn();
  const duel = {
    core: { scene },
    assets: { getTexture: () => new THREE.Texture() },
    perspective: { isPlayerPOV: (player: number) => player === 0 },
    gameController: { getComponent: () => ({ registerElement }) },
    actionManager: { setAction },
    config: { autoChangePlayer },
    setActivePlayer,
    ygo: { getField: () => ({ mainDeck: new Array(deckSize) }) },
  } as unknown as YGODuel;
  return { duel, scene, registerElement, setAction, setActivePlayer };
}

const position = new THREE.Vector3(-8, -6, 0);
const newDeck = (duel: YGODuel, player = 0) => new Deck({ duel, player, zone: player === 0 ? "D" : "D2", position, backCardPath: "back.png" });

describe("Deck", () => {
  it("builds a 60-card pile on top of its click area", () => {
    const { duel, scene, registerElement } = fakeDuel();
    const deck = newDeck(duel);
    expect(scene.children).toContain(deck.gameObject);
    expect(scene.children).toHaveLength(61);
    expect(registerElement).toHaveBeenCalledWith(deck);
    expect(deck.getDeckSize()).toBe(60);
  });

  it("shows as many cards as the core deck holds", () => {
    const { duel } = fakeDuel({ deckSize: 33 });
    const deck = newDeck(duel);
    deck.updateDeck();
    expect(deck.getDeckSize()).toBe(33);
    deck.updateDeck(5);
    expect(deck.getDeckSize()).toBe(5);
  });

  it("the top card is the transform to draw from; an empty deck falls back to the pile itself", () => {
    const { duel } = fakeDuel({ deckSize: 0 });
    const deck = newDeck(duel);
    deck.updateDeck(3);
    const top = deck.getCardTransform();
    expect(top).not.toBe(deck.gameObject);
    expect(top.position.z).toBeCloseTo(2 * 0.02);

    deck.updateDeck();
    expect(deck.getDeckSize()).toBe(0);
    expect(deck.getCardTransform()).toBe(deck.gameObject);
  });

  it("turns the opponent's cards around", () => {
    const { duel } = fakeDuel();
    const own = newDeck(duel, 0).getCardTransform();
    const opponent = newDeck(duel, 1).getCardTransform();
    expect(Math.round(THREE.MathUtils.radToDeg(own.rotation.z))).toBe(-15);
    // The opponent's cards are the same pile turned half around its own Z axis.
    const halfTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
    expect(opponent.quaternion.angleTo(own.quaternion.clone().multiply(halfTurn))).toBeLessThan(1e-6);
  });

  it("a click opens the deck menu, switching the active player when configured to", () => {
    const { duel, setAction, setActivePlayer } = fakeDuel({ autoChangePlayer: true });
    const deck = newDeck(duel, 1);
    const event = {} as MouseEvent;
    deck.onMouseClick(event);
    expect(setActivePlayer).toHaveBeenCalledWith(1);
    const action = setAction.mock.calls[0][0];
    expect(action.eventType).toBe("deck-menu");
    expect(action.eventData).toEqual({ duel, deck, mouseEvent: event });
  });

  it("ignores the mouse when the player can't control it", () => {
    const { duel, setAction } = fakeDuel();
    const deck = newDeck(duel);
    deck.canInteract = false;
    deck.onMouseClick({} as MouseEvent);
    deck.onMouseEnter();
    expect(setAction).not.toHaveBeenCalled();
    expect(deck.gameObject.children[0].visible).toBe(false);

    deck.canInteract = true;
    deck.onMouseEnter();
    expect(deck.gameObject.children[0].visible).toBe(true);
    deck.onMouseLeave();
    expect(deck.gameObject.children[0].visible).toBe(false);
  });

  it("a shuffle moves the cards out and back to where they were", () => {
    const { duel } = fakeDuel();
    const deck = newDeck(duel);
    deck.updateDeck(10);
    const before = deck.getCardTransform().position.clone();
    const sequence = deck.createShuffleAnimation({ sequence: new YGOTaskSequence() });

    sequence.start();
    for (let i = 0; i < 100 && !sequence.isCompleted(); ++i) sequence.update(0.05);

    expect(sequence.isCompleted()).toBe(true);
    expect(deck.getCardTransform().position.distanceTo(before)).toBeLessThan(1e-6);
  });

  it("an empty deck has nothing to shuffle", () => {
    const { duel } = fakeDuel({ deckSize: 0 });
    const deck = newDeck(duel);
    deck.updateDeck();
    const sequence = new YGOTaskSequence();
    const add = vi.spyOn(sequence, "add");
    expect(deck.createShuffleAnimation({ sequence })).toBe(sequence);
    expect(add).not.toHaveBeenCalled();
  });
});
