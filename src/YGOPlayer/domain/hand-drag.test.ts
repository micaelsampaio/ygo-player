import { describe, expect, it } from "vitest";
import {
  DROP_INTENT_TTL_MS, MOUSE_DRAG_PX, TOUCH_LONG_PRESS_MS, TOUCH_PULL_PX,
  dragTilt, dropPlaceAnswer, dropPositionAnswer, dropTargets, gestureDecision, keepsDropIntent, planDrop, zoneKind,
  type DragCardInfo, type DropRow, type DropZoneState,
} from "./hand-drag";
import { LOC_HAND, LOC_MZONE, LOC_SZONE, type PromptData } from "./assist-prompt";

const ALL_ZONES: DropZoneState[] = [
  ...[1, 2, 3, 4, 5].map((i) => ({ zone: `M-${i}`, occupied: i === 3 })),
  ...[1, 2, 3, 4, 5].map((i) => ({ zone: `S-${i}`, occupied: i === 1 })),
  { zone: "F", occupied: true },
];

const monster: DragCardInfo = { code: 100, isMonster: true, isFieldSpell: false, level: 4 };
const bigMonster: DragCardInfo = { ...monster, code: 101, level: 7 };
const spell: DragCardInfo = { code: 200, isMonster: false, isFieldSpell: false };
const fieldSpell: DragCardInfo = { code: 300, isMonster: false, isFieldSpell: true };

const row = (commandType: string, code: number, extra: Partial<DropRow> = {}): DropRow => ({
  key: `${commandType}:${code}`, commandType, data: { id: code }, count: 1, ...extra,
});

describe("gestureDecision", () => {
  it("mouse: a drag once the pointer moves 8 px with the button held, a click below that", () => {
    expect(gestureDecision({ pointerType: "mouse", dx: 3, dy: -4, elapsedMs: 900 })).toBe("pending");
    expect(gestureDecision({ pointerType: "mouse", dx: MOUSE_DRAG_PX, dy: 0, elapsedMs: 10 })).toBe("drag");
    // A mouse never gives up: a sideways move is still a drag.
    expect(gestureDecision({ pointerType: "mouse", dx: 0, dy: 30, elapsedMs: 10 })).toBe("drag");
  });

  it("touch: a long press starts a drag, a short tap stays a tap", () => {
    expect(gestureDecision({ pointerType: "touch", dx: 2, dy: 2, elapsedMs: 100 })).toBe("pending");
    expect(gestureDecision({ pointerType: "touch", dx: 2, dy: 2, elapsedMs: TOUCH_LONG_PRESS_MS })).toBe("drag");
  });

  it("touch: a clear upward pull starts a drag at once; sideways or down is the page's scroll", () => {
    expect(gestureDecision({ pointerType: "touch", dx: 4, dy: -TOUCH_PULL_PX, elapsedMs: 50 })).toBe("drag");
    expect(gestureDecision({ pointerType: "touch", dx: 3, dy: -16, elapsedMs: 50 })).toBe("pending");
    expect(gestureDecision({ pointerType: "touch", dx: 30, dy: -5, elapsedMs: 50 })).toBe("cancel");
    expect(gestureDecision({ pointerType: "touch", dx: 0, dy: 20, elapsedMs: 50 })).toBe("cancel");
    // A long hold that already slid sideways is a scroll, not a drag.
    expect(gestureDecision({ pointerType: "touch", dx: 20, dy: 0, elapsedMs: 400 })).toBe("cancel");
  });

  it("pen behaves like touch", () => {
    expect(gestureDecision({ pointerType: "pen", dx: 15, dy: 0, elapsedMs: 50 })).toBe("cancel");
    expect(gestureDecision({ pointerType: "pen", dx: 0, dy: -30, elapsedMs: 50 })).toBe("drag");
  });
});

describe("zoneKind", () => {
  it("reads both players' zone ids; Extra Monster Zones take no drop", () => {
    expect(zoneKind("M-2")).toBe("monster");
    expect(zoneKind("M2-2")).toBe("monster");
    expect(zoneKind("S2-5")).toBe("spell");
    expect(zoneKind("F")).toBe("field");
    expect(zoneKind("F2")).toBe("field");
    expect(zoneKind("EMZ-1")).toBeNull();
  });
});

describe("dropTargets", () => {
  it("a monster that can be Normal Summoned: the free Main Monster Zones; the Set chip only if it can be Set", () => {
    expect(dropTargets(monster, [row("Normal Summon", 100)], ALL_ZONES)).toEqual({ zones: ["M-1", "M-2", "M-4", "M-5"], set: false });
    expect(dropTargets(monster, [row("Normal Summon", 100), row("Set Monster", 100)], ALL_ZONES).set).toBe(true);
  });

  it("a Tribute Summon may land where a Tribute was: every Main Monster Zone", () => {
    expect(dropTargets(bigMonster, [row("Normal Summon", 101)], ALL_ZONES).zones).toEqual(["M-1", "M-2", "M-3", "M-4", "M-5"]);
  });

  it("a monster with no summon or Set (only an effect to activate) has nothing to drop on", () => {
    expect(dropTargets(monster, [row("Activate", 100, { data: { id: 100, loc: LOC_HAND } })], ALL_ZONES)).toEqual({ zones: [], set: false });
  });

  it("a Spell/Trap that can be Set: the free Spell & Trap Zones and the chip; one that can only be activated: none", () => {
    expect(dropTargets(spell, [row("Set ST", 200)], ALL_ZONES)).toEqual({ zones: ["S-2", "S-3", "S-4", "S-5"], set: true });
    expect(dropTargets(spell, [row("Activate", 200, { data: { id: 200, loc: LOC_HAND } })], ALL_ZONES)).toEqual({ zones: [], set: false });
  });

  it("a Field Spell: the Field Zone (even holding one) when it can be activated or Set", () => {
    expect(dropTargets(fieldSpell, [row("Activate", 300, { data: { id: 300, loc: LOC_HAND } })], ALL_ZONES)).toEqual({ zones: ["F"], set: false });
    expect(dropTargets(fieldSpell, [row("Set ST", 300)], ALL_ZONES)).toEqual({ zones: ["F"], set: true });
  });

  it("ignores Activate rows for a copy that isn't in the hand", () => {
    expect(dropTargets(fieldSpell, [row("Activate", 300, { data: { id: 300, loc: LOC_SZONE } })], ALL_ZONES).zones).toEqual([]);
  });
});

describe("planDrop", () => {
  const summonAndSet = [row("Normal Summon", 100), row("Set Monster", 100)];
  const targetsOf = (card: DragCardInfo, rows: DropRow[]) => dropTargets(card, rows, ALL_ZONES);

  it("monster on a Monster Zone: Normal Summon there, face-up", () => {
    const plan = planDrop(monster, summonAndSet, { kind: "zone", zone: "M-2" }, targetsOf(monster, summonAndSet));
    expect(plan).toEqual({ kind: "row", row: summonAndSet[0], intent: { code: 100, zone: "M-2", faceDown: false } });
  });

  it("Shift on a zone, or the Set chip: Set (face-down)", () => {
    const targets = targetsOf(monster, summonAndSet);
    expect(planDrop(monster, summonAndSet, { kind: "zone", zone: "M-2" }, targets, { shift: true }))
      .toEqual({ kind: "row", row: summonAndSet[1], intent: { code: 100, zone: "M-2", faceDown: true } });
    expect(planDrop(monster, summonAndSet, { kind: "set" }, targets))
      .toEqual({ kind: "row", row: summonAndSet[1], intent: { code: 100, zone: null, faceDown: true } });
  });

  it("a monster that can only be Set is Set on a zone too", () => {
    const rows = [row("Set Monster", 100)];
    expect(planDrop(monster, rows, { kind: "zone", zone: "M-1" }, targetsOf(monster, rows))).toMatchObject({ kind: "row", row: rows[0], intent: { faceDown: true } });
  });

  it("a target that isn't lit makes nothing (an occupied zone, a Spell zone for a monster, the chip with no Set)", () => {
    const rows = [row("Normal Summon", 100)];
    const targets = targetsOf(monster, rows);
    expect(planDrop(monster, rows, { kind: "zone", zone: "M-3" }, targets)).toEqual({ kind: "none" });
    expect(planDrop(monster, rows, { kind: "zone", zone: "S-2" }, targets)).toEqual({ kind: "none" });
    expect(planDrop(monster, rows, { kind: "set" }, targets)).toEqual({ kind: "none" });
  });

  it("Spell/Trap on a Spell & Trap Zone or the chip: Set", () => {
    const rows = [row("Set ST", 200)];
    const targets = targetsOf(spell, rows);
    expect(planDrop(spell, rows, { kind: "zone", zone: "S-4" }, targets)).toEqual({ kind: "row", row: rows[0], intent: { code: 200, zone: "S-4", faceDown: true } });
    expect(planDrop(spell, rows, { kind: "set" }, targets)).toMatchObject({ kind: "row", intent: { zone: null } });
  });

  it("Field Spell on the Field Zone: Activate when the engine lists it, else Set", () => {
    const activate = row("Activate", 300, { key: "Activate:300:0:2", data: { id: 300, ctrl: 0, loc: LOC_HAND, seq: 0 } });
    const set = row("Set ST", 300);
    expect(planDrop(fieldSpell, [activate, set], { kind: "zone", zone: "F" }, targetsOf(fieldSpell, [activate, set])))
      .toEqual({ kind: "row", row: activate, intent: { code: 300, zone: "F", faceDown: false } });
    expect(planDrop(fieldSpell, [set], { kind: "zone", zone: "F" }, targetsOf(fieldSpell, [set])))
      .toEqual({ kind: "row", row: set, intent: { code: 300, zone: "F", faceDown: true } });
  });

  it("more than one matching move (two Activate effects): the card's menu instead", () => {
    const twoEffects = row("Activate", 300, { count: 2, data: { id: 300, loc: LOC_HAND } });
    expect(planDrop(fieldSpell, [twoEffects], { kind: "zone", zone: "F" }, targetsOf(fieldSpell, [twoEffects]))).toEqual({ kind: "menu" });
    const a = row("Activate", 300, { key: "a", data: { id: 300, loc: LOC_HAND } });
    const b = row("Activate", 300, { key: "b", data: { id: 300, loc: LOC_HAND } });
    expect(planDrop(fieldSpell, [a, b], { kind: "zone", zone: "F" }, targetsOf(fieldSpell, [a, b]))).toEqual({ kind: "menu" });
  });
});

describe("dropPlaceAnswer", () => {
  const NOW = 1_000_000;
  // Bit set = zone unavailable: everything but your own MZONE seq 1 and 3 (M-2, M-4).
  const placePrompt = (player = 0, free = [1, 3]): PromptData => ({
    player, msg: 18, kind: "place", count: 1,
    flag: (0xffffffff & ~free.reduce((m, s) => m | (1 << s), 0)) >>> 0,
  });
  const intent = (zone: string | null, extra = {}) => ({ code: 100, zone, faceDown: false, at: NOW - 100, ...extra });

  it("answers the zone question with the zone dropped on when the engine offers it", () => {
    expect(dropPlaceAnswer(placePrompt(), intent("M-2"), 0, NOW)).toEqual({ player: 0, loc: LOC_MZONE, seq: 1 });
  });

  it("leaves the question to you when the dropped zone isn't offered, or the drop was on the Set chip", () => {
    expect(dropPlaceAnswer(placePrompt(), intent("M-1"), 0, NOW)).toBeNull();
    expect(dropPlaceAnswer(placePrompt(), intent(null), 0, NOW)).toBeNull();
  });

  it("answers only once, only while fresh, only a one-zone question", () => {
    expect(dropPlaceAnswer(placePrompt(), intent("M-2", { placed: true }), 0, NOW)).toBeNull();
    expect(dropPlaceAnswer(placePrompt(), intent("M-2", { at: NOW - DROP_INTENT_TTL_MS - 1 }), 0, NOW)).toBeNull();
    expect(dropPlaceAnswer({ ...placePrompt(), count: 2 }, intent("M-2"), 0, NOW)).toBeNull();
    expect(dropPlaceAnswer({ ...placePrompt(), kind: "position" }, intent("M-2"), 0, NOW)).toBeNull();
    expect(dropPlaceAnswer(placePrompt(), null, 0, NOW)).toBeNull();
  });

  it("maps the second seat's zone ids (M2-x) to the engine's own player", () => {
    // You are ygo-core player 1; the engine's prompt player is whoever you are there (here 0).
    expect(dropPlaceAnswer(placePrompt(0), intent("M2-4"), 1, NOW)).toEqual({ player: 0, loc: LOC_MZONE, seq: 3 });
  });
});

describe("dropPositionAnswer", () => {
  const NOW = 5_000;
  const positionPrompt = (positions: number, code = 100): PromptData => ({ player: 0, msg: 19, kind: "position", code, positions });
  const intent = (faceDown: boolean) => ({ code: 100, zone: "M-1", faceDown, at: NOW });

  it("a summon answers face-up Attack, a Set face-down Defense — when offered", () => {
    expect(dropPositionAnswer(positionPrompt(0x1 | 0x4), intent(false), NOW)).toBe(0x1);
    expect(dropPositionAnswer(positionPrompt(0x1 | 0x8), intent(true), NOW)).toBe(0x8);
    expect(dropPositionAnswer(positionPrompt(0x4), intent(false), NOW)).toBeNull();
  });

  it("only the dropped card's own question", () => {
    expect(dropPositionAnswer(positionPrompt(0x1, 999), intent(false), NOW)).toBeNull();
    expect(dropPositionAnswer({ ...positionPrompt(0x1), code: undefined }, intent(false), NOW)).toBeNull();
  });
});

describe("keepsDropIntent", () => {
  it("a held prompt still belongs to the move; any other answer ends it", () => {
    expect(keepsDropIntent({ available: true, pending: "prompt" })).toBe(true);
    expect(keepsDropIntent({ available: true, pending: "idle" })).toBe(false);
    expect(keepsDropIntent({ available: false })).toBe(false);
    expect(keepsDropIntent(null)).toBe(false);
  });
});

describe("dragTilt", () => {
  it("leans against the motion, capped; none with reduced motion", () => {
    expect(dragTilt(1000, false)).toBeLessThan(0);
    expect(dragTilt(-1000, false)).toBeGreaterThan(0);
    expect(Math.abs(dragTilt(1e6, false))).toBeLessThanOrEqual(0.35);
    expect(dragTilt(1000, true)).toBe(0);
  });
});
