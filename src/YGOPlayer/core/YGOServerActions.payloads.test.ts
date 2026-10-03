import { afterEach, describe, expect, it, vi } from "vitest";
import { YGOServerActions } from "./YGOServerActions";

function setup() {
  const client: any = { send: vi.fn(), onMessage: () => {}, onDisconnect: () => {} };
  const commands = {
    exec: vi.fn(),
    isRecovering: () => true,
    previousCommand: vi.fn(),
    nextCommand: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    goToCommand: vi.fn(),
  };
  const dispatch = vi.fn();
  const duel: any = {
    ygo: { state: { registerCardData: vi.fn() }, peek: () => null, options: {} },
    commands,
    events: { dispatch },
  };
  const actions = new YGOServerActions(duel, client);
  return { actions, commands, dispatch };
}

describe("YGOServerActions — server:exec payloads", () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    ["ygo:commands:previous", "previousCommand"],
    ["ygo:commands:next", "nextCommand"],
    ["ygo:commands:play", "play"],
    ["ygo:commands:pause", "pause"],
    ["ygo:commands:goto_command", "goToCommand"],
  ] as const)("%s moves the timeline with its commandId", async (type, method) => {
    const { actions, commands } = setup();
    await actions.processServerCommand("server:exec", { type, data: { commandId: 7 } });
    expect(commands[method]).toHaveBeenCalledWith({ commandId: 7 });
    expect(commands.exec).not.toHaveBeenCalled();
  });

  it("queues an executed command with its id and timestamp", async () => {
    const { actions, commands } = setup();
    await actions.processServerCommand("server:exec", {
      type: "ygo:commands:exec",
      data: { command: { type: "ChatCommand", data: { username: "a", message: "hi" }, commandId: 3, timestamp: 11 } },
    });
    expect(commands.exec).toHaveBeenCalledTimes(1);
    const queued = commands.exec.mock.calls[0][0];
    expect(queued.command.commandId).toBe(3);
    expect(queued.command.timestamp).toBe(11);
  });

  it("ygo:replay:start flags the UI config and starts playback", async () => {
    vi.useFakeTimers();
    const { actions, dispatch } = setup();
    const play = vi.spyOn(actions.controls, "play").mockImplementation(() => {});
    (actions as any).duel.serverActions = actions;
    await actions.processServerCommand("server:exec", { type: "ygo:replay:start", data: {} });
    expect(dispatch).toHaveBeenCalledWith("update-game-ui-config", { startReplay: true });
    vi.advanceTimersByTime(500);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("ignores unknown payload types", async () => {
    const { actions, commands, dispatch } = setup();
    await actions.processServerCommand("server:exec", { type: "ygo:unknown", data: {} });
    Object.values(commands).forEach((fn) => typeof fn === "function" && "mock" in fn && expect(fn).not.toHaveBeenCalled());
    expect(dispatch).not.toHaveBeenCalled();
  });
});
