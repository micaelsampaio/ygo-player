import { describe, expect, it } from "vitest";
import { YGODuelPhase, YGO_DUEL_PHASE_ORDER } from "ygo-core";
import { PHASE_ORDER, phaseButtonState } from "./phase-buttons";

const at = (currentPhase: string, turn = 2, transitioning = false) => ({ currentPhase, turn, transitioning });

describe("phaseButtonState", () => {
  it("matches ygo-core's phase order", () => {
    expect([...PHASE_ORDER]).toEqual([...YGO_DUEL_PHASE_ORDER]);
    expect(PHASE_ORDER[3]).toBe(YGODuelPhase.Battle);
  });

  it("uses plain labels, not abbreviations", () => {
    expect(PHASE_ORDER.map(p => phaseButtonState(p, at("Draw")).label))
      .toEqual(["Draw", "Standby", "Main 1", "Battle", "Main 2", "End"]);
  });

  it("explains why Battle / Main 2 are off on turn 1", () => {
    const battle = phaseButtonState("Battle", at("Main Phase 1", 1));
    expect(battle.disabled).toBe(true);
    expect(battle.title).toBe("Battle Phase – not allowed on turn 1");
    expect(phaseButtonState("Main Phase 2", at("Main Phase 1", 1)).title).toBe("Main Phase 2 – not allowed on turn 1");
  });

  it("enables the next legal step and marks the current phase", () => {
    expect(phaseButtonState("Battle", at("Main Phase 1"))).toMatchObject({ disabled: false, title: "Go to Battle Phase" });
    expect(phaseButtonState("End", at("Main Phase 1")).disabled).toBe(false);
    expect(phaseButtonState("Main Phase 1", at("Main Phase 1"))).toMatchObject({ active: true, title: "Main Phase 1 (current)" });
  });

  it("gives a reason for every other disabled button", () => {
    expect(phaseButtonState("Draw", at("Battle")).title).toBe("Draw Phase – already past it");
    expect(phaseButtonState("Main Phase 2", at("Main Phase 1")).title).toBe("Main Phase 2 – enter the Battle Phase first");
    expect(phaseButtonState("End", at("Standby")).title).toBe("End Phase – reach Main Phase 1 first");
    expect(phaseButtonState("Standby", at("Main Phase 1")).disabled).toBe(true);
  });

  it("disables everything while a phase change is running", () => {
    const state = phaseButtonState("Battle", at("Main Phase 1", 2, true));
    expect(state.disabled).toBe(true);
    expect(state.title).toBe("Battle Phase – changing phase…");
  });
});
