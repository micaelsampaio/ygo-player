/* eslint-disable @typescript-eslint/no-explicit-any -- a hand-rolled duel stub */
/**
 * F5: processYGOLog runs inside the core's own command exec (the core
 * dispatches "new-log" mid-command). A duel-event handler that throws while
 * being built must not escape into the core — that aborted the command
 * half-done and the live board drifted from the server's.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ throws: true, built: 0 }));
vi.mock("../../../duel-events", async () => {
  const { YGOCommandHandler } = await import("../YGOCommandHandler");
  class TestLogHandler extends YGOCommandHandler {
    constructor() {
      super("test_log_handler");
      h.built++;
      if (h.throws) throw new Error('card "1 - X" not found in "H2"');
    }
    start = vi.fn();
  }
  return { getDuelEventHandler: () => TestLogHandler };
});

import { YGOCommandsController } from "./YGOCommandsController";
import { YGOPlayerLogger } from "../../YGOPlayerLogger";

function createDuel(onError = vi.fn()) {
  const duel = {
    ygo: { peek: vi.fn(() => undefined), hasNextCommand: vi.fn(() => false), goToCommand: vi.fn() },
    serverActions: { controls: { play: vi.fn() } },
    updateField: vi.fn(),
    events: { dispatch: vi.fn() },
    tasks: { startTask: vi.fn(), completeTask: vi.fn() },
    soundController: { playSound: vi.fn() },
    logger: new YGOPlayerLogger(onError),
  };
  return { duel, onError };
}

describe("YGOCommandsController.processYGOLog", () => {
  beforeEach(() => { vi.useFakeTimers(); h.built = 0; });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("a handler that throws while being built is reported and skipped, not thrown into the core", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    h.throws = true;
    const { duel, onError } = createDuel();
    const controller = new YGOCommandsController(duel as any);
    const log = { type: "To Hand", id: 1, zone: "H2" } as any;

    expect(() => controller.processYGOLog(log)).not.toThrow();
    expect(h.built).toBe(1);
    expect(errorSpy.mock.calls[0][0]).toBe("YGOCommandsController: duel log handler failed, skipping its animation");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'card "1 - X" not found in "H2"' }), expect.objectContaining({ source: "YGOCommandsController", details: log }));

    // The queue is not stuck: once it empties the board is redrawn from the core.
    vi.runAllTimers();
    controller.processNextCommand();
    expect(duel.updateField).toHaveBeenCalled();
  });

  it("a handler that builds is queued and started as before", () => {
    h.throws = false;
    const { duel, onError } = createDuel();
    const controller = new YGOCommandsController(duel as any);
    (duel as any).commands = controller;
    controller.processYGOLog({ type: "To Hand", id: 1, zone: "H2-1" } as any);
    expect(h.built).toBe(1);
    expect(onError).not.toHaveBeenCalled();
    expect((controller as any).currentCommand?.handler?.start).toHaveBeenCalledTimes(1);
  });
});
