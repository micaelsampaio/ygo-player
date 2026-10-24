import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { YGOClientType } from "ygo-core";
import { YGOHandDrag, handDragAvailable, type HandDropProvider } from "./YGOHandDrag";

function zone(id: string, occupied = false) {
  const gameObject = new THREE.Mesh(new THREE.PlaneGeometry(4, 4));
  return { zone: id, gameObject, size: new THREE.Vector2(4, 4), scale: new THREE.Vector3(1, 1, 1), hasCard: () => occupied };
}

function setup({ setting = true }: { setting?: boolean } = {}) {
  const canvas = { addEventListener: vi.fn(), removeEventListener: vi.fn(), setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() };
  const scene = new THREE.Scene();
  const m1 = zone("M-1");
  const m2 = zone("M-2", true);
  const escHandlers: Array<() => void> = [];
  let hit: THREE.Object3D | null = null;
  const handCardObject = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.6));
  scene.add(handCardObject);
  const card = {
    isUiCardElement: true, handIndex: 0, player: 0, isVisible: true, card: { id: 100 },
    gameObject: handCardObject, position: new THREE.Vector3(0, -10, 6),
  };
  const dispatch = vi.fn();
  const duel: any = {
    core: { renderer: { domElement: canvas }, scene, unscaledDeltaTime: 1 / 60 },
    fields: [{ monsterZone: [m1, m2], spellTrapZone: [], fieldZone: zone("F"), hand: { getCardsRotation: () => new THREE.Vector3() } }],
    perspective: { playerIndex: 0 },
    isGameActive: true,
    actionManager: { actionsEnabled: true, action: { name: "IDLE" }, clearAction: vi.fn() },
    commands: { isBusy: () => false },
    settings: { getConfigFromPath: (key: string) => (key === "dragFromHand" ? setting : undefined) },
    events: { dispatch, on: vi.fn(), off: vi.fn() },
    globalHotKeysManager: { on: (_: string, cb: () => void) => { escHandlers.push(cb); return () => escHandlers.splice(escHandlers.indexOf(cb), 1); } },
    logger: { warn: vi.fn() },
    mouseEvents: {
      dragHandler: null,
      leaveHover: vi.fn(),
      raycastObjects: () => (hit ? [{ object: hit }] : []),
      rayAt: () => new THREE.Ray(new THREE.Vector3(0, 0, 20), new THREE.Vector3(0, 0, -1)),
    },
  };
  const provider: HandDropProvider = {
    targets: vi.fn(() => ({ zones: ["M-1"], set: false })),
    drop: vi.fn(),
  };
  const drag = new YGOHandDrag(duel);
  drag.start();
  drag.setProvider(provider);
  const pointer = (type: string, x: number, y: number, extra: Partial<PointerEvent> = {}) =>
    ({ type, pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y, target: canvas, shiftKey: false, ...extra }) as PointerEvent;
  return { drag, duel, card, provider, pointer, m1, m2, escHandlers, setHit: (o: THREE.Object3D | null) => { hit = o; }, dispatch };
}

beforeEach(() => {
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn(), matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe("YGOHandDrag", () => {
  it("installs itself as the mouse events' drag handler", () => {
    const s = setup();
    expect(s.duel.mouseEvents.dragHandler).toBe(s.drag);
  });

  it("a press that doesn't move is a click: no drag, the click goes through", () => {
    const s = setup();
    s.drag.onPointerDown(s.pointer("pointerdown", 100, 500), s.card as any);
    s.drag.onPointerMove(s.pointer("pointermove", 103, 497));
    expect(s.drag.isDragging()).toBe(false);
    s.drag.onPointerUp(s.pointer("pointerup", 103, 497));
    expect(s.drag.consumeClick()).toBe(false);
  });

  it("dragging onto a lit zone drops there; the click that follows is swallowed", () => {
    const s = setup();
    s.drag.onPointerDown(s.pointer("pointerdown", 100, 500), s.card as any);
    s.drag.onPointerMove(s.pointer("pointermove", 100, 480));
    expect(s.drag.isDragging()).toBe(true);
    expect(s.provider.targets).toHaveBeenCalledWith(s.card, [
      { zone: "M-1", occupied: false }, { zone: "M-2", occupied: true }, { zone: "F", occupied: false },
    ]);
    // The card follows the pointer, lifted off the field.
    s.drag.update();
    expect(s.card.gameObject.position.z).toBeGreaterThan(0);
    s.setHit(s.m1.gameObject);
    s.drag.onPointerUp(s.pointer("pointerup", 100, 300, { shiftKey: true }));
    expect(s.provider.drop).toHaveBeenCalledWith(s.card, { kind: "zone", zone: "M-1" }, expect.objectContaining({ shift: true }));
    expect(s.drag.isDragging()).toBe(false);
    expect(s.drag.consumeClick()).toBe(true);
    expect(s.drag.consumeClick()).toBe(false);
  });

  it("a drop anywhere else makes no move and the card slides back", () => {
    const s = setup();
    s.drag.onPointerDown(s.pointer("pointerdown", 100, 500), s.card as any);
    s.drag.onPointerMove(s.pointer("pointermove", 100, 480));
    s.drag.update();
    s.drag.onPointerUp(s.pointer("pointerup", 50, 50));
    expect(s.provider.drop).not.toHaveBeenCalled();
    for (let i = 0; i < 30; i++) s.drag.update();
    expect(s.card.gameObject.position.toArray()).toEqual(s.card.position.toArray());
  });

  it("Escape cancels a drag", () => {
    const s = setup();
    s.drag.onPointerDown(s.pointer("pointerdown", 100, 500), s.card as any);
    s.drag.onPointerMove(s.pointer("pointermove", 100, 480));
    expect(s.escHandlers).toHaveLength(1);
    s.escHandlers[0]();
    expect(s.drag.isDragging()).toBe(false);
    expect(s.escHandlers).toHaveLength(0);
    s.drag.onPointerUp(s.pointer("pointerup", 100, 300));
    expect(s.provider.drop).not.toHaveBeenCalled();
  });

  it("no drag when the card has nothing to drop on, the setting is off, or it's not your card", () => {
    const none = setup();
    (none.provider.targets as any).mockReturnValue(null);
    none.drag.onPointerDown(none.pointer("pointerdown", 100, 500), none.card as any);
    none.drag.onPointerMove(none.pointer("pointermove", 100, 470));
    expect(none.drag.isDragging()).toBe(false);

    const off = setup({ setting: false });
    off.drag.onPointerDown(off.pointer("pointerdown", 100, 500), off.card as any);
    off.drag.onPointerMove(off.pointer("pointermove", 100, 470));
    expect(off.drag.isDragging()).toBe(false);

    const theirs = setup();
    theirs.card.player = 1;
    theirs.drag.onPointerDown(theirs.pointer("pointerdown", 100, 500), theirs.card as any);
    theirs.drag.onPointerMove(theirs.pointer("pointermove", 100, 470));
    expect(theirs.drag.isDragging()).toBe(false);
  });

  it("touch: a sideways swipe stays the page's, an upward pull drags", () => {
    const s = setup();
    const touch = { pointerType: "touch" } as Partial<PointerEvent>;
    s.drag.onPointerDown(s.pointer("pointerdown", 100, 500, touch), s.card as any);
    s.drag.onPointerMove(s.pointer("pointermove", 130, 500, touch));
    expect(s.drag.isDragging()).toBe(false);
    s.drag.onPointerMove(s.pointer("pointermove", 130, 400, touch));
    expect(s.drag.isDragging()).toBe(false); // the press was given up

    s.drag.onPointerDown(s.pointer("pointerdown", 100, 500, touch), s.card as any);
    s.drag.onPointerMove(s.pointer("pointermove", 102, 470, touch));
    expect(s.drag.isDragging()).toBe(true);
  });

  it("touch: a long press let go where it started stays a tap (its click opens the menu)", () => {
    vi.useFakeTimers();
    try {
      const s = setup();
      const touch = { pointerType: "touch" } as Partial<PointerEvent>;
      s.drag.onPointerDown(s.pointer("pointerdown", 100, 500, touch), s.card as any);
      vi.advanceTimersByTime(300);
      expect(s.drag.isDragging()).toBe(true);
      s.drag.onPointerUp(s.pointer("pointerup", 102, 501, touch));
      expect(s.drag.isDragging()).toBe(false);
      expect(s.drag.consumeClick()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tells the overlay when a drag starts and ends", () => {
    const s = setup();
    s.drag.onPointerDown(s.pointer("pointerdown", 100, 500), s.card as any);
    s.drag.onPointerMove(s.pointer("pointermove", 100, 480));
    expect(s.dispatch).toHaveBeenCalledWith("hand-drag-state", { set: false, overSet: false, shift: false, overZone: false });
    s.drag.cancel();
    expect(s.dispatch).toHaveBeenLastCalledWith("hand-drag-state", null);
  });
});

describe("handDragAvailable", () => {
  it("only for a player in an Assisted Mode duel", () => {
    const base = { assist: {}, client: { type: YGOClientType.PLAYER }, ygo: { options: { assistedMode: true } } } as any;
    expect(handDragAvailable(base)).toBe(true);
    expect(handDragAvailable({ ...base, assist: undefined })).toBe(false);
    expect(handDragAvailable({ ...base, client: { type: YGOClientType.SPECTATOR } })).toBe(false);
    expect(handDragAvailable({ ...base, ygo: { options: {} } })).toBe(false);
  });
});
