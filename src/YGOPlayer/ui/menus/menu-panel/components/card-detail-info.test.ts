import { describe, expect, it } from "vitest";
import type { Card } from "ygo-core";
import {
  cardBadge,
  cardBattleStats,
  cardFrameKind,
  cardLevelInfo,
  cardNameFontSize,
  cardPendulumScale,
  cardTypeStrip,
  formatStat,
} from "./card-detail-info";

const card = (fields: Partial<Card> & Record<string, unknown>) =>
  ({ id: 1, name: "Card", type: "", frameType: "", typeline: [], desc: "", race: "", attribute: "", ...fields }) as unknown as Card;

const monster = (fields: Partial<Card> & Record<string, unknown> = {}) =>
  card({ type: "Effect Monster", frameType: "effect", typeline: ["Zombie", "Effect"], race: "Zombie", attribute: "DARK", level: 3, atk: 400, def: 1800, ...fields });

const spell = card({ type: "Spell Card", frameType: "spell", race: "Quick-Play" });
const trap = card({ type: "Trap Card", frameType: "trap", race: "Counter" });

describe("cardFrameKind / cardBadge", () => {
  it("tells monsters, spells and traps apart", () => {
    expect(cardFrameKind(monster())).toBe("monster");
    expect(cardFrameKind(spell)).toBe("spell");
    expect(cardFrameKind(trap)).toBe("trap");
  });

  it("uses the attribute kanji for monsters and the spell / trap mark otherwise", () => {
    expect(cardBadge(monster())).toEqual({ key: "dark", glyph: "闇", label: "DARK" });
    expect(cardBadge(monster({ attribute: "wind" }))?.glyph).toBe("風");
    expect(cardBadge(spell)).toEqual({ key: "spell", glyph: "魔", label: "Spell" });
    expect(cardBadge(trap)?.key).toBe("trap");
    expect(cardBadge(monster({ attribute: "" }))).toBeNull();
  });
});

describe("cardLevelInfo", () => {
  it("gives Level, Rank or Link rating", () => {
    expect(cardLevelInfo(monster())).toEqual({ kind: "level", value: 3 });
    expect(cardLevelInfo(monster({ typeline: ["Dragon", "Xyz", "Effect"], level: 4 }))).toEqual({ kind: "rank", value: 4 });
    expect(cardLevelInfo(monster({ typeline: ["Fairy", "Link", "Effect"], linkval: 4 }))).toEqual({ kind: "link", value: 4 });
    expect(cardLevelInfo(spell)).toBeNull();
  });

  it("prefers a changed current level, ignoring an unset 0", () => {
    expect(cardLevelInfo(monster({ currentLevel: 5 }))?.value).toBe(5);
    expect(cardLevelInfo(monster({ currentLevel: 0 }))?.value).toBe(3);
  });
});

describe("cardBattleStats / formatStat", () => {
  it("shows current ATK / DEF, and no DEF for Link monsters", () => {
    expect(cardBattleStats(monster({ currentAtk: 900 }))).toEqual({ atk: "900", def: "1800" });
    expect(cardBattleStats(monster({ typeline: ["Fairy", "Link", "Effect"], atk: 2500 }))).toEqual({ atk: "2500", def: null });
    expect(cardBattleStats(trap)).toBeNull();
  });

  it("shows ? for unknown stats", () => {
    expect(formatStat(undefined)).toBe("?");
    expect(formatStat(null)).toBe("?");
    expect(formatStat(-1)).toBe("?");
    expect(formatStat(0)).toBe("0");
  });
});

describe("cardPendulumScale", () => {
  it("is the scale for Pendulums only", () => {
    expect(cardPendulumScale(monster({ typeline: ["Fiend", "Pendulum", "Effect"], scale: 8 }))).toBe(8);
    expect(cardPendulumScale(monster({ scale: 8 }))).toBeNull();
  });
});

describe("cardTypeStrip", () => {
  it("joins the monster typeline in brackets", () => {
    expect(cardTypeStrip(monster())).toBe("[Zombie/Effect]");
    expect(cardTypeStrip(monster({ typeline: [], race: "Dragon" }))).toBe("[Dragon]");
    expect(cardTypeStrip(spell)).toBe("[Spell]");
    expect(cardTypeStrip(trap)).toBe("[Trap]");
  });
});

describe("cardNameFontSize", () => {
  it("shrinks as names get longer", () => {
    expect(cardNameFontSize("Called by the Grave")).toBe(18);
    expect(cardNameFontSize("Ash Blossom")).toBe(20);
    expect(cardNameFontSize("Apollousa, Bow of the Goddess")).toBe(16);
    expect(cardNameFontSize("Blue-Eyes Alternative Ultimate Dragon X")).toBe(12);
  });
});
