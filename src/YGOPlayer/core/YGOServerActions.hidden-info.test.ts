import { describe, expect, it, vi } from "vitest";
import { YGOServerActions } from "./YGOServerActions";

function setup() {
  const sent: { eventName: string; data?: any }[] = [];
  const client: any = {
    send: (eventName: string, data?: any) => sent.push({ eventName, data }),
    onMessage: () => {},
    onDisconnect: () => {},
  };
  const registerCardData = vi.fn();
  const exec = vi.fn();
  const duel: any = {
    ygo: { state: { registerCardData }, peek: () => null, options: {} },
    commands: { exec, isRecovering: () => true },
    events: { dispatch: vi.fn() },
  };
  const actions = new YGOServerActions(duel, client);
  return { actions, sent, registerCardData, exec };
}

describe("YGOServerActions — hidden information", () => {
  it("tells the player when the server refused a command", async () => {
    const { actions, exec } = setup();
    const dispatch = (actions as any).duel.events.dispatch;
    await actions.processServerCommand("server:exec-rejected", { reason: "Only the owner can reveal a hidden card" });
    expect(dispatch).toHaveBeenCalledWith("system-chat-message", { message: "Not allowed: Only the owner can reveal a hidden card" });
    expect(exec).not.toHaveBeenCalled();
  });

  it("registers the card data a command reveals before queuing it", async () => {
    const { actions, registerCardData, exec } = setup();
    const cards = [{ id: 25550531, name: "Purrely" }];
    await actions.processServerCommand("server:exec", {
      type: "ygo:commands:exec",
      data: {
        command: { type: "ChatCommand", data: { username: "a", message: "hi" }, commandId: 3, timestamp: 1 },
        cards,
      },
    });
    expect(registerCardData).toHaveBeenCalledWith(cards);
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it("asks the server for the full replay and resolves with it", async () => {
    const { actions, sent } = setup();
    const pending = actions.server.requestReplay();
    expect(sent.map(m => m.eventName)).toContain("server:replay");
    await actions.processServerCommand("server:replay", { replay: { players: [] } });
    await expect(pending).resolves.toEqual({ players: [] });
  });

  it("rejects when the server keeps the replay (match not over)", async () => {
    const { actions } = setup();
    const pending = actions.server.requestReplay();
    await actions.processServerCommand("server:replay", { error: "The duel is not over yet" });
    await expect(pending).rejects.toThrow("The duel is not over yet");
  });
});
