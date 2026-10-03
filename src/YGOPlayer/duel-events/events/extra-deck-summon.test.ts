import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

const gameCards: any[] = [];
vi.mock("../../game/GameCard", () => ({
  GameCard: class {
    gameObject = new THREE.Object3D();
    hideCardStats = vi.fn();
    destroy = vi.fn();
    constructor(public args: any) {
      gameCards.push(this);
    }
  },
}));
const mesh = () => Object.assign(new THREE.Object3D(), { material: { opacity: 1 } });
vi.mock("../../game/meshes/mesh-utils", () => ({
  CardEmptyMesh: vi.fn(() => mesh()),
  GameModalOverlayMesh: vi.fn(() => mesh()),
  createCardPopSummonEffectSequence: vi.fn(),
}));
const zones = new Map<string, any>();
vi.mock("../../scripts/ygo-utils", () => ({
  getGameZone: (_duel: any, zoneData: any) => zones.get(`${zoneData.zone}:${zoneData.player}:${zoneData.zoneIndex}`),
  getZonePositionFromZoneData: () => new THREE.Vector3(1, 2, 3),
  getCardRotationFromFieldZoneData: () => new THREE.Euler(0, 0, 0),
  getCardPositionInFrontOfCamera: ({ duel, distance = 4 }: { duel: any; distance?: number }) => {
    const direction = new THREE.Vector3();
    duel.core.camera.getWorldDirection(direction);
    return duel.core.camera.position.clone().add(direction.multiplyScalar(distance));
  },
}));

import { LinkSummonEventHandler } from "./link-summon-event";
import { SynchroSummonEventHandler } from "./synchro-summon";
import { XYZSummonEventHandler } from "./xyz-summon-event";

function run(Handler: any, { mobile = false }: { mobile?: boolean } = {}) {
  gameCards.length = 0;
  zones.clear();
  const material = { gameObject: new THREE.Object3D(), hideCardStats: vi.fn(), destroy: vi.fn() };
  const materialZone = { getGameCard: () => material, removeCard: vi.fn() };
  const landingZone = { setGameCard: vi.fn() };
  zones.set("M:1:2", materialZone);
  zones.set("M:1:1", landingZone);
  const camera = new THREE.PerspectiveCamera();
  const tasks: any[] = [];
  const duel: any = {
    camera,
    core: {
      camera,
      isMobileLayout: mobile,
      scene: { add: vi.fn(), remove: vi.fn() },
      sceneOverlay: { add: vi.fn() },
      enableRenderOverlay: vi.fn(),
      disableRenderOverlay: vi.fn(),
    },
    fields: [{ extraDeck: { updateExtraDeck: vi.fn() } }, { extraDeck: { updateExtraDeck: vi.fn() } }],
    ygo: { state: { getCardData: () => ({ id: 77 }) } },
    createCdnUrl: (s: string) => s,
  };
  const props: any = {
    duel,
    event: { id: 77, zone: "M2-1", originZone: "ED2-1", materials: [{ id: 5, zone: "M2-2" }] },
    ygo: { state: { getCardById: () => ({ id: 77 }) } },
    onCompleted: vi.fn(),
    playSound: vi.fn(),
    startTask: (task: any) => { task.start(); tasks.push(task); },
  };
  const handler = new Handler(props);
  handler.start();
  const startPosition = gameCards[0].gameObject.position.toArray();
  for (let i = 0; i < 200 && tasks.some((t) => !t.isCompleted()); i++) {
    for (const t of tasks) if (!t.isCompleted()) t.update(0.05);
  }
  return { props, duel, material, materialZone, landingZone, summoned: gameCards[0], startPosition };
}

describe.each([
  ["Link", LinkSummonEventHandler],
  ["Synchro", SynchroSummonEventHandler],
])("%s summon animation", (_name, Handler) => {
  it("vanishes the materials, pops the summoned card and hands it to its zone", () => {
    const s = run(Handler);
    expect(s.materialZone.removeCard).toHaveBeenCalled();
    expect(s.material.destroy).toHaveBeenCalled();
    expect(s.props.playSound.mock.calls.map((c: any[]) => c[0].key)).toEqual(["/sounds/materials_vanish.ogg", "/sounds/extra_deck_summon.ogg"]);
    expect(s.duel.fields[1].extraDeck.updateExtraDeck).toHaveBeenCalled();
    expect(s.landingZone.setGameCard).toHaveBeenCalledWith(s.summoned);
    expect(s.summoned.gameObject.visible).toBe(true);
    expect(s.summoned.gameObject.position.toArray()).toEqual([1, 2, 3]);
    expect(s.duel.core.disableRenderOverlay).toHaveBeenCalled();
    expect(s.props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("creates the summoned card for the zone's player and pops it farther away on mobile", () => {
    // The camera sits at the origin looking down -z.
    const desktop = run(Handler);
    expect(desktop.summoned.args.player).toBe(1);
    expect(desktop.startPosition).toEqual([0, 0, -4]);
    expect(run(Handler, { mobile: true }).startPosition).toEqual([0, 0, -6]);
  });
});

describe("Xyz summon animation", () => {
  it("hands the card to its zone, created for the zone's player, popping farther away on mobile", () => {
    const desktop = run(XYZSummonEventHandler);
    expect(desktop.landingZone.setGameCard).toHaveBeenCalledWith(desktop.summoned);
    expect(desktop.props.onCompleted).toHaveBeenCalledTimes(1);
    expect(desktop.summoned.args.player).toBe(1);
    expect(desktop.startPosition).toEqual([0, 0, -4]);
    expect(run(XYZSummonEventHandler, { mobile: true }).startPosition).toEqual([0, 0, -6]);
  });
});
