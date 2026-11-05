import { afterEach, describe, expect, it, vi } from "vitest";
import { YGOSoundController } from "./YGOSoundController";
import { YGOPlayerLogger } from "./YGOPlayerLogger";

describe("YGOSoundController warnings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("warns through the logger when the layer does not exist, without reaching onError", () => {
    vi.stubGlobal("Audio", class { volume = 1; loop = false; playbackRate = 1; });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    const onError = vi.fn();
    const sounds = new YGOSoundController(new YGOPlayerLogger(onError));

    expect(sounds.playSound({ key: "a.mp3", layer: "MISSING" })).toBeNull();
    expect(warn).toHaveBeenCalledWith('YGOSoundController: Layer "MISSING" not found.');
    expect(onError).not.toHaveBeenCalled();
  });
});

describe("YGOSoundController.playSfx", () => {
  afterEach(() => vi.unstubAllGlobals());

  function fakeAudioContext() {
    const started: { buffer: { length: number } | null; gain: number }[] = [];
    class FakeContext {
      sampleRate = 8000;
      state = "running";
      destination = {};
      createBuffer(_c: number, length: number) {
        const data = new Float32Array(length);
        return { length, getChannelData: () => data };
      }
      createGain() {
        return { gain: { value: 1 }, connect: (d: unknown) => d, disconnect() { } };
      }
      createBufferSource() {
        const src = {
          buffer: null as { length: number } | null,
          onended: null,
          connect: (g: { gain: { value: number } }) => { src.gainNode = g; return g; },
          gainNode: null as { gain: { value: number } } | null,
          disconnect() { },
          start: () => started.push({ buffer: src.buffer, gain: src.gainNode!.gain.value }),
        };
        return src;
      }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    vi.stubGlobal("AudioContext", FakeContext);
    return started;
  }

  it("plays through the layer volume and renders shorter at a faster game speed", () => {
    const started = fakeAudioContext();
    const sounds = new YGOSoundController();
    sounds.addLayer({ name: "GAME", volume: 0.5 });
    expect(sounds.playSfx("attack-hit")).toBe(true);
    sounds.setTimeScale(2);
    expect(sounds.playSfx("attack-hit")).toBe(true);
    expect(started).toHaveLength(2);
    expect(started[0].gain).toBeCloseTo(0.5 * 0.7);
    expect(started[1].buffer!.length).toBeLessThan(started[0].buffer!.length);
  });

  it("is silent when the layer is muted, missing, or Web Audio is unavailable", () => {
    const started = fakeAudioContext();
    const sounds = new YGOSoundController();
    sounds.addLayer({ name: "GAME", volume: 0 });
    expect(sounds.playSfx("phase-battle")).toBe(false);
    expect(sounds.playSfx("phase-battle", { layer: "NOPE" })).toBe(false);
    expect(started).toHaveLength(0);

    vi.unstubAllGlobals();
    vi.stubGlobal("AudioContext", undefined);
    const noAudio = new YGOSoundController();
    noAudio.addLayer({ name: "GAME", volume: 1 });
    expect(noAudio.playSfx("attack-swing")).toBe(false);
  });
});

describe("YGOSoundController after the duel is gone", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** An Audio stand-in whose play() the browser blocks (autoplay) or allows. */
  function fakeAudio(blocked: () => boolean) {
    const made: Array<{ paused: boolean; src: string; play: () => Promise<void> }> = [];
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("Audio", class {
      volume = 1; loop = false; playbackRate = 1; currentTime = 0; paused = true; src = "";
      onended: null | (() => void) = null;
      constructor() { made.push(this as never); }
      play() {
        if (blocked()) return Promise.reject(new Error("NotAllowedError"));
        this.paused = false;
        return Promise.resolve();
      }
      pause() { this.paused = true; }
      remove() { }
    });
    return made;
  }
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it("blocked music starts on the next click while the duel is there", async () => {
    let blocked = true;
    const made = fakeAudio(() => blocked);
    const sounds = new YGOSoundController();
    sounds.addLayer({ name: "GAME_MUSIC", useTimeScale: false });
    sounds.playSound({ key: "music.mp3", layer: "GAME_MUSIC", loop: true, retryOnGesture: true });
    await flush();
    expect(made[0].paused).toBe(true);
    blocked = false;
    window.dispatchEvent(new Event("click"));
    await flush();
    expect(made[0].paused).toBe(false);
    // And the teardown stops it (it's tracked on its layer again).
    sounds.onDestroy();
    expect(made[0].paused).toBe(true);
  });

  it("blocked music never starts after leaving, not even on the next page's first click", async () => {
    let blocked = true;
    const made = fakeAudio(() => blocked);
    const sounds = new YGOSoundController();
    sounds.addLayer({ name: "GAME_MUSIC", useTimeScale: false });
    sounds.playSound({ key: "music.mp3", layer: "GAME_MUSIC", loop: true, retryOnGesture: true });
    await flush();
    sounds.onDestroy();
    blocked = false;
    window.dispatchEvent(new Event("click"));
    await flush();
    expect(made.every((a) => a.paused)).toBe(true);
  });

  it("plays nothing once destroyed (a late timer, the music index arriving after the duel left)", () => {
    const made = fakeAudio(() => false);
    const sounds = new YGOSoundController();
    sounds.addLayer({ name: "GAME" });
    sounds.onDestroy();
    expect(sounds.playSound({ key: "late.mp3" })).toBeNull();
    expect(sounds.playSfx("hit" as never)).toBe(false);
    expect(made).toHaveLength(0);
  });
});
