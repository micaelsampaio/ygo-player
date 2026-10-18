import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { YGODuelEvents } from "ygo-core";
import type { YGOTask } from "../../core/components/tasks/YGOTask";

const h = vi.hoisted(() => ({
  zones: new Map<string, unknown>(),
  moves: [] as { props: Record<string, unknown>; start: () => void; finish: () => void }[],
}));

vi.mock("./move-card-event", () => ({
  MoveCardEventHandler: class {
    start = vi.fn();
    finish = vi.fn();
    constructor(public props: Record<string, unknown>) {
      h.moves.push(this);
    }
  },
}));
vi.mock("../../scripts/ygo-utils", async () => {
  const THREE = await import("three");
  return {
    getGameZone: (_duel: unknown, z: { zone: string; player: number; zoneIndex: number }) =>
      h.zones.get(`${z.zone}:${z.player}:${z.zoneIndex}`),
    getCardRotationFromFieldZoneData: () => new THREE.Euler(0, Math.PI, 0),
  };
});

import { ChangeCardPositionHandler } from "./change-card-position";

/** A stub duel; `startTask` starts each task and the loop below plays them out. */
function setup(event: Record<string, unknown>) {
  h.zones.clear();
  h.moves.length = 0;
  const tasks: YGOTask[] = [];
  const card = {
    gameObject: new THREE.Object3D(),
    hideCardStats: vi.fn(),
    updateCardStats: vi.fn(),
  };
  card.gameObject.position.set(1, 2, 0);
  const props = {
    duel: {
      settings: { getConfigFromPath: () => false },
      gameActions: { setSelectedCard: vi.fn() },
    },
    ygo: { state: { getCardById: () => ({ id: 10 }) } },
    event: { player: 0, commandId: 1, ...event },
    onCompleted: vi.fn(),
    playSound: vi.fn(),
    startTask: (task: YGOTask) => {
      task.start();
      tasks.push(task);
    },
  };
  const run = () => {
    for (let i = 0; i < 200 && tasks.some((t) => !t.isCompleted()); i++) {
      for (const t of [...tasks]) if (!t.isCompleted()) t.update(0.05);
    }
  };
  // The handler only reads what the stub provides.
  const handler = new ChangeCardPositionHandler(props as unknown as ConstructorParameters<typeof ChangeCardPositionHandler>[0]);
  return { handler, props, card, tasks, run };
}

describe("ChangeCardPositionHandler", () => {
  it("flips the card in place: it lands back on its spot, turned, with its stats updated", () => {
    const s = setup({ type: YGODuelEvents.LogType.Flip, id: 10, originZone: "M-1" });
    h.zones.set("M:0:1", { getGameCard: () => s.card });

    s.handler.start();
    expect(s.card.hideCardStats).toHaveBeenCalled();
    expect(s.props.onCompleted).not.toHaveBeenCalled();
    s.run();

    expect(s.tasks.every((t) => t.isCompleted())).toBe(true);
    expect(s.card.gameObject.position.toArray()).toEqual([1, 2, 0]);
    expect(s.card.gameObject.rotation.y).toBeCloseTo(Math.PI);
    expect(s.card.updateCardStats).toHaveBeenCalledWith({ zone: "M", player: 0, zoneIndex: 1 });
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
    expect(h.moves).toHaveLength(0);
  });

  it("completes at once when the zone has no card on the board", () => {
    const s = setup({ type: YGODuelEvents.LogType.ChangeCardPosition, id: 10, originZone: "M-3" });

    s.handler.start();

    expect(s.tasks).toHaveLength(0);
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("hands a set that also moves the card to MoveCardEventHandler, keeping the log type", () => {
    const s = setup({ type: YGODuelEvents.LogType.SetMonster, id: 10, originZone: "H-1", zone: "M-2" });

    s.handler.start();

    expect(h.moves).toHaveLength(1);
    const [move] = h.moves;
    expect(move.props.event).toMatchObject({ type: YGODuelEvents.LogType.SetMonster, id: 10, originZone: "H-1", zone: "M-2", player: 0 });
    expect(move.props.onCompleted).toBe(s.props.onCompleted);
    expect(move.start).toHaveBeenCalledTimes(1);

    s.handler.finish();
    expect(move.finish).toHaveBeenCalledTimes(1);
  });
});
