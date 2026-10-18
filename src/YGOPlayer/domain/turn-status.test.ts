import { describe, expect, it } from "vitest";
import { phaseLabel, phaseObjectTooltip, turnOwnerLabel, turnStatusText } from "./turn-status";

describe("turn-status", () => {
  it("says whose turn it is from the viewer's side", () => {
    expect(turnOwnerLabel({ isPlayerClient: true, isLocalTurn: true })).toBe("Your turn");
    expect(turnOwnerLabel({ isPlayerClient: false, isLocalTurn: true })).toBe("Turn");
  });

  it("keeps an unknown phase name as it is", () => {
    expect(phaseLabel("Damage Step")).toBe("Damage Step");
    expect(phaseLabel(undefined)).toBe("");
  });

  it("shows turn 1 before the first turn starts", () => {
    expect(phaseObjectTooltip({ owner: "Turn", turn: 0, phase: null, canChangePhase: false })).toBe("Turn · Turn 1");
  });

  it("leaves the phase out of the status when there is none", () => {
    expect(turnStatusText({ isPlayerClient: true, isLocalTurn: false, phase: null })).toBe("Opponent's turn");
  });
});
