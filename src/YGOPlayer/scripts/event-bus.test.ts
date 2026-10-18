import { describe, expect, it, vi } from "vitest";
import { EventBus } from "./event-bus";

type Events = {
  move: (from: string, to: string) => void;
  done: () => void;
};

describe("EventBus", () => {
  it("calls every listener of an event with its arguments, in order", () => {
    const bus = new EventBus<Events>();
    const calls: string[] = [];
    bus.on("move", (from, to) => calls.push(`a:${from}>${to}`));
    bus.on("move", (from, to) => calls.push(`b:${from}>${to}`));
    bus.dispatch("move", "H-1", "M-3");
    expect(calls).toEqual(["a:H-1>M-3", "b:H-1>M-3"]);
  });

  it("does nothing for an event nobody listens to", () => {
    const bus = new EventBus<Events>();
    expect(() => bus.dispatch("done")).not.toThrow();
  });

  it("off removes only that listener", () => {
    const bus = new EventBus<Events>();
    const kept = vi.fn();
    const removed = vi.fn();
    bus.on("done", kept);
    bus.on("done", removed);
    bus.off("done", removed);
    bus.dispatch("done");
    expect(kept).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
  });

  it("an aborted signal unsubscribes the listener", () => {
    const bus = new EventBus<Events>();
    const listener = vi.fn();
    const controller = new AbortController();
    bus.on("done", listener, { signal: controller.signal });
    bus.dispatch("done");
    controller.abort();
    bus.dispatch("done");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("clear drops one event, clearAll drops all", () => {
    const bus = new EventBus<Events>();
    const move = vi.fn();
    const done = vi.fn();
    bus.on("move", move);
    bus.on("done", done);
    bus.clear("move");
    bus.dispatch("move", "a", "b");
    bus.dispatch("done");
    expect(move).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
    bus.clearAll();
    bus.dispatch("done");
    expect(done).toHaveBeenCalledTimes(1);
  });
});
