import { describe, expect, it } from "vitest";
import { respondEventText } from "./assist-sections";

const duelWith = (logs: unknown[]) => ({
  ygo: { duelLog: { logs }, state: { getCardData: (id: number) => (id === 95515789 ? { name: "Blazing Cartesia, the Virtuous" } : undefined) } },
}) as never;

describe("respondEventText", () => {
  it("names the summon an open window answers", () => {
    expect(respondEventText(duelWith([{ type: "Normal Summon", id: 95515789 }]), true)).toBe("the Normal Summon of Blazing Cartesia, the Virtuous");
  });

  it("is null when the engine says nothing happened, or the last move isn't a summon or attack", () => {
    expect(respondEventText(duelWith([{ type: "Normal Summon", id: 95515789 }]), false)).toBeNull();
    expect(respondEventText(duelWith([{ type: "Duel Phase", phase: "Battle" }]), true)).toBeNull();
    expect(respondEventText(duelWith([]), true)).toBeNull();
  });
});
