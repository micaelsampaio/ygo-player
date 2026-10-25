import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { YGODuelEvents } from "ygo-core";
import type { YGOTask } from "../../core/components/tasks/YGOTask";

vi.mock("../../game/GameCardHand", async () => {
  const THREE = await import("three");
  return {
    GameCardHand: class {
      gameObject = new THREE.Object3D();
      card: unknown;
      // GameCardHand's `position` is its rest place in the hand: a copy, not the object's position.
      position = new THREE.Vector3();
      setCard(card: unknown) {
        this.card = card;
      }
    },
  };
});
vi.mock("../../scripts/ygo-utils", () => ({ randomIntFromInterval: () => 1 }));

import { StartHandEventHandler } from "./start-hand-event";

type Props = ConstructorParameters<typeof StartHandEventHandler>[0];

function setup(cardIds: number[], { player = 0, playerPOV = true } = {}) {
  const tasks: YGOTask[] = [];
  const deckTransform = { position: new THREE.Vector3(8, -6, 0), rotation: new THREE.Euler(0, Math.PI, 0) };
  const fields = [0, 1].map(() => ({
    mainDeck: { getDeckSize: () => 40, updateDeck: vi.fn(), getCardTransform: () => deckTransform },
    hand: {
      cards: [] as { card: unknown; gameObject: THREE.Object3D }[],
      getCardsTransforms: (n: number) => Array.from({ length: n }, (_, i) => ({ position: new THREE.Vector3(i, -8, 1) })),
      getCardsRotation: () => new THREE.Vector3(0.5, 0, 0),
    },
  }));
  const props = {
    duel: {
      fields,
      perspective: { isPlayerPOV: () => playerPOV },
      createCdnUrl: (s: string) => s,
      ygo: { state: { getCardData: (id: number) => ({ id }) } },
    },
    ygo: {},
    event: { type: YGODuelEvents.LogType.StartHand, player, commandId: 1, core: true, cards: cardIds.map((id) => ({ id, zone: "D" })) },
    onCompleted: vi.fn(),
    playSound: vi.fn(),
    startTask: (task: YGOTask) => {
      task.start();
      tasks.push(task);
    },
  } as unknown as Props; // a stub duel with only what dealing a hand reads
  const run = () => {
    for (let i = 0; i < 200 && tasks.some((t) => !t.isCompleted()); i++) {
      for (const t of [...tasks]) if (!t.isCompleted()) t.update(0.05);
    }
  };
  return { props, fields, tasks, run };
}

describe("StartHandEventHandler", () => {
  it("deals each card from the deck to its hand slot and completes once all have landed", () => {
    const s = setup([11, 12, 13]);
    new StartHandEventHandler(s.props).start();

    const { hand, mainDeck } = s.fields[0];
    expect(mainDeck.updateDeck).toHaveBeenCalledWith(37);
    expect(hand.cards.map((c) => c.gameObject.position.toArray())).toEqual([[8, -6, 0], [8, -6, 0], [8, -6, 0]]);
    expect(s.props.onCompleted).not.toHaveBeenCalled();
    s.run();

    expect(hand.cards.map((c) => c.card)).toEqual([{ id: 11 }, { id: 12 }, { id: 13 }]);
    expect(hand.cards.map((c) => c.gameObject.position.toArray())).toEqual([[0, -8, 1], [1, -8, 1], [2, -8, 1]]);
    expect(hand.cards.every((c) => Math.abs(c.gameObject.rotation.x - 0.5) < 1e-6)).toBe(true);
    expect(s.props.playSound).toHaveBeenCalledTimes(3);
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("deals the opponent's hand in reverse order when viewed from the other side", () => {
    const s = setup([11, 12], { player: 1, playerPOV: false });
    new StartHandEventHandler(s.props).start();
    s.run();

    expect(s.fields[1].hand.cards.map((c) => c.card)).toEqual([{ id: 12 }, { id: 11 }]);
    expect(s.fields[0].hand.cards).toHaveLength(0);
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("completes after a short wait for an empty hand", () => {
    const s = setup([]);
    new StartHandEventHandler(s.props).start();
    expect(s.props.onCompleted).not.toHaveBeenCalled();
    s.run();

    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });
});
