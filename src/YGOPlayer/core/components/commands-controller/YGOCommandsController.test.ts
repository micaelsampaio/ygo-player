import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YGOCommandsController, YGOCommandsControllerState } from "./YGOCommandsController";
import { BaseControllerCommand, ControllerCommandTag } from "./commands";
import { YGOCommandHandler } from "../YGOCommandHandler";
import { YGOPlayerLogger } from "../../YGOPlayerLogger";

class TestHandler extends YGOCommandHandler {
  constructor() { super("test_handler"); }
  start = vi.fn();
  finish = vi.fn();
}

/** A queued command that records its exec/finish into `log`. */
class TestCommand extends BaseControllerCommand {
  constructor(
    private id: string,
    private log: string[],
    opts: { tags?: ControllerCommandTag[]; withHandler?: boolean; throws?: boolean } = {},
  ) {
    super();
    this.type = id;
    if (opts.tags) this.addTag(...opts.tags);
    if (opts.withHandler) this.handler = new TestHandler();
    this.throws = !!opts.throws;
  }
  private throws: boolean;
  exec() {
    this.log.push(`exec:${this.id}`);
    if (this.throws) throw new Error(`boom:${this.id}`);
  }
  finish() {
    this.log.push(`finish:${this.id}`);
    super.finish();
  }
}

function createDuel({ onError }: { onError?: ReturnType<typeof vi.fn> } = {}) {
  const dispatched: string[] = [];
  const duel = {
    ygo: {
      peek: vi.fn(() => undefined),
      hasNextCommand: vi.fn(() => false),
      goToCommand: vi.fn(),
    },
    serverActions: { controls: { play: vi.fn() } },
    updateField: vi.fn(),
    events: { dispatch: vi.fn((name: string) => dispatched.push(name)) },
    tasks: { startTask: vi.fn(), completeTask: vi.fn() },
    soundController: { playSound: vi.fn() },
    logger: new YGOPlayerLogger(onError as any),
  };
  return { duel, dispatched };
}

describe("YGOCommandsController", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("runs plain commands one at a time in FIFO order", () => {
    const { duel } = createDuel();
    const controller = new YGOCommandsController(duel as any);
    const log: string[] = [];
    controller.exec(new TestCommand("a", log));
    controller.exec(new TestCommand("b", log));
    controller.exec(new TestCommand("c", log));
    // Nothing is current between commands, so each exec() runs its command right away.
    vi.runAllTimers();
    expect(log).toEqual(["exec:a", "finish:a", "exec:b", "finish:b", "exec:c", "finish:c"]);
    expect(controller.isBusy()).toBe(false);
  });

  it("keeps a command with a handler current until it is finished", () => {
    const { duel, dispatched } = createDuel();
    const controller = new YGOCommandsController(duel as any);
    const log: string[] = [];
    const handled = new TestCommand("h", log, { withHandler: true });
    controller.exec(handled);
    controller.exec(new TestCommand("next", log));
    vi.runAllTimers();
    expect(log).toEqual(["exec:h"]);
    expect(controller.isLocked()).toBeTruthy();
    expect(controller.isBusy()).toBe(true);

    controller.finishCurrentCommand();
    controller.processNextCommand();
    vi.runAllTimers();
    expect(log).toEqual(["exec:h", "finish:h", "exec:next", "finish:next"]);
    expect(handled.handler).toBeDefined();
    expect((handled.handler as TestHandler).finish).toHaveBeenCalledTimes(1);
    expect(dispatched).toContain("commands-process-completed");
  });

  it("puts game-event-handler commands ahead of plain queued commands, behind other handlers", () => {
    const { duel } = createDuel();
    const controller = new YGOCommandsController(duel as any);
    const log: string[] = [];
    // Block the queue so the order of what is queued behind it is observable.
    controller.exec(new TestCommand("block", log, { withHandler: true }));
    controller.exec(new TestCommand("plain1", log));
    controller.exec(new TestCommand("ev1", log, { tags: [ControllerCommandTag.GAME_EVENT_HANDLER] }));
    controller.exec(new TestCommand("plain2", log));
    controller.exec(new TestCommand("ev2", log, { tags: [ControllerCommandTag.GAME_EVENT_HANDLER] }));

    controller.finishCurrentCommand();
    controller.processNextCommand();
    vi.runAllTimers();
    expect(log.filter((l) => l.startsWith("exec:"))).toEqual([
      "exec:block", "exec:ev1", "exec:ev2", "exec:plain1", "exec:plain2",
    ]);
  });

  it("runs EXEC_IMMEDIATLY commands right away, finishing the current one first", () => {
    const { duel } = createDuel();
    const controller = new YGOCommandsController(duel as any);
    const log: string[] = [];
    controller.exec(new TestCommand("current", log, { withHandler: true }));
    controller.exec(new TestCommand("now", log, { tags: [ControllerCommandTag.EXEC_IMMEDIATLY] }));
    expect(log).toEqual(["exec:current", "finish:current", "exec:now", "finish:now"]);
  });

  it("skips a command that throws, logs it and goes on with the next one", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    const onError = vi.fn();
    const { duel } = createDuel({ onError });
    const controller = new YGOCommandsController(duel as any);
    const log: string[] = [];
    const bad = new TestCommand("bad", log, { throws: true });
    controller.exec(bad);
    controller.exec(new TestCommand("good", log));
    vi.runAllTimers();

    expect(log).toEqual(["exec:bad", "finish:bad", "exec:good", "finish:good"]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toBe("YGOCommandsController: command exec failed, skipping it");
    expect(errorSpy.mock.calls[0][1]).toBe(bad);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][1]).toEqual({ source: "YGOCommandsController", details: bad });
    expect((onError.mock.calls[0][0] as Error).message).toBe("boom:bad");
  });

  it("dispatches completion events once the queue is drained", () => {
    const { duel, dispatched } = createDuel();
    const controller = new YGOCommandsController(duel as any);
    controller.exec(new TestCommand("a", []));
    vi.runAllTimers();
    expect(duel.updateField).toHaveBeenCalled();
    expect(dispatched).toEqual(["enable-game-actions", "commands-process-completed"]);
    expect(controller.getState()).toBe(YGOCommandsControllerState.IDLE);
  });

  it("keeps requesting the next server command while PLAYING", () => {
    const { duel, dispatched } = createDuel();
    duel.ygo.hasNextCommand.mockReturnValue(true);
    const controller = new YGOCommandsController(duel as any);
    controller.setState(YGOCommandsControllerState.PLAYING);
    controller.processNextCommand();
    expect(dispatched).toEqual([]);
    vi.advanceTimersByTime(100);
    expect(duel.serverActions.controls.play).toHaveBeenCalledTimes(1);
  });

  describe("recovery", () => {
    it("does not process the queue while recovering", () => {
      const { duel } = createDuel();
      const controller = new YGOCommandsController(duel as any);
      controller.setRecoverState(true);
      const log: string[] = [];
      controller.exec(new TestCommand("a", log));
      vi.runAllTimers();
      expect(log).toEqual([]);
      expect(controller.isLocked()).toBeTruthy();
    });

    it("startRecover finishes the current command and flushes the queue in FIFO order", () => {
      const { duel } = createDuel();
      const controller = new YGOCommandsController(duel as any);
      const log: string[] = [];
      controller.exec(new TestCommand("current", log, { withHandler: true }));
      controller.exec(new TestCommand("q1", log));
      controller.exec(new TestCommand("q2", log));
      controller.startRecover();
      expect(log).toEqual([
        "exec:current", "finish:current", "exec:q1", "finish:q1", "exec:q2", "finish:q2",
      ]);
      expect(controller.isRecovering()).toBe(true);
      expect(controller.getState()).toBe(YGOCommandsControllerState.IDLE);
      controller.endRecover();
      expect(controller.isRecovering()).toBe(false);
      expect(controller.isBusy()).toBe(false);
    });

    it("a requested pause rewinds to the paused command once the queue drains", () => {
      const { duel } = createDuel();
      duel.ygo.peek.mockReturnValue({ commandId: 3 } as any);
      const controller = new YGOCommandsController(duel as any);
      controller.setState(YGOCommandsControllerState.PLAYING);
      controller.pause({ commandId: 5 });
      controller.processNextCommand();
      expect(duel.ygo.goToCommand).toHaveBeenCalledWith(5);
      expect(controller.isRecovering()).toBe(false);
      expect(controller.getState()).toBe(YGOCommandsControllerState.IDLE);
      expect(duel.serverActions.controls.play).not.toHaveBeenCalled();
    });

    it("clearCommandsQueue drops queued commands without running them", () => {
      const { duel } = createDuel();
      const controller = new YGOCommandsController(duel as any);
      const log: string[] = [];
      controller.exec(new TestCommand("current", log, { withHandler: true }));
      controller.exec(new TestCommand("dropped", log));
      controller.clearCommandsQueue();
      vi.runAllTimers();
      expect(log).toEqual(["exec:current", "finish:current"]);
    });
  });
});
