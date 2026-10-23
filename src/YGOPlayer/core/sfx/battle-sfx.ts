/**
 * Procedural battle sound effects (attack swing, hit, phase sweep, LP tick),
 * synthesized into AudioBuffers with the Web Audio API so no audio files are
 * needed on the CDN.
 *
 * The DSP (`renderSfx`) is pure: it fills a Float32Array from a sample rate, a
 * speed and a seeded PRNG, so it is deterministic and testable without an
 * AudioContext. `SfxBufferCache` turns those samples into cached AudioBuffers.
 *
 * Speed (the game speed / timeScale) compresses the envelopes in time without
 * changing pitch: the effect is re-rendered shorter instead of played faster.
 */

export const SFX_NAMES = ["attack-swing", "attack-hit", "attack-hit-heavy", "phase-battle", "phase", "lp-tick"] as const;
export type SfxName = (typeof SFX_NAMES)[number];

/** Each effect's length at speed 1, in seconds. */
export const SFX_DURATIONS: Record<SfxName, number> = {
  "attack-swing": 0.35,
  "attack-hit": 0.25,
  "attack-hit-heavy": 0.42,
  "phase-battle": 0.6,
  "phase": 0.45,
  "lp-tick": 0.04,
};

/** Each effect's mix level (multiplied with the caller's volume and the layer volume). */
export const SFX_GAIN: Record<SfxName, number> = {
  "attack-swing": 0.45,
  "attack-hit": 0.7,
  "attack-hit-heavy": 0.85,
  "phase-battle": 0.55,
  "phase": 0.3,
  "lp-tick": 0.2,
};

const PEAK = 0.9;
const MIN_SPEED = 0.5;
const MAX_SPEED = 4;

export function isSfxName(value: unknown): value is SfxName {
  return typeof value === "string" && (SFX_NAMES as readonly string[]).includes(value);
}

/** The speed an effect is rendered at: clamped and rounded so the cache stays small. */
export function normalizeSpeed(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) return 1;
  return Math.round(Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed)) * 100) / 100;
}

/** Number of samples an effect renders to at `sampleRate` and `speed`. */
export function sfxLength(name: SfxName, sampleRate: number, speed = 1): number {
  return Math.max(1, Math.ceil((SFX_DURATIONS[name] / normalizeSpeed(speed)) * sampleRate));
}

/** Seeded PRNG (mulberry32) returning [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A Chamberlin state-variable filter. `process` takes one input sample and a
 * cutoff (Hz) and returns the band-pass output; `low` holds the low-pass one.
 */
class StateVariableFilter {
  low = 0;
  band = 0;
  constructor(private sampleRate: number, private q: number) { }

  process(input: number, cutoff: number): number {
    // Keep f under the stable range for this topology.
    const f = Math.min(1.4, 2 * Math.sin((Math.PI * Math.min(cutoff, this.sampleRate / 6)) / this.sampleRate));
    const damping = 1 / this.q;
    this.low += f * this.band;
    const high = input - this.low - damping * this.band;
    this.band += f * high;
    return this.band;
  }
}

/** Exponential decay envelope: 1 at t=0, 1/e at t=tau. */
const decay = (t: number, tau: number) => Math.exp(-t / tau);
/** Short linear fade-in so no effect starts with a click. */
const attack = (t: number, time: number) => (t >= time ? 1 : t / time);
/** Equal-loudness-ish exponential interpolation between two frequencies. */
const expLerp = (from: number, to: number, x: number) => from * Math.pow(to / from, Math.min(1, Math.max(0, x)));

/** Peak-normalizes in place and applies a few-sample fade-out so the tail never clicks. */
export function normalize(samples: Float32Array, peak = PEAK): Float32Array {
  let max = 0;
  for (let i = 0; i < samples.length; ++i) max = Math.max(max, Math.abs(samples[i]));
  if (max > 0) {
    const k = peak / max;
    for (let i = 0; i < samples.length; ++i) samples[i] *= k;
  }
  const fade = Math.min(samples.length, 64);
  for (let i = 0; i < fade; ++i) samples[samples.length - 1 - i] *= i / fade;
  return samples;
}

type Renderer = (out: Float32Array, sampleRate: number, speed: number, rng: () => number) => void;

/** Air swish: noise through a band-pass that sweeps up then falls, swelling and fading. */
const renderSwing: Renderer = (out, sr, speed, rng) => {
  const filter = new StateVariableFilter(sr, 1.8);
  const dur = SFX_DURATIONS["attack-swing"];
  for (let i = 0; i < out.length; ++i) {
    const u = (i / sr) * speed; // envelope time (speed-scaled)
    const x = u / dur;
    const cutoff = x < 0.45 ? expLerp(350, 2600, x / 0.45) : expLerp(2600, 700, (x - 0.45) / 0.55);
    const env = Math.sin(Math.PI * Math.min(1, x)) ** 1.6;
    out[i] = filter.process(rng() * 2 - 1, cutoff) * env;
  }
};

/** Body blow: a sine thump falling in pitch plus a short low-passed noise crack. */
function renderHit(heavy: boolean): Renderer {
  return (out, sr, speed, rng) => {
    const noise = new StateVariableFilter(sr, 0.7);
    const startHz = heavy ? 120 : 150;
    const endHz = heavy ? 34 : 48;
    const bodyTau = heavy ? 0.16 : 0.08;
    const crackTau = heavy ? 0.05 : 0.03;
    let phase = 0;
    let subPhase = 0;
    for (let i = 0; i < out.length; ++i) {
      const t = i / sr;
      const u = t * speed;
      const freq = expLerp(startHz, endHz, u / (heavy ? 0.25 : 0.15));
      phase += (2 * Math.PI * freq) / sr;
      let s = Math.sin(phase) * decay(u, bodyTau) * attack(u, 0.002);
      noise.process(rng() * 2 - 1, expLerp(4000, 600, u / 0.08));
      s += noise.low * 1.6 * decay(u, crackTau);
      if (heavy) {
        // A sub layer and soft clipping give the direct hit its weight.
        subPhase += (2 * Math.PI * expLerp(70, 28, u / 0.4)) / sr;
        s += 0.6 * Math.sin(subPhase) * decay(u, 0.22) * attack(u, 0.006);
        s = Math.tanh(s * 1.8);
      }
      out[i] = s;
    }
  };
}

/** Inharmonic bell partials (ratio, relative amplitude, decay seconds). */
const BELL: [number, number, number][] = [
  [1, 1, 0.35],
  [2.0, 0.5, 0.22],
  [2.76, 0.35, 0.16],
  [5.4, 0.18, 0.08],
];

function bell(u: number, t: number, base: number): number {
  let s = 0;
  for (const [ratio, amp, tau] of BELL) s += amp * Math.sin(2 * Math.PI * base * ratio * t) * decay(u, tau);
  return s * attack(u, 0.004);
}

/** Battle Phase: a rising noise sweep into a struck chime (fifth) over a low hit. */
const renderPhaseBattle: Renderer = (out, sr, speed, rng) => {
  const filter = new StateVariableFilter(sr, 2.5);
  const strikeAt = 0.2; // envelope seconds: sweep before, chime after
  let thump = 0;
  for (let i = 0; i < out.length; ++i) {
    const t = i / sr;
    const u = t * speed;
    let s = 0;
    if (u < strikeAt + 0.05) {
      const x = u / strikeAt;
      s += filter.process(rng() * 2 - 1, expLerp(400, 5000, x)) * 0.8 * Math.min(1, x) ** 2 * (u > strikeAt ? decay(u - strikeAt, 0.015) : 1);
    }
    if (u >= strikeAt) {
      const v = u - strikeAt;
      const tv = t - strikeAt / speed;
      s += 0.55 * bell(v, tv, 784) + 0.4 * bell(v, tv, 1175);
      thump += (2 * Math.PI * expLerp(110, 45, v / 0.15)) / sr;
      s += 0.7 * Math.sin(thump) * decay(v, 0.09);
    }
    out[i] = s;
  }
};

/** Any other phase: a soft single chime. */
const renderPhase: Renderer = (out, sr, speed) => {
  for (let i = 0; i < out.length; ++i) {
    const t = i / sr;
    const u = t * speed;
    out[i] = bell(u, t, 1047) * 0.8 + bell(u, t, 1568) * 0.25;
  }
};

/** LP drain tick: a tiny decaying blip. */
const renderTick: Renderer = (out, sr, speed) => {
  for (let i = 0; i < out.length; ++i) {
    const t = i / sr;
    const u = t * speed;
    out[i] = Math.sin(2 * Math.PI * 1800 * t) * decay(u, 0.008) * attack(u, 0.0008);
  }
};

const RENDERERS: Record<SfxName, Renderer> = {
  "attack-swing": renderSwing,
  "attack-hit": renderHit(false),
  "attack-hit-heavy": renderHit(true),
  "phase-battle": renderPhaseBattle,
  "phase": renderPhase,
  "lp-tick": renderTick,
};

/** Renders an effect into a new Float32Array (mono, peak-normalized). Pure and deterministic for a given seed. */
export function renderSfx(name: SfxName, sampleRate: number, speed = 1, seed = 1): Float32Array {
  const s = normalizeSpeed(speed);
  const out = new Float32Array(sfxLength(name, sampleRate, s));
  RENDERERS[name](out, sampleRate, s, createRng(seed));
  return normalize(out);
}

/** The minimal AudioContext surface the cache needs (so tests can fake it). */
export interface SfxAudioContextLike {
  sampleRate: number;
  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer;
}

/** Caches one AudioBuffer per effect and speed for a given context. */
export class SfxBufferCache {
  private buffers = new Map<string, AudioBuffer>();

  get(ctx: SfxAudioContextLike, name: SfxName, speed = 1): AudioBuffer {
    const s = normalizeSpeed(speed);
    const key = `${name}@${s}`;
    let buffer = this.buffers.get(key);
    if (!buffer) {
      const samples = renderSfx(name, ctx.sampleRate, s);
      buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.getChannelData(0).set(samples);
      this.buffers.set(key, buffer);
    }
    return buffer;
  }

  get size() {
    return this.buffers.size;
  }

  clear() {
    this.buffers.clear();
  }
}
