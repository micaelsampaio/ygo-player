import { describe, expect, it, vi } from "vitest";
import { YGOCoachController } from "./YGOCoachController";
import type { CoachHost, CoachStats } from "../types";

function hostWith(over: Partial<CoachHost> = {}): CoachHost {
  return {
    enabled: true,
    setEnabled: vi.fn(() => Promise.resolve({ success: true })),
    preview: vi.fn(() => Promise.resolve({ available: false })),
    suggest: vi.fn(() => Promise.resolve({ available: false, reason: "Not your Main Phase" })),
    ...over,
  };
}

describe("YGOCoachController", () => {
  it("is off without a host", () => {
    const c = new YGOCoachController(() => undefined);
    expect(c.getState().available).toBe(false);
    expect(c.active).toBe(false);
  });

  it("reads the host lazily (assist is set after the duel is built)", () => {
    let host: CoachHost | undefined;
    const c = new YGOCoachController(() => host);
    expect(c.active).toBe(false);
    host = hostWith({ stats: { format: "TCG" } });
    expect(c.active).toBe(true);
    expect(c.getState().stats?.format).toBe("TCG");
  });

  it("toggles through setEnabled and notifies", async () => {
    const host = hostWith();
    const c = new YGOCoachController(() => host);
    const listener = vi.fn();
    c.subscribe(listener);
    await c.setEnabled(false);
    expect(host.setEnabled).toHaveBeenCalledWith(false);
    expect(c.getState()).toMatchObject({ enabled: false, everEnabled: true, switching: false, error: null });
    expect(listener).toHaveBeenCalled();
  });

  it("flips back with the reason when the server refuses", async () => {
    const host = hostWith({ enabled: false, setEnabled: vi.fn(() => Promise.resolve({ success: false, error: "Not a bot duel" })) });
    const c = new YGOCoachController(() => host);
    await c.setEnabled(true);
    expect(c.getState()).toMatchObject({ enabled: false, error: "Not a bot duel" });
  });

  it("takes stats pushed by the host", () => {
    let push: ((s: CoachStats | null) => void) | undefined;
    const unsubscribe = vi.fn();
    const host = hostWith({ onStats: (cb) => { push = cb; return unsubscribe; } });
    const c = new YGOCoachController(() => host);
    c.getState();
    push?.({ format: "TCG", matchup: null });
    expect(c.getState().stats).toEqual({ format: "TCG", matchup: null });
    c.dispose();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("keeps a preview only for its decision", async () => {
    const host = hostWith({ preview: vi.fn(() => Promise.resolve({ available: true, options: [] })) });
    const c = new YGOCoachController(() => host);
    await c.preview("a");
    expect(c.previewFor("a")).toEqual({ status: "done", key: "a", result: { available: true, options: [] } });
    expect(c.previewFor("b")).toEqual({ status: "idle" });
    await c.preview("a");
    expect(host.preview).toHaveBeenCalledTimes(1);
  });

  it("doesn't cache an unavailable preview (the rate limit's answer): it can be asked again", async () => {
    const preview = vi.fn().mockResolvedValueOnce({ available: false }).mockResolvedValueOnce({ available: true, options: [] });
    const host = hostWith({ preview });
    const c = new YGOCoachController(() => host);
    await c.preview("a");
    expect(c.previewFor("a")).toEqual({ status: "retry", key: "a" });
    await c.preview("a");
    expect(preview).toHaveBeenCalledTimes(2);
    expect(c.previewFor("a").status).toBe("done");
  });

  it("off at the start: turning it on works, then suggest and preview go through", async () => {
    const host = hostWith({ enabled: false });
    const c = new YGOCoachController(() => host);
    expect(c.getState()).toMatchObject({ available: true, enabled: false });
    await c.setEnabled(true);
    expect(host.setEnabled).toHaveBeenCalledWith(true);
    expect(c.active).toBe(true);
    await c.suggest(1);
    expect(host.suggest).toHaveBeenCalled();
  });

  it("answers the suggestion, or a friendly reason when the call fails", async () => {
    const host = hostWith({ suggest: () => Promise.reject(new Error("timeout")) });
    const c = new YGOCoachController(() => host);
    await c.suggest(3);
    const s = c.getState().suggest;
    expect(s.status === "done" && s.turn === 3 && !s.result.available && s.result.reason).toContain("try again");
  });

  it("does nothing while the coach is off", async () => {
    const host = hostWith({ enabled: false });
    const c = new YGOCoachController(() => host);
    await c.suggest(1);
    await c.preview("a");
    expect(host.suggest).not.toHaveBeenCalled();
    expect(host.preview).not.toHaveBeenCalled();
  });

  it("posts each coach line once, only while on, and the suggested line too", async () => {
    const host = hostWith({
      suggest: vi.fn(() => Promise.resolve({ available: true, steps: ["Normal Summon X"], end: { interruptions: 2, now: 0 }, ms: 5 })),
    });
    const c = new YGOCoachController(() => host);
    c.post("tip:2", "Lethal.");
    c.post("tip:2", "Lethal again.");
    expect(c.getState().messages.map((m) => m.text)).toEqual(["Lethal."]);
    await c.suggest(2);
    expect(c.getState().messages[1].text).toContain("Suggested line for turn 2:\n1. Normal Summon X");
    await c.setEnabled(false);
    c.post("tip:3", "Off now.");
    expect(c.getState().messages).toHaveLength(2);
  });
});
