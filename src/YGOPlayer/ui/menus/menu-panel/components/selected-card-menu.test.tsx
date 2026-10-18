import { describe, expect, it } from "vitest";
import type { Card } from "ygo-core";
import { parseSelectedCard } from "./selected-card-menu";

const card = (fields: Partial<Card> & { humanReadableCardType?: string }) =>
  ({ id: 1, name: "Card", type: "", frameType: "", typeline: [], desc: "", ...fields }) as Card;

describe("parseSelectedCard", () => {
  it("is null without a card", () => {
    expect(parseSelectedCard(null)).toBeNull();
  });

  it("gives a Spell its kind's icon from the card data's type label", () => {
    const quickPlay = parseSelectedCard(card({ frameType: "spell", type: "Spell Card", humanReadableCardType: "Quick-Play Spell" }))!;
    expect(quickPlay.cardTypeName).toBe("Quick-Play Spell");
    expect(quickPlay.cardTypeIcon).toBe("ygo-card-stats-icon-quick");
    expect(quickPlay.colorClassName).toBe("ygo-spell-card-bg");
    expect(quickPlay.type).toBe("[Spell]");
  });

  it("calls a Spell / Trap without a known label Normal", () => {
    expect(parseSelectedCard(card({ frameType: "spell", type: "Spell Card" }))!.cardTypeName).toBe("Normal Spell");
    const trap = parseSelectedCard(card({ frameType: "trap", type: "Trap Card", humanReadableCardType: "Something else" }))!;
    expect(trap.cardTypeName).toBe("Normal Trap");
    expect(trap.cardTypeIcon).toBe("");
  });

  it("gives a Counter Trap its icon", () => {
    const trap = parseSelectedCard(card({ frameType: "trap", type: "Trap Card", humanReadableCardType: "Counter Trap" }))!;
    expect(trap.cardTypeIcon).toBe("ygo-card-stats-icon-counter");
    expect(trap.colorClassName).toBe("ygo-trap-card-bg");
  });

  it("shows a monster's typeline and splits its text into lines", () => {
    const monster = parseSelectedCard(card({ frameType: "effect", type: "Effect Monster", typeline: ["Zombie", "Tuner", "Effect"], desc: "line 1\nline 2" }))!;
    expect(monster.type).toBe("[Zombie/Tuner/Effect]");
    expect(monster.colorClassName).toBe("ygo-effect-monster-card-bg");
    expect(monster.cardDescription).toHaveLength(2);
  });
});
