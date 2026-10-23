import { describe, expect, it, vi } from "vitest";
import { YGODuelEvents, YGODuelPhase } from "ygo-core";
import {
  SFX_DURATIONS,
  SFX_NAMES,
  SfxBufferCache,
  createRng,
  isSfxName,
  normalizeSpeed,
  renderSfx,
  sfxLength,
} from "./battle-sfx";
import { bindBattleSfx, BattleSfxDuel } from "./battle-sfx-hooks";

const SR = 44100;

const peak = (s: Float32Array) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (s: Float32Array, from = 0, to = s.length) => {
  let sum = 0;
  for (let i = from; i < to; ++i) sum += s[i] * s[i];
  return Math.sqrt(sum / Math.max(1, to - from));
};

describe("battle sfx DSP", () => {
  it.each(SFX_NAMES)("%s renders finite, normalized samples of the right length", (name) => {
    const samples = renderSfx(name, SR);
    expect(samples.length).toBe(Math.ceil(SFX_DURATIONS[name] * SR));
    expect(samples.every(Number.isFinite)).toBe(true);
    expect(peak(samples)).toBeGreaterThan(0.5);
    expect(peak(samples)).toBeLessThanOrEqual(0.9 + 1e-6);
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(1e-3); // faded tail, no click
  });

  it("is deterministic for a seed", () => {
    expect(renderSfx("attack-swing", SR, 1, 7)).toEqual(renderSfx("attack-swing", SR, 1, 7));
    expect(renderSfx("attack-swing", SR, 1, 7)).not.toEqual(renderSfx("attack-swing", SR, 1, 8));
  });

  it("game speed shortens an effect instead of only pitching it", () => {
    expect(sfxLength("attack-hit", SR, 2)).toBe(Math.ceil((SFX_DURATIONS["attack-hit"] / 2) * SR));
    expect(renderSfx("attack-hit", SR, 3).length).toBeLessThan(renderSfx("attack-hit", SR, 1).length);
  });

  it("normalizes speeds into a small cacheable range", () => {
    expect(normalizeSpeed(1.5)).toBe(1.5);
    expect(normalizeSpeed(100)).toBe(4);
    expect(normalizeSpeed(0)).toBe(1);
    expect(normalizeSpeed(Number.NaN)).toBe(1);
  });

  it("the hit front-loads its energy; the swing swells in the middle", () => {
    const hit = renderSfx("attack-hit", SR);
    const q = Math.floor(hit.length / 4);
    expect(rms(hit, 0, q)).toBeGreaterThan(rms(hit, 3 * q) * 4);

    const swing = renderSfx("attack-swing", SR);
    const tenth = Math.floor(swing.length / 10);
    expect(rms(swing, 4 * tenth, 6 * tenth)).toBeGreaterThan(rms(swing, 0, tenth) * 2);
  });

  it("the heavy hit lasts longer than the normal one", () => {
    expect(renderSfx("attack-hit-heavy", SR).length).toBeGreaterThan(renderSfx("attack-hit", SR).length);
  });

  it("rng stays in [0, 1)", () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; ++i) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("isSfxName guards names", () => {
    expect(isSfxName("phase-battle")).toBe(true);
    expect(isSfxName("boom")).toBe(false);
  });
});

describe("SfxBufferCache", () => {
  const fakeCtx = () => ({
    sampleRate: 8000,
    createBuffer: vi.fn((_c: number, length: number) => {
      const data = new Float32Array(length);
      return { length, getChannelData: () => data } as unknown as AudioBuffer;
    }),
  });

  it("renders each effect once per speed", () => {
    const ctx = fakeCtx();
    const cache = new SfxBufferCache();
    const a = cache.get(ctx, "attack-hit", 1);
    expect(cache.get(ctx, "attack-hit", 1)).toBe(a);
    expect(cache.get(ctx, "attack-hit", 2)).not.toBe(a);
    expect(ctx.createBuffer).toHaveBeenCalledTimes(2);
    expect(peak(a.getChannelData(0))).toBeGreaterThan(0.5);
  });
});

describe("bindBattleSfx", () => {
  function setup() {
    const listeners: Record<string, ((arg: never) => void)[]> = {};
    const on = (event: string, cb: (arg: never) => void) => { (listeners[event] ??= []).push(cb); };
    const emit = (event: string, arg: unknown) => listeners[event]?.forEach((cb) => cb(arg as never));
    const playSfx = vi.fn(() => true);
    let recovering = false;
    const duel = {
      ygo: { events: { on } },
      events: { on },
      commands: { isRecovering: () => recovering },
      soundController: { playSfx },
    } as unknown as BattleSfxDuel;
    bindBattleSfx(duel);
    return { emit, playSfx, setRecovering: (v: boolean) => { recovering = v; } };
  }

  it("swings on attack logs and picks the heavy hit for direct attacks", () => {
    const { emit, playSfx } = setup();
    emit("new-log", { type: YGODuelEvents.LogType.AttackDirectly });
    emit("battle-impact", { player: 1, position: { x: 0, y: 0, z: 0 } });
    emit("new-log", { type: YGODuelEvents.LogType.Attack });
    emit("battle-impact", { player: 1, position: { x: 0, y: 0, z: 0 } });
    expect(playSfx.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      "attack-swing", "attack-hit-heavy", "attack-swing", "attack-hit",
    ]);
  });

  it("plays the battle sweep on the Battle Phase, a soft chime on others, nothing on Draw/Standby", () => {
    const { emit, playSfx } = setup();
    emit("set-duel-phase", { phase: YGODuelPhase.Draw });
    emit("set-duel-phase", { phase: YGODuelPhase.Standby });
    emit("set-duel-phase", { phase: YGODuelPhase.Main1 });
    emit("set-duel-phase", { phase: YGODuelPhase.Battle });
    expect(playSfx.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["phase", "phase-battle"]);
  });

  it("stays silent while recovering (replay goto / undo)", () => {
    const { emit, playSfx, setRecovering } = setup();
    setRecovering(true);
    emit("new-log", { type: YGODuelEvents.LogType.Attack });
    emit("battle-impact", { player: 1 });
    emit("set-duel-phase", { phase: YGODuelPhase.Battle });
    expect(playSfx).not.toHaveBeenCalled();
  });

  it("ignores unrelated logs", () => {
    const { emit, playSfx } = setup();
    emit("new-log", { type: YGODuelEvents.LogType.DuelPhase });
    expect(playSfx).not.toHaveBeenCalled();
  });
});
