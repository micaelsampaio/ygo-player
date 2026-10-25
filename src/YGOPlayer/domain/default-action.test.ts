import { describe, expect, it } from "vitest";
import { quickActionRow, type QuickActionContext } from "./default-action";

const row = (commandType: string, count = 1, key = commandType) => ({ key, commandType, count });
const hand = (isMonster: boolean, pending = "idle"): QuickActionContext => ({ pending, place: "hand", isMonster });

describe("quickActionRow", () => {
  it("hand monster: Activate > Special Summon > Normal Summon > Set", () => {
    const all = [row("Set Monster"), row("Normal Summon"), row("Special Summon"), row("Activate")];
    expect(quickActionRow(all, hand(true))?.commandType).toBe("Activate");
    expect(quickActionRow(all.slice(0, 3), hand(true))?.commandType).toBe("Special Summon");
    expect(quickActionRow(all.slice(0, 2), hand(true))?.commandType).toBe("Normal Summon");
    expect(quickActionRow(all.slice(0, 1), hand(true))?.commandType).toBe("Set Monster");
  });

  it("hand Spell/Trap: Activate > Set", () => {
    expect(quickActionRow([row("Set ST"), row("Activate")], hand(false))?.commandType).toBe("Activate");
    expect(quickActionRow([row("Set ST")], hand(false))?.commandType).toBe("Set ST");
  });

  it("the top kind decides: two effects or two summon procedures open the menu", () => {
    expect(quickActionRow([row("Activate", 2), row("Normal Summon")], hand(true))).toBeNull();
    expect(quickActionRow([row("Special Summon", 1, "a"), row("Special Summon", 1, "b"), row("Normal Summon")], hand(true))).toBeNull();
  });

  it("field in the Main Phase: Activate only", () => {
    const field: QuickActionContext = { pending: "idle", place: "field", isMonster: true };
    expect(quickActionRow([row("Activate"), row("Change Card Position")], field)?.commandType).toBe("Activate");
    expect(quickActionRow([row("Change Card Position")], field)).toBeNull();
  });

  it("field in the Battle Phase: Attack with one target or a direct attack, else the menu", () => {
    const battle = (opponentMonsters: number): QuickActionContext => ({ pending: "battle", place: "field", isMonster: true, opponentMonsters });
    expect(quickActionRow([row("Attack"), row("Activate")], battle(0))?.commandType).toBe("Attack");
    expect(quickActionRow([row("Attack")], battle(1))?.commandType).toBe("Attack");
    expect(quickActionRow([row("Attack"), row("Activate")], battle(2))).toBeNull();
    expect(quickActionRow([row("Activate")], battle(2))?.commandType).toBe("Activate");
    // Two copies folded into one Attack row: the engine can't tell them apart from the row.
    expect(quickActionRow([row("Attack", 2)], battle(0))).toBeNull();
  });

  it("pile viewer: Activate > Special Summon", () => {
    const pile: QuickActionContext = { pending: "idle", place: "pile", isMonster: true };
    expect(quickActionRow([row("Special Summon"), row("Activate")], pile)?.commandType).toBe("Activate");
    expect(quickActionRow([row("Special Summon")], pile)?.commandType).toBe("Special Summon");
  });

  it("chain window: exactly one activation, nothing else", () => {
    expect(quickActionRow([row("Activate")], hand(true, "chain"))?.commandType).toBe("Activate");
    expect(quickActionRow([row("Activate", 2)], hand(true, "chain"))).toBeNull();
    expect(quickActionRow([row("Activate", 1, "a"), row("Activate", 1, "b")], hand(true, "chain"))).toBeNull();
    expect(quickActionRow([row("Normal Summon")], hand(true, "chain"))).toBeNull();
  });

  it("nothing to run: null", () => {
    expect(quickActionRow([], hand(true))).toBeNull();
  });
});
