import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YGOTimerUtils } from "./timer-utils";

const FRAME_MS = 16;

beforeEach(() => {
  vi.useFakeTimers();
  // Node has no animation frames: one frame is a 16 ms timer here.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), FRAME_MS));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("YGOTimerUtils", () => {
  it("runs a timeout once its delay has passed", () => {
    const timers = new YGOTimerUtils();
    const callback = vi.fn();
    timers.setTimeout(callback, 100);
    vi.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("clear cancels every pending timeout", () => {
    const timers = new YGOTimerUtils();
    const a = vi.fn();
    const b = vi.fn();
    timers.setTimeout(a, 10);
    timers.setTimeout(b);
    timers.clear();
    vi.runAllTimers();
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("clearTimer cancels just that one", () => {
    const timers = new YGOTimerUtils();
    const kept = vi.fn();
    const cancelled = vi.fn();
    timers.setTimeout(kept, 10);
    const id = timers.setTimeout(cancelled, 10);
    timers.clearTimer(id);
    vi.runAllTimers();
    expect(kept).toHaveBeenCalledTimes(1);
    expect(cancelled).not.toHaveBeenCalled();
  });

  it("runs an animation frame callback and forgets it afterwards", () => {
    const timers = new YGOTimerUtils();
    const callback = vi.fn();
    timers.requestAnimationFrame(callback);
    vi.advanceTimersByTime(FRAME_MS);
    expect(callback).toHaveBeenCalledTimes(1);
    timers.clear();
    vi.advanceTimersByTime(FRAME_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
