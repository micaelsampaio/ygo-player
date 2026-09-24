import { describe, expect, it } from "vitest";
import { assistErrorMessage, assistUnavailableReason, canSurrender, endGameActionsFor, endGameHeadline, phaseLabel, phaseObjectTooltip, turnOwnerLabel, turnStatusText } from "./duel-status";

describe("phaseLabel", () => {
  it("names every ygo-core phase", () => {
    expect(phaseLabel("Draw")).toBe("Draw Phase");
    expect(phaseLabel("Standby")).toBe("Standby Phase");
    expect(phaseLabel("Main Phase 1")).toBe("Main Phase 1");
    expect(phaseLabel("Battle")).toBe("Battle Phase");
    expect(phaseLabel("Main Phase 2")).toBe("Main Phase 2");
    expect(phaseLabel("End")).toBe("End Phase");
  });

  it("passes unknown values through and blanks missing ones", () => {
    expect(phaseLabel("Damage Step")).toBe("Damage Step");
    expect(phaseLabel(undefined)).toBe("");
  });
});

describe("turn wording", () => {
  it("speaks from the seated player's side", () => {
    expect(turnOwnerLabel({ isPlayerClient: true, isLocalTurn: true })).toBe("Your turn");
    expect(turnOwnerLabel({ isPlayerClient: true, isLocalTurn: false })).toBe("Opponent's turn");
  });

  it("stays neutral for spectators", () => {
    expect(turnOwnerLabel({ isPlayerClient: false, isLocalTurn: true })).toBe("Turn");
  });

  it("joins owner and phase", () => {
    expect(turnStatusText({ isPlayerClient: true, isLocalTurn: true, phase: "Main Phase 1" })).toBe("Your turn · Main Phase 1");
    expect(turnStatusText({ isPlayerClient: true, isLocalTurn: false, phase: "Battle" })).toBe("Opponent's turn · Battle Phase");
    expect(turnStatusText({ isPlayerClient: true, isLocalTurn: false })).toBe("Opponent's turn");
  });
});

describe("assistUnavailableReason", () => {
  const base = { loading: false, gameActive: true, isLocalTurn: true, hasPriority: true };

  it("says the duel is over before anything else", () => {
    expect(assistUnavailableReason({ ...base, loading: true, gameActive: false })).toBe("The duel is over.");
  });

  it("says it's checking until the first answer", () => {
    expect(assistUnavailableReason({ ...base, loading: true })).toBe("Checking your options…");
  });

  it("explains the opponent's turn, with and without priority", () => {
    expect(assistUnavailableReason({ ...base, isLocalTurn: false, hasPriority: false })).toMatch(/Waiting for the opponent/);
    expect(assistUnavailableReason({ ...base, isLocalTurn: false, hasPriority: true })).toMatch(/Respond with OK/);
  });

  it("explains waiting on the opponent's response during your turn", () => {
    expect(assistUnavailableReason({ ...base, hasPriority: false })).toBe("Waiting for the opponent to respond…");
  });

  it("calls a response window on your own priority 'not your window'", () => {
    expect(assistUnavailableReason(base)).toMatch(/^Not your window/);
  });
});

describe("assistErrorMessage", () => {
  it("maps known server errors", () => {
    expect(assistErrorMessage({ success: false, error: "stale options" })).toMatch(/no longer available/);
    expect(assistErrorMessage({ success: false, error: "busy" })).toMatch(/Still processing/);
  });

  it("handles Errors, strings and unknown shapes", () => {
    expect(assistErrorMessage(new Error("SocketIO: Not connected to server"))).toBe("That choice was rejected (SocketIO: Not connected to server).");
    expect(assistErrorMessage("rate limit")).toMatch(/Too many choices/);
    expect(assistErrorMessage(undefined)).toMatch(/rejected/);
  });
});

describe("canSurrender", () => {
  it("lets a seated player surrender a live duel", () => {
    expect(canSurrender({ isPlayerClient: true, gameMode: "EDITOR" })).toBe(true);
    expect(canSurrender({ isPlayerClient: true })).toBe(true);
  });

  it("hides it for spectators/judges and replays", () => {
    expect(canSurrender({ isPlayerClient: false, gameMode: "EDITOR" })).toBe(false);
    expect(canSurrender({ isPlayerClient: true, gameMode: "REPLAY" })).toBe(false);
  });
});

describe("endGameHeadline", () => {
  it("speaks from a seated player's side", () => {
    expect(endGameHeadline({ isPlayerClient: true, localPlayerLost: false, winnerName: "Yugi" })).toEqual({ text: "Victory", tone: "win" });
    expect(endGameHeadline({ isPlayerClient: true, localPlayerLost: true, winnerName: "Kaiba" })).toEqual({ text: "Defeated", tone: "loss" });
  });

  it("names the winner for spectators instead of Victory/Defeated", () => {
    expect(endGameHeadline({ isPlayerClient: false, localPlayerLost: true, winnerName: "Kaiba" })).toEqual({ text: "Kaiba wins", tone: "neutral" });
    expect(endGameHeadline({ isPlayerClient: false, localPlayerLost: false })).toEqual({ text: "Duel over", tone: "neutral" });
  });
});

describe("phaseObjectTooltip", () => {
  it("tells a seated player the object is clickable", () => {
    expect(phaseObjectTooltip({ owner: "Your turn", turn: 3, phase: "Main Phase 1", canChangePhase: true }))
      .toBe("Your turn · Turn 3 · Main Phase 1 — click to change phase");
  });

  it("gives spectators the status only", () => {
    expect(phaseObjectTooltip({ owner: "Yugi", turn: 2, phase: "Battle", canChangePhase: false })).toBe("Yugi · Turn 2 · Battle Phase");
  });

  it("clamps turn 0 and skips empty parts", () => {
    expect(phaseObjectTooltip({ owner: "", turn: 0, phase: "Draw", canChangePhase: false })).toBe("Turn 1 · Draw Phase");
  });
});

describe("endGameActionsFor", () => {
  const all = ["back-to-lobby", "rematch", "save-replay"] as const;

  it("shows a seated player every enabled next step, in a fixed order", () => {
    expect(endGameActionsFor({ isPlayerClient: true, enabled: all })).toEqual(["save-replay", "rematch", "back-to-lobby"]);
    expect(endGameActionsFor({ isPlayerClient: true, enabled: ["back-to-lobby", "save-replay"] })).toEqual(["save-replay", "back-to-lobby"]);
  });

  it("only offers spectators the way back to the lobby", () => {
    expect(endGameActionsFor({ isPlayerClient: false, enabled: all })).toEqual(["back-to-lobby"]);
    expect(endGameActionsFor({ isPlayerClient: false, enabled: ["rematch"] })).toEqual([]);
  });

  it("shows nothing the host didn't enable", () => {
    expect(endGameActionsFor({ isPlayerClient: true })).toEqual([]);
  });
});
