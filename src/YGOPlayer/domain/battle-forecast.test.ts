import { describe, expect, it } from "vitest";
import { forecastBattle, forecastDamageLabel, forecastOutcomeLabel, targetStatLabel, type ForecastTarget } from "./battle-forecast";

const atkPos = (atk: number): ForecastTarget => ({ atk, def: 9999, defense: false, faceDown: false });
const defPos = (def: number): ForecastTarget => ({ atk: 9999, def, defense: true, faceDown: false });
const viewerIs0 = (p: number) => p === 0;

describe("forecastBattle", () => {
  it("direct attack deals full ATK to the opponent", () => {
    expect(forecastBattle(2500, null, 0)).toEqual({ outcome: "direct", attackerDestroyed: false, targetDestroyed: false, damage: 2500, damagedPlayer: 1 });
    expect(forecastBattle(1000, null, 1).damagedPlayer).toBe(0);
  });

  it("direct attack with 0 ATK deals no damage", () => {
    expect(forecastBattle(0, null, 0)).toMatchObject({ outcome: "direct", damage: 0, damagedPlayer: null });
  });

  describe("ATK vs ATK", () => {
    it("higher attacker destroys the target and deals the difference to its controller", () => {
      expect(forecastBattle(2500, atkPos(1300), 0)).toEqual({ outcome: "destroys", attackerDestroyed: false, targetDestroyed: true, damage: 1200, damagedPlayer: 1 });
    });

    it("lower attacker is destroyed and its controller takes the difference", () => {
      expect(forecastBattle(1500, atkPos(2000), 0)).toEqual({ outcome: "destroyed", attackerDestroyed: true, targetDestroyed: false, damage: 500, damagedPlayer: 0 });
      expect(forecastBattle(1500, atkPos(2000), 1).damagedPlayer).toBe(1);
    });

    it("equal ATK destroys both with no damage", () => {
      expect(forecastBattle(1800, atkPos(1800), 0)).toEqual({ outcome: "both", attackerDestroyed: true, targetDestroyed: true, damage: 0, damagedPlayer: null });
    });

    it("two 0 ATK monsters: nothing happens", () => {
      expect(forecastBattle(0, atkPos(0), 0)).toEqual({ outcome: "none", attackerDestroyed: false, targetDestroyed: false, damage: 0, damagedPlayer: null });
    });

    it("a 0 ATK attacker into a monster is destroyed and takes its ATK", () => {
      expect(forecastBattle(0, atkPos(1000), 0)).toMatchObject({ outcome: "destroyed", damage: 1000, damagedPlayer: 0 });
    });
  });

  describe("ATK vs DEF", () => {
    it("ATK above DEF destroys the defender with no damage", () => {
      expect(forecastBattle(2000, defPos(1500), 0)).toEqual({ outcome: "destroys", attackerDestroyed: false, targetDestroyed: true, damage: 0, damagedPlayer: null });
    });

    it("ATK below DEF: nothing destroyed, attacker's controller takes the difference", () => {
      expect(forecastBattle(1600, defPos(2000), 0)).toEqual({ outcome: "blocked", attackerDestroyed: false, targetDestroyed: false, damage: 400, damagedPlayer: 0 });
    });

    it("ATK equal to DEF: nothing happens", () => {
      expect(forecastBattle(1800, defPos(1800), 1)).toEqual({ outcome: "none", attackerDestroyed: false, targetDestroyed: false, damage: 0, damagedPlayer: null });
    });

    it("uses DEF, not ATK, for a defense position target", () => {
      expect(forecastBattle(1000, { atk: 3000, def: 500, defense: true, faceDown: false }, 0).outcome).toBe("destroys");
    });
  });

  it("face-down target can't be forecast", () => {
    expect(forecastBattle(3000, { atk: 0, def: 0, defense: true, faceDown: true }, 0)).toEqual({ outcome: "unknown", attackerDestroyed: false, targetDestroyed: false, damage: 0, damagedPlayer: null });
  });

  it("treats negative or missing stats as 0", () => {
    expect(forecastBattle(Number.NaN, atkPos(-100), 0).outcome).toBe("none");
    expect(forecastBattle(-5, null, 0).damage).toBe(0);
  });
});

describe("labels", () => {
  it("outcome labels", () => {
    expect(forecastOutcomeLabel("destroys")).toBe("Destroys");
    expect(forecastOutcomeLabel("destroyed")).toBe("Destroyed");
    expect(forecastOutcomeLabel("both")).toBe("Both destroyed");
    expect(forecastOutcomeLabel("none")).toBe("No damage");
    expect(forecastOutcomeLabel("unknown")).toBe("?");
  });

  it("damage label names the damaged player from the viewer's side", () => {
    expect(forecastDamageLabel(forecastBattle(2500, atkPos(1300), 0), viewerIs0)).toBe("-1200 to opponent");
    expect(forecastDamageLabel(forecastBattle(1500, atkPos(2000), 0), viewerIs0)).toBe("-500 to you");
    expect(forecastDamageLabel(forecastBattle(1500, atkPos(2000), 1), viewerIs0)).toBe("-500 to opponent");
    expect(forecastDamageLabel(forecastBattle(1800, defPos(1000), 0), viewerIs0)).toBe("");
  });

  it("target stat label by position", () => {
    expect(targetStatLabel(atkPos(1300))).toEqual({ label: "ATK", value: "1300" });
    expect(targetStatLabel(defPos(2100))).toEqual({ label: "DEF", value: "2100" });
    expect(targetStatLabel({ atk: 1, def: 1, defense: true, faceDown: true })).toEqual({ label: "DEF", value: "?" });
  });
});
