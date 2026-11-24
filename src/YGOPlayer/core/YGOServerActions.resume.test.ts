import { describe, expect, it, vi } from "vitest";
import { DUEL_GONE_MESSAGE, YGOServerActions } from "./YGOServerActions";

const exec = (commandId: number) => ({ type: "ygo:commands:exec", data: { command: { type: "DuelPhaseCommand", data: { phase: "Standby" }, commandId, timestamp: commandId } } });

function setup(resume?: (lastCommandId: number) => Promise<unknown>) {
  const client: any = { send: vi.fn(), onMessage: () => {}, onDisconnect: () => {} };
  const commands = { exec: vi.fn(), isRecovering: () => true };
  const dispatch = vi.fn();
  const duel: any = {
    ygo: { state: { registerCardData: vi.fn() }, options: {} },
    commands,
    events: { dispatch },
    assist: resume ? { query: vi.fn(), choose: vi.fn(), resume: vi.fn(resume) } : undefined,
    connectionLost: false,
  };
  return { actions: new YGOServerActions(duel, client), commands, dispatch, duel };
}

const playedIds = (commands: { exec: ReturnType<typeof vi.fn> }) => commands.exec.mock.calls.map(([e]) => e.command.commandId);

describe("YGOServerActions — resuming after a reconnect", () => {
  it("asks from the newest command it got and plays the ones it missed, once", async () => {
    let actions!: YGOServerActions;
    const resume = vi.fn(async (last: number) => {
      expect(last).toBe(4);
      // Command 5 came live while the ack was on its way: the ack's copy is not played again.
      await actions.processServerCommand("server:exec", exec(5));
      return { success: true, commands: [exec(5), exec(6), exec(7)] };
    });
    const t = setup(resume);
    actions = t.actions;
    for (const id of [0, 1, 2, 3, 4]) await actions.processServerCommand("server:exec", exec(id));
    expect(await actions.resumeAfterReconnect()).toBe("resumed");
    expect(playedIds(t.commands)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(actions.lastReceivedCommandId).toBe(7);
    // The panel asks the engine for the options again.
    expect(t.dispatch).toHaveBeenCalledWith("assist-refresh", {});
  });

  it("the server no longer has the duel: the player is told and the duel stops", async () => {
    // kaibaNet.emitEvent rejects with the ack when it carries an error.
    const t = setup(() => Promise.reject({ success: false, error: "Room not found", gone: true }));
    expect(await t.actions.resumeAfterReconnect()).toBe("gone");
    expect(t.duel.connectionLost).toBe(true);
    expect(t.dispatch).toHaveBeenCalledWith("system-chat-message", { message: DUEL_GONE_MESSAGE });
    expect(t.commands.exec).not.toHaveBeenCalled();
  });

  it("any other refusal, or a host without resume: nothing played", async () => {
    const refused = setup(() => Promise.reject({ success: false, error: "not a player" }));
    expect(await refused.actions.resumeAfterReconnect()).toBe("failed");
    expect(refused.duel.connectionLost).toBe(false);
    expect(await setup().actions.resumeAfterReconnect()).toBe("failed");
  });
});
