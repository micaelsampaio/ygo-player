import { describe, expect, it } from "vitest";
import { assistPanelTitle, mustStayOpen, opponentWaitingText, passLabel, respondSectionTitle } from "./assist-respond";

describe("opponentWaitingText", () => {
  it("tells the viewer the bot's turn is paused for their response or choice", () => {
    expect(opponentWaitingText({ pending: "chain", isLocalTurn: false, botDuel: true }))
      .toBe("The bot's turn is paused: chain a card, or choose Don't respond.");
    expect(opponentWaitingText({ pending: "prompt", isLocalTurn: false, botDuel: true }))
      .toBe("The bot's turn is paused until you make this choice.");
  });

  it("names the opponent outside bot duels", () => {
    expect(opponentWaitingText({ pending: "chain", isLocalTurn: false, botDuel: false })).toMatch(/^Your opponent is waiting/);
  });

  it("says nothing on the viewer's own turn or without a decision", () => {
    expect(opponentWaitingText({ pending: "chain", isLocalTurn: true, botDuel: true })).toBeNull();
    expect(opponentWaitingText({ pending: "idle", isLocalTurn: false, botDuel: true })).toBeNull();
    expect(opponentWaitingText({ pending: null, isLocalTurn: false, botDuel: true })).toBeNull();
  });
});

describe("assistPanelTitle / mustStayOpen", () => {
  it("titles the panel by what the engine waits on", () => {
    expect(assistPanelTitle({ pending: "prompt", isLocalTurn: true })).toBe("Your choice");
    expect(assistPanelTitle({ pending: "chain", isLocalTurn: false })).toBe("Respond");
    expect(assistPanelTitle({ pending: "chain", isLocalTurn: true })).toBe("Your options");
    expect(assistPanelTitle({ pending: "idle", isLocalTurn: true })).toBe("Your options");
  });

  it("keeps the panel open for a held prompt and an opponent's-turn chain window", () => {
    expect(mustStayOpen({ pending: "prompt", isLocalTurn: true })).toBe(true);
    expect(mustStayOpen({ pending: "chain", isLocalTurn: false })).toBe(true);
    expect(mustStayOpen({ pending: "chain", isLocalTurn: true })).toBe(false);
    expect(mustStayOpen({ pending: "idle", isLocalTurn: false })).toBe(false);
  });
});

describe("chain-aware wording", () => {
  it("says Don't respond only when there is a chain link to respond to", () => {
    expect(passLabel(2)).toBe("Don't respond");
    expect(passLabel(0)).toBe("Continue");
    expect(passLabel(undefined)).toBe("Don't respond");
    expect(respondSectionTitle(1)).toBe("Respond to chain link 1");
    expect(respondSectionTitle(0)).toBe("Activate now");
    expect(respondSectionTitle(undefined)).toBe("Respond");
    expect(respondSectionTitle(1, "Fairy Tail - Luna")).toBe("Respond to Fairy Tail - Luna (chain link 1)");
  });

  it("words the waiting line and title by the chain", () => {
    expect(opponentWaitingText({ pending: "chain", isLocalTurn: false, botDuel: true, chainLength: 1 }))
      .toBe("The bot's turn is paused: respond to chain link 1, or choose Don't respond.");
    expect(opponentWaitingText({ pending: "chain", isLocalTurn: false, botDuel: true, chainLength: 0 }))
      .toBe("The bot's turn is paused: activate a card now, or choose Continue.");
    expect(opponentWaitingText({ pending: "chain", isLocalTurn: false, botDuel: true, chainLength: 1, respondingTo: "Fairy Tail - Luna" }))
      .toBe("The bot's turn is paused: respond to Fairy Tail - Luna (chain link 1), or choose Don't respond.");
    expect(assistPanelTitle({ pending: "chain", isLocalTurn: false, chainLength: 0 })).toBe("Your options");
    expect(assistPanelTitle({ pending: "chain", isLocalTurn: false, chainLength: 3 })).toBe("Respond");
  });
});
