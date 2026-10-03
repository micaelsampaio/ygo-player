/* eslint-disable @typescript-eslint/no-explicit-any -- the duel, scene and zones are hand-rolled stubs */
/**
 * Characterisation tests: the exact choreography (per-tick transforms,
 * opacities, scene calls, completion) of the main duel-event handlers,
 * pinned as snapshots so restructuring them cannot change what the board
 * shows. A stub duel built from real three.js objects; the board lookups
 * (ygo-utils) and the mesh factories are stubbed deterministically.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";

const h = vi.hoisted(() => ({
  log: [] as string[],
  register: (() => { }) as (obj: unknown, label: string) => void,
  zones: new Map<string, any>(),
  flipDown: false,
}));

vi.mock("../../game/GameCard", async () => {
  const THREE = await import("three");
  return {
    GameCard: class {
      gameObject = new THREE.Object3D();
      cardReference: any;
      hideCardStats = vi.fn(() => h.log.push("card.hideCardStats"));
      showCardStats = vi.fn(() => h.log.push("card.showCardStats"));
      updateCardStats = vi.fn(() => h.log.push("card.updateCardStats"));
      destroy = vi.fn(() => h.log.push("card.destroy"));
      constructor(args: any) {
        this.cardReference = args.card;
        h.register(this.gameObject, "GameCard");
        h.log.push(`new GameCard(${args.card?.id})`);
      }
    },
  };
});
vi.mock("../../game/meshes/mesh-utils", async () => {
  const THREE = await import("three");
  const mesh = (label: string) => {
    const m = Object.assign(new THREE.Object3D(), { material: { opacity: 1 } });
    h.register(m, label);
    return m;
  };
  return {
    GameModalOverlayMesh: () => mesh("Modal"),
    CardEmptyMesh: () => mesh("CardEmpty"),
    CardActivationEffect: (args: any) => h.log.push(`CardActivationEffect(delay=${args.delay ?? "-"})`),
    createCardPopSummonEffectSequence: () => h.log.push("createCardPopSummonEffectSequence"),
  };
});
vi.mock("../bot-spotlight", () => ({ takeBotActivation: () => false, startBotSpotlight: vi.fn() }));
vi.mock("../../scripts/ygo-utils", async () => {
  const THREE = await import("three");
  return {
    getGameZone: (_duel: any, z: any) => h.zones.get(`${z.zone}:${z.player}:${z.zoneIndex}`),
    getZonePositionFromZoneData: (_duel: any, z: any) => new THREE.Vector3(z.zoneIndex, z.player === 0 ? -4 : 4, 0),
    getCardRotationFromFieldZoneData: (_duel: any, _c: any, z: any) => new THREE.Euler(0, 0, z.player === 0 ? 0 : Math.PI),
    getCardPositionInFrontOfCamera: () => new THREE.Vector3(0, 0, 6),
    isCardTransformFlipDown: () => h.flipDown,
    createOffsetPositionInMultipleEvents: (_d: any, _p: any, _i: any, end: any) => end.clone(),
    randomIntFromInterval: () => 2,
  };
});

import { AttackEventHandler } from "./attack-event";
import { RevealEventHandler } from "./reveal-event";
import { ActivateCardHandler } from "./activate-card-event";
import { FusionSummonEventHandler } from "./fusion-summon-event";
import { MoveCardEventHandler } from "./move-card-event";

const r = (n: number) => (Math.abs(n) < 5e-4 ? 0 : Math.round(n * 1000) / 1000);
const v3 = (v: { x: number; y: number; z: number }) => `${r(v.x)},${r(v.y)},${r(v.z)}`;

function zoneCard(label: string, position: THREE.Vector3, rotation = new THREE.Euler()) {
  const gameObject = new THREE.Object3D();
  gameObject.position.copy(position);
  gameObject.rotation.copy(rotation);
  h.register(gameObject, label);
  return {
    gameObject,
    cardReference: { id: 1 },
    hideCardStats: () => h.log.push(`${label}.hideCardStats`),
    showCardStats: () => h.log.push(`${label}.showCardStats`),
    updateCardStats: () => h.log.push(`${label}.updateCardStats`),
    destroy: () => h.log.push(`${label}.destroy`),
  };
}

function zone(key: string, card: any) {
  const z = {
    scale: new THREE.Vector3(1, 1, 1),
    getGameCard: () => card,
    setCard: (c: any) => h.log.push(`zone ${key}.setCard(${c})`),
    setGameCard: () => h.log.push(`zone ${key}.setGameCard`),
    removeCard: () => h.log.push(`zone ${key}.removeCard`),
    updateCard: () => h.log.push(`zone ${key}.updateCard`),
  };
  h.zones.set(key, z);
  return z;
}

function setup() {
  const tracked: { label: string; obj: any }[] = [];
  const ids = new Map<any, string>();
  h.register = (obj: any, label: string) => {
    if (ids.has(obj)) return;
    const id = `${label}#${tracked.length}`;
    ids.set(obj, id);
    tracked.push({ label: id, obj });
  };
  const name = (o: any) => {
    h.register(o, o?.type ?? "obj");
    return ids.get(o);
  };
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, -10, 20);
  camera.lookAt(0, 0, 0);
  const hands = [0, 1].map((player) => {
    const handZone = new THREE.Object3D();
    handZone.position.set(0, player === 0 ? -8 : 8, 0);
    const hand: any = {
      gameHandZone: { gameObject: handZone },
      cards: [] as any[],
      getCard: (i: number) => hand.cards[i],
      getCardFromCardIdAnZoneIndex: (_id: number, i: number) => hand.cards[i],
      removeCardFromCardReference: () => h.log.push(`hand${player}.removeCardFromCardReference`),
    };
    return hand;
  });
  const pile = (label: string, player: number) => {
    const t = new THREE.Object3D();
    t.position.set(6, player === 0 ? -4 : 4, 0.5);
    t.rotation.set(0, Math.PI, 0);
    return { getCardTransform: () => t, updateDeck: () => h.log.push(`${label}${player}.updateDeck`), updateExtraDeck: () => h.log.push(`${label}${player}.updateExtraDeck`), getGameCard: () => null, destroyGameCard: () => h.log.push(`${label}${player}.destroyGameCard`) };
  };
  const fields = [0, 1].map((p) => ({ hand: hands[p], mainDeck: pile("deck", p), extraDeck: pile("extra", p) }));
  const scene = (label: string) => ({
    add: (o: any) => h.log.push(`${label}.add(${name(o)})`),
    remove: (o: any) => h.log.push(`${label}.remove(${name(o)})`),
  });
  const duel: any = {
    camera,
    core: {
      camera,
      scene: scene("scene"),
      sceneOverlay: scene("overlay"),
      textureLoader: { load: () => null },
      enableRenderOverlay: () => h.log.push("enableRenderOverlay"),
      disableRenderOverlay: () => h.log.push("disableRenderOverlay"),
      clearSceneOverlay: () => h.log.push("clearSceneOverlay"),
    },
    fields,
    perspective: { isPlayerPOV: (p: number) => p === 0, playerIndex: 0 },
    settings: { getConfigFromPath: () => true },
    gameActions: { setSelectedCard: (a: any) => h.log.push(`setSelectedCard(${a.player},${a.card?.id},${a.force ?? "-"})`) },
    assets: { getTexture: () => null },
    config: { cdnUrl: "cdn" },
    events: { dispatch: (e: string) => h.log.push(`dispatch(${e})`) },
    ygo: { state: { getCardData: (id: number) => ({ id }), getCardById: (id: number) => ({ id, owner: 0 }) } },
    updateHand: (p: number) => h.log.push(`updateHand(${p})`),
    renderHand: (p: number) => h.log.push(`renderHand(${p})`),
    renderField: () => h.log.push("renderField"),
    updateExtraDeck: (p: number) => h.log.push(`updateExtraDeck(${p})`),
    createCdnUrl: (s: string) => s,
  };

  const run = (Handler: any, event: any, extra: any = {}) => {
    const tasks: any[] = [];
    const frames: string[] = [];
    let completedAt = -1;
    let tick = 0;
    const props = {
      duel,
      ygo: duel.ygo,
      event,
      ...extra,
      onCompleted: () => { completedAt = tick; h.log.push("onCompleted"); },
      playSound: ({ key, volume }: any) => h.log.push(`playSound(${key},${volume})`),
      startTask: (task: any) => { task.start(); tasks.push(task); h.log.push(`startTask#${tasks.length}`); },
    };
    const handler = new Handler(props);
    handler.start();
    const last = new Map<string, string>();
    const snap = () => {
      for (const { label, obj } of tracked) {
        const s = `p${v3(obj.position)} r${v3(obj.rotation)} s${v3(obj.scale)} o${r(obj.material?.opacity ?? -1)} v${obj.visible ? 1 : 0}`;
        if (last.get(label) !== s) {
          frames.push(`${tick} ${label} ${s}`);
          last.set(label, s);
        }
      }
    };
    snap();
    for (tick = 1; tick <= 200 && tasks.some((t) => !t.isCompleted()); tick++) {
      for (const t of [...tasks]) if (!t.isCompleted()) t.update(0.05);
      snap();
    }
    vi.runAllTimers();
    return { log: [...h.log], frames, completedAt, ticks: tick };
  };
  return { duel, run, hands };
}

beforeEach(() => {
  vi.useFakeTimers();
  h.log.length = 0;
  h.zones.clear();
  h.flipDown = false;
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("duel-event choreography", () => {
  it("attack on a face-up monster", () => {
    const { run } = setup();
    zone("M:0:2", zoneCard("attacker", new THREE.Vector3(2, -4, 0)));
    zone("M:1:3", zoneCard("attacked", new THREE.Vector3(3, 4, 0), new THREE.Euler(0, 0, Math.PI)));
    expect(run(AttackEventHandler, { player: 0, attackingZone: "M-2", attackedZone: "M2-3", attackedId: 9, attackedPosition: "faceup-attack" })).toMatchSnapshot();
  });

  it("attack on a face-down monster flips it", () => {
    const { run } = setup();
    zone("M:0:1", zoneCard("attacker", new THREE.Vector3(1, -4, 0)));
    zone("M:1:4", zoneCard("attacked", new THREE.Vector3(4, 4, 0), new THREE.Euler(0, Math.PI, Math.PI)));
    expect(run(AttackEventHandler, { player: 0, originZone: "M-1", attackedZone: "M2-4", attackedId: 9, attackedPosition: "facedown-defense" })).toMatchSnapshot();
  });

  it("direct attack", () => {
    const { run } = setup();
    zone("M:1:3", zoneCard("attacker", new THREE.Vector3(3, 4, 0), new THREE.Euler(0, 0, Math.PI)));
    expect(run(AttackEventHandler, { player: 1, attackingZone: "M2-3" })).toMatchSnapshot();
  });

  it.each(["D", "ED2"])("reveal from %s flips the pile's top card", (zoneName) => {
    const { run } = setup();
    expect(run(RevealEventHandler, { id: 5, player: 0, originZone: `${zoneName}-1` })).toMatchSnapshot();
  });

  it.each([0, 1])("reveal a target from player %i's hand", (player) => {
    const { run, hands } = setup();
    hands[player].cards = [zoneCard("handCard", new THREE.Vector3(1, player === 0 ? -8 : 8, 0), new THREE.Euler(0, player === 0 ? 0 : Math.PI, player === 0 ? 0 : Math.PI))];
    expect(run(RevealEventHandler, { id: 5, player, originZone: player === 0 ? "H-1" : "H2-1", revealType: "target" })).toMatchSnapshot();
  });

  it("reveal from hand shows the card to the camera", () => {
    const { run, hands } = setup();
    hands[0].cards = [zoneCard("handCard", new THREE.Vector3(1, -8, 0))];
    expect(run(RevealEventHandler, { id: 5, player: 0, originZone: "H-1" })).toMatchSnapshot();
  });

  it.each(["GY-1", "B2-1"])("activate from %s", (z) => {
    const { run } = setup();
    expect(run(ActivateCardHandler, { id: 7, player: 0, zone: z })).toMatchSnapshot();
  });

  it.each([false, true])("activate from hand (face down %s)", (flipDown) => {
    h.flipDown = flipDown;
    const { run, hands } = setup();
    const c = zoneCard("handCard", new THREE.Vector3(2, -8, 0));
    hands[0].cards = [Object.assign(c, { position: c.gameObject.position.clone(), setIsVisible: (v: boolean) => h.log.push(`setIsVisible(${v})`), isUiElementClick: true, isUiElementHover: true })];
    expect(run(ActivateCardHandler, { id: 7, player: 0, zone: "H-1" })).toMatchSnapshot();
  });

  it("activate on the field", () => {
    const { run } = setup();
    zone("S:0:2", zoneCard("fieldCard", new THREE.Vector3(2, -2, 0)));
    expect(run(ActivateCardHandler, { id: 7, player: 0, zone: "S-2" })).toMatchSnapshot();
  });

  it("fusion summon with two materials", () => {
    const { run } = setup();
    zone("M:0:1", zoneCard("material1", new THREE.Vector3(1, -4, 0)));
    zone("M:0:2", null);
    expect(run(FusionSummonEventHandler, { id: 30, player: 0, zone: "M-2", materials: [{ id: 11, zone: "M-1" }, { id: 12, zone: "H-1" }] })).toMatchSnapshot();
  });

  it("fusion summon without materials", () => {
    const { run } = setup();
    zone("M:0:2", null);
    expect(run(FusionSummonEventHandler, { id: 30, player: 0, zone: "M-2", materials: [] })).toMatchSnapshot();
  });

  it.each([
    ["M-1", "S-3"],
    ["M-1", "H-1"],
    ["M2-2", "M2-4"],
  ])("move card %s -> %s", (from, to) => {
    const { run, hands } = setup();
    const fromData = from.startsWith("M2") ? `M:1:${from.slice(-1)}` : `M:0:${from.slice(-1)}`;
    zone(fromData, zoneCard("moving", new THREE.Vector3(1, -4, 0)));
    if (to.startsWith("H")) hands[0].cards = [zoneCard("handSlot", new THREE.Vector3(0, -8, 0))];
    else zone(to.startsWith("M2") ? `M:1:${to.slice(-1)}` : `${to[0]}:0:${to.slice(-1)}`, null);
    expect(run(MoveCardEventHandler, { id: 3, player: 0, originZone: from, zone: to })).toMatchSnapshot();
  });
});
