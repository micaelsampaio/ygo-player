import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { YGODuelEvents } from "ygo-core";
import type { YGOTask } from "../../core/components/tasks/YGOTask";

type ZoneKey = { zone: string; player: number; zoneIndex: number };

const h = vi.hoisted(() => ({
  zones: new Map<string, unknown>(),
  created: [] as { gameObject: unknown; destroy: () => void }[],
}));

vi.mock("../../game/GameCard", async () => {
  const THREE = await import("three");
  return {
    GameCard: class {
      gameObject = new THREE.Object3D();
      hideCardStats = vi.fn();
      destroy = vi.fn();
      constructor() {
        h.created.push(this);
      }
    },
  };
});
vi.mock("../../game/meshes/mesh-utils", () => ({ createSquareWithTopMiddlePivot: vi.fn() }));
vi.mock("../../scripts/ygo-utils", async () => {
  const THREE = await import("three");
  return {
    getGameZone: (_duel: unknown, z: ZoneKey) => h.zones.get(`${z.zone}:${z.player}:${z.zoneIndex}`),
    getZonePositionFromZoneData: (_duel: unknown, z: ZoneKey) => new THREE.Vector3(z.zoneIndex, -4, 0),
  };
});

import { DestroyCardEventHandler } from "./destroy-card-event";

type Props = ConstructorParameters<typeof DestroyCardEventHandler>[0];

function setup(event: Partial<YGODuelEvents.Destroy>) {
  h.zones.clear();
  h.created.length = 0;
  const tasks: YGOTask[] = [];
  const graveyards = [0, 1].map((player) => ({
    cardPosition: new THREE.Vector3(6, player === 0 ? -4 : 4, 0),
    createSendToGraveyardEffect: vi.fn(),
  }));
  const effect = { gameObject: new THREE.Object3D(), playAll: vi.fn(), enable: vi.fn() };
  const pool = { get: () => effect, enquene: vi.fn() };
  const scene = new THREE.Scene();
  const duel = {
    fields: graveyards.map((graveyard) => ({ graveyard })),
    config: { cdnUrl: "" },
    assets: { getTexture: () => null, getPool: () => pool },
    core: { scene },
    createCdnUrl: (s: string) => s,
    ygo: { state: { getCardData: (id: number) => ({ id }) } },
  };
  const props = {
    duel,
    ygo: duel.ygo,
    event: { type: YGODuelEvents.LogType.Destroy, player: 0, commandId: 1, id: 4, originZone: "M-2", ...event },
    onCompleted: vi.fn(),
    playSound: vi.fn(),
    startTask: (task: YGOTask) => {
      task.start();
      tasks.push(task);
    },
  } as unknown as Props; // a stub duel with only what the destroy effect reads
  const run = () => {
    for (let i = 0; i < 400 && tasks.some((t) => !t.isCompleted()); i++) {
      for (const t of [...tasks]) if (!t.isCompleted()) t.update(0.05);
    }
  };
  return { props, duel, graveyards, effect, pool, scene, tasks, run };
}

describe("DestroyCardEventHandler", () => {
  it("destroys the card on the board, sends its light to its owner's GY and cleans up", () => {
    const s = setup({});
    const card = { gameObject: new THREE.Object3D(), cardReference: { originalOwner: 1 }, hideCardStats: vi.fn(), destroy: vi.fn() };
    const zone = { position: new THREE.Vector3(2, -4, 0), getGameCard: () => card, setCard: vi.fn() };
    h.zones.set("M:0:2", zone);

    new DestroyCardEventHandler(s.props).start();
    expect(card.gameObject.visible).toBe(false);
    // The card shatters: 18 shards and a white flash, in place of the card.
    const shatter = s.scene.children.find((c) => c.children.length === 1 && c.children[0].children.length === 19);
    expect(shatter).toBeDefined();
    expect(s.props.playSound).toHaveBeenCalledWith(expect.objectContaining({ key: "/sounds/crack.ogg" }));
    expect(s.effect.playAll).toHaveBeenCalled();
    expect(s.props.onCompleted).not.toHaveBeenCalled();
    s.run();

    expect(s.graveyards[1].createSendToGraveyardEffect).toHaveBeenCalledWith(expect.objectContaining({ card: card.gameObject }));
    expect(s.graveyards[0].createSendToGraveyardEffect).not.toHaveBeenCalled();
    expect(zone.setCard).toHaveBeenCalledWith(null);
    expect(card.destroy).toHaveBeenCalledTimes(1);
    expect(s.pool.enquene).toHaveBeenCalledWith(s.effect);
    // Only the pooled effect stays in the scene; the three light planes are gone.
    expect(s.scene.children).toEqual([s.effect.gameObject]);
    expect(s.tasks.every((t) => t.isCompleted())).toBe(true);
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("builds a temporary card for a zone with no game card and uses the zone player's GY", () => {
    const s = setup({ originZone: "S2-3" });

    new DestroyCardEventHandler(s.props).start();
    s.run();

    expect(h.created).toHaveLength(1);
    expect(s.graveyards[1].createSendToGraveyardEffect).toHaveBeenCalledWith(expect.objectContaining({ card: h.created[0].gameObject }));
    expect(h.created[0].destroy).toHaveBeenCalledTimes(1);
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });
});
