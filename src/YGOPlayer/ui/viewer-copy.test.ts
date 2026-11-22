import { describe, expect, it } from "vitest";
import { YGOClientType } from "ygo-core";
import { isSeatedPlayer } from "./use-duel-turn-state";
import { chatEmptyText } from "./menus/menu-panel/components/chat";
import { turnOwnerLabel } from "../domain/turn-status";

describe("replay, solo and bot duel copy (R-89)", () => {
  it("a replay viewer is not a seated player, so the HUD says \"Turn\", never \"Your turn\"", () => {
    const replay = { client: { type: YGOClientType.PLAYER }, config: { gameMode: "REPLAY" } } as never;
    const live = { client: { type: YGOClientType.PLAYER }, config: { gameMode: "EDITOR" } } as never;
    const spectator = { client: { type: YGOClientType.SPECTATOR }, config: { gameMode: "EDITOR" } } as never;
    expect(isSeatedPlayer(replay)).toBe(false);
    expect(isSeatedPlayer(spectator)).toBe(false);
    expect(isSeatedPlayer(live)).toBe(true);
    expect(turnOwnerLabel({ isPlayerClient: isSeatedPlayer(replay), isLocalTurn: true })).toBe("Turn");
  });

  it("only a duel against a person invites a hello in the empty chat", () => {
    expect(chatEmptyText({ isReplay: false, botDuel: false, solo: false })).toBe("No messages yet. Say hi to your opponent.");
    expect(chatEmptyText({ isReplay: true, botDuel: false, solo: false })).toBe("No messages yet.");
    expect(chatEmptyText({ isReplay: false, botDuel: true, solo: false })).toBe("No messages yet.");
    expect(chatEmptyText({ isReplay: false, botDuel: false, solo: true })).toBe("No messages yet.");
  });
});
