import { describe, expect, it } from "vitest";
import { replayChatMessages } from "./chat";

const queue = (commands: Array<{ baseType?: string; data?: unknown }>, index: number) => ({
  index,
  at: (i: number) => commands[i],
});

const chat = (username: string, message: string) => ({ baseType: "ChatCommand", data: { username, message } });
const turn = { baseType: "DuelTurnCommand", data: {} };

describe("replayChatMessages", () => {
  const log = [chat("Alice", "gl"), turn, chat("Bob", "hf"), chat("(spectator) Eve", "hi"), turn, chat("Alice", "gg")];

  it("is empty before the replay starts", () => {
    expect(replayChatMessages(queue(log, -1))).toEqual([]);
  });

  it("gives the chat up to the current command, in order", () => {
    expect(replayChatMessages(queue(log, 3))).toEqual([
      { username: "Alice", message: "gl" },
      { username: "Bob", message: "hf" },
      { username: "(spectator) Eve", message: "hi" },
    ]);
    expect(replayChatMessages(queue(log, 5))).toHaveLength(4);
  });

  it("skips chat without a message", () => {
    expect(replayChatMessages(queue([{ baseType: "ChatCommand", data: {} }, chat("A", "x")], 1))).toEqual([{ username: "A", message: "x" }]);
  });
});
