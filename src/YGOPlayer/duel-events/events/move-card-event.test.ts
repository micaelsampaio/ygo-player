import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { YGODuelEvents } from "ygo-core";
import type { YGOTask } from "../../core/components/tasks/YGOTask";

type ZoneKey = { zone: string; player: number; zoneIndex: number };

const h = vi.hoisted(() => ({
  zones: new Map<string, unknown>(),
  created: [] as { cardReference: unknown }[],
}));

vi.mock("../../game/GameCard", async () => {
  const THREE = await import("three");
  return {
    GameCard: class {
      gameObject = new THREE.Object3D();
      cardReference: unknown;
      hideCardStats = vi.fn();
      destroy = vi.fn();
      constructor(args: { card: unknown }) {
        this.cardReference = args.card;
        h.created.push(this);
      }
    },
  };
});
vi.mock("../../scripts/ygo-utils", async () => {
  const THREE = await import("three");
  return {
    getGameZone: (_duel: unknown, z: ZoneKey) => h.zones.get(`${z.zone}:${z.player}:${z.zoneIndex}`),
    getZonePositionFromZoneData: (_duel: unknown, z: ZoneKey) => new THREE.Vector3(z.zoneIndex, z.player === 0 ? -4 : 4, 0),
    getCardRotationFromFieldZoneData: (_duel: unknown, _card: unknown, z: ZoneKey) => new THREE.Euler(0, 0, z.player === 0 ? 0 : Math.PI),
    getCardPositionInFrontOfCamera: () => new THREE.Vector3(0, 0, 6),
    createOffsetPositionInMultipleEvents: (_d: unknown, _p: unknown, _i: unknown, end: THREE.Vector3) => end.clone(),
    randomIntFromInterval: () => 2,
  };
});

import { MoveCardEventHandler, exactLandedZone } from "./move-card-event";

type Props = ConstructorParameters<typeof MoveCardEventHandler>[0];

function boardCard(id: number, position: THREE.Vector3) {
  const gameObject = new THREE.Object3D();
  gameObject.position.copy(position);
  return { gameObject, cardReference: { id }, hideCardStats: vi.fn(), destroy: vi.fn() };
}

function boardZone(key: string, card: unknown) {
  const zone = { scale: new THREE.Vector3(1, 1, 1), getGameCard: () => card, removeCard: vi.fn(), setGameCard: vi.fn() };
  h.zones.set(key, zone);
  return zone;
}

function pile() {
  return {
    createSendToGraveyardEffect: vi.fn(),
    createMoveFromGraveyardEffect: vi.fn(),
    createBanishCardEffect: vi.fn(),
    createMoveFromBanishCardEffect: vi.fn(),
  };
}

function setup(event: Props["event"]) {
  h.zones.clear();
  h.created.length = 0;
  const tasks: YGOTask[] = [];
  const fields = [0, 1].map(() => ({ graveyard: pile(), banishedZone: pile(), hand: { removeCardFromCardReference: vi.fn() } }));
  const duel = {
    fields,
    settings: { getConfigFromPath: () => false },
    gameActions: { setSelectedCard: vi.fn() },
    events: { dispatch: vi.fn() },
    updateHand: vi.fn(),
    updateExtraDeck: vi.fn(),
    renderField: vi.fn(),
    createCdnUrl: (s: string) => s,
    ygo: { state: { getCardData: (id: number) => ({ id, owner: 0, originalOwner: 0 }) } },
  };
  const props = {
    duel,
    ygo: { state: { getCardById: (id: number) => ({ id, owner: 0, originalOwner: 0 }) } },
    event,
    onCompleted: vi.fn(),
    playSound: vi.fn(),
    startTask: (task: YGOTask) => {
      task.start();
      tasks.push(task);
    },
  } as unknown as Props; // a stub duel with only what a board-to-board move reads
  const run = () => {
    for (let i = 0; i < 400 && tasks.some((t) => !t.isCompleted()); i++) {
      for (const t of [...tasks]) if (!t.isCompleted()) t.update(0.05);
    }
  };
  return { props, duel, fields, tasks, run };
}

describe("MoveCardEventHandler", () => {
  it("moves a card from one board zone to another and hands it to the new zone", () => {
    const s = setup({ type: YGODuelEvents.LogType.MoveCard, player: 1, id: 3, originZone: "M2-1", zone: "S2-2" });
    const card = boardCard(3, new THREE.Vector3(1, 4, 0));
    const origin = boardZone("M:1:1", card);
    const target = boardZone("S:1:2", null);

    new MoveCardEventHandler(s.props).start();
    expect(origin.removeCard).toHaveBeenCalledTimes(1);
    expect(card.hideCardStats).toHaveBeenCalled();
    expect(s.props.onCompleted).not.toHaveBeenCalled();
    s.run();

    expect(target.setGameCard).toHaveBeenCalledWith(card);
    expect(card.gameObject.position.toArray()).toEqual([2, 4, 0]);
    expect(card.gameObject.rotation.z).toBeCloseTo(Math.PI);
    expect(card.destroy).not.toHaveBeenCalled();
    expect(s.duel.updateHand).toHaveBeenCalledWith(1);
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("plays a batch move as one move per card and completes once, after the last one", () => {
    const s = setup({
      type: YGODuelEvents.LogType.Banish,
      player: 0,
      ids: [
        { id: 1, originZone: "M-1", zone: "B", owner: 0 },
        { id: 2, originZone: "M-2", zone: "B2", owner: 1 },
      ],
    });
    const first = boardCard(1, new THREE.Vector3(1, -4, 0));
    const second = boardCard(2, new THREE.Vector3(2, -4, 0));
    const firstZone = boardZone("M:0:1", first);
    const secondZone = boardZone("M:0:2", second);

    new MoveCardEventHandler(s.props).start();
    s.run();

    expect(firstZone.removeCard).toHaveBeenCalledTimes(1);
    expect(secondZone.removeCard).toHaveBeenCalledTimes(1);
    // Each card goes to its own owner's banished pile, which keeps no game card.
    expect(s.fields[0].banishedZone.createBanishCardEffect).toHaveBeenCalledWith(expect.objectContaining({ card: first.gameObject }));
    expect(s.fields[1].banishedZone.createBanishCardEffect).toHaveBeenCalledWith(expect.objectContaining({ card: second.gameObject }));
    expect(first.destroy).toHaveBeenCalledTimes(1);
    expect(second.destroy).toHaveBeenCalledTimes(1);
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("completes without animating when the card is not in the duel state", () => {
    const s = setup({ type: YGODuelEvents.LogType.MoveCard, player: 0, id: 0, originZone: "M-1", zone: "M-2" });

    new MoveCardEventHandler(s.props).start();

    expect(s.tasks).toHaveLength(0);
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });
});

describe("exactLandedZone", () => {
  const card = (id: number) => ({ id });
  const fields = [
    { hand: [card(1), card(2), card(1)], banishedZone: [card(5), card(6)] },
    { hand: [card(7)], banishedZone: [] },
  ] as unknown as import("ygo-core").PlayerField[];

  it("a hand without a slot is the card's last copy there (the core appends)", () => {
    expect(exactLandedZone(fields, 1, "H")).toBe("H-3");
    expect(exactLandedZone(fields, 7, "H2")).toBe("H2-1");
  });
  it("a banished zone without a slot is the top copy (the core puts it on top)", () => {
    expect(exactLandedZone(fields, 6, "B")).toBe("B-2");
    expect(exactLandedZone(fields, 5, "B")).toBe("B-1");
  });
  it("keeps any other zone, a zone with a slot, or a card it can't find", () => {
    expect(exactLandedZone(fields, 1, "H-1")).toBe("H-1");
    expect(exactLandedZone(fields, 1, "M-1")).toBe("M-1");
    expect(exactLandedZone(fields, 1, "GY")).toBe("GY");
    expect(exactLandedZone(fields, 99, "H")).toBe("H");
    expect(exactLandedZone(fields, 1, "B2")).toBe("B2");
    expect(exactLandedZone(undefined, 1, "H")).toBe("H");
  });
});

// F5: bot/board-challenge server commands move cards to "H2"/"B" (no slot).
// The log keeps that zone; getCardById("H2") threw inside the core's own exec,
// the controller skipped the command half-done, and the live board drifted.
describe("MoveCardEventHandler — a destination without a slot (real core)", () => {
  const monster = (id: number) => ({
    id, name: `Monster ${id}`, typeline: ["Warrior"], type: "Normal Monster", frameType: "normal",
    desc: "", race: "Warrior", atk: 1000, def: 1000, level: 4, attribute: "EARTH",
  });

  async function coreWithLogs() {
    const { YGOCore } = await vi.importActual<typeof import("ygo-core")>("ygo-core");
    const deck = [101, 102, 103, 104, 105, 106, 107, 108].map(monster);
    const core = new YGOCore({
      players: [
        { name: "human", mainDeck: deck, extraDeck: [] },
        { name: "bot", mainDeck: [201, 202, 203, 204, 205, 206, 207, 208].map(monster), extraDeck: [] },
      ],
      options: { shuffleDecks: false, fieldState: [{ id: 101, zone: "M-1" }] } as never,
    } as never);
    core.start();
    const logs: unknown[] = [];
    core.events.on("new-log", (log: unknown) => logs.push(log));
    return { core, logs };
  }

  it("finds the card in the slot it landed in, without throwing", async () => {
    const { YGOCommands } = await vi.importActual<typeof import("ygo-core")>("ygo-core");
    const { core, logs } = await coreWithLogs();
    const handBefore = core.getField(1).hand.length;
    const deckIndex = core.getField(1).mainDeck.findIndex((c: { id: number }) => c.id === 208);
    expect(deckIndex).toBeGreaterThanOrEqual(0);
    core.exec(new YGOCommands.MoveCardCommand({ player: 1, id: 208, originZone: `D2-${deckIndex + 1}`, zone: "H2", type: "To Hand" } as never));
    const event = logs.at(-1) as Props["event"];
    expect((event as { zone: string }).zone).toBe("H2"); // what the core logs

    let handler: MoveCardEventHandler | undefined;
    expect(() => {
      handler = new MoveCardEventHandler({ ...setup(event).props, ygo: core as never, event });
    }).not.toThrow();
    const props = (handler as unknown as { props: Props; cardReference: { id: number } });
    expect(props.cardReference.id).toBe(208);
    expect((props.props.event as { zone: string }).zone).toBe(`H2-${handBefore + 1}`);
    expect((event as { zone: string }).zone).toBe("H2"); // the log itself is left alone

    core.exec(new YGOCommands.MoveCardCommand({ player: 0, id: 101, originZone: "M-1", zone: "B", type: "Banish" } as never));
    const banish = logs.at(-1) as Props["event"];
    expect(() => new MoveCardEventHandler({ ...setup(banish).props, ygo: core as never, event: banish })).not.toThrow();
  });
});
