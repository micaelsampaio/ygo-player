import { describe, expect, it } from "vitest";
import { BOT_COMMAND_SOURCE, isBotActivation, markBotActivation, spotlightZone, takeBotActivation } from "./bot-spotlight";

describe("isBotActivation", () => {
  it("is true only for an ActivateCardCommand the server tagged as the bot's", () => {
    expect(isBotActivation({ type: "ActivateCardCommand", data: { player: 1, id: 5, zone: "S2-1", source: BOT_COMMAND_SOURCE } })).toBe(true);
    expect(isBotActivation({ type: "ActivateCardCommand", data: { player: 1, id: 5, zone: "S2-1" } })).toBe(false);
    expect(isBotActivation({ type: "MoveCardCommand", data: { source: BOT_COMMAND_SOURCE } })).toBe(false);
    expect(isBotActivation(undefined)).toBe(false);
  });
});

describe("spotlightZone", () => {
  it("is where the card is played from when it moves, else where it is", () => {
    expect(spotlightZone({ originZone: "H2-2", zone: "S2-1" })).toBe("H2-2");
    expect(spotlightZone({ zone: "M2-3" })).toBe("M2-3");
  });
});

describe("markBotActivation / takeBotActivation", () => {
  const bot = (commandId?: number) => ({ type: "ActivateCardCommand", commandId, data: { source: BOT_COMMAND_SOURCE } });

  it("remembers the bot's activations per duel, each taken once", () => {
    const duel = {};
    const other = {};
    markBotActivation(duel, bot(7));
    markBotActivation(duel, { type: "ActivateCardCommand", commandId: 8, data: {} });
    expect(takeBotActivation(other, 7)).toBe(false);
    expect(takeBotActivation(duel, 8)).toBe(false);
    expect(takeBotActivation(duel, 7)).toBe(true);
    expect(takeBotActivation(duel, 7)).toBe(false);
  });

  it("ignores a command without an id", () => {
    const duel = {};
    markBotActivation(duel, bot(undefined));
    expect(takeBotActivation(duel, undefined)).toBe(false);
  });
});
