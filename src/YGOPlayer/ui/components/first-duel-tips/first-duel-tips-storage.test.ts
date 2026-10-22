import { describe, expect, it } from "vitest";
import {
  FIRST_DUEL_TIPS,
  FIRST_DUEL_TIPS_KEY,
  dismissFirstDuelTips,
  duelTipsKind,
  hasDismissedFirstDuelTips,
  shouldOfferFirstDuelTips,
} from "./first-duel-tips-storage";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

const throwingStorage = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
};

describe("first-duel tips storage", () => {
  it("is not dismissed until dismissed, separately per kind of duel", () => {
    const storage = memoryStorage();
    expect(hasDismissedFirstDuelTips("solo", storage)).toBe(false);
    dismissFirstDuelTips("solo", storage);
    expect(storage.getItem(`${FIRST_DUEL_TIPS_KEY}:solo`)).toBe("1");
    expect(hasDismissedFirstDuelTips("solo", storage)).toBe(true);
    expect(hasDismissedFirstDuelTips("bot", storage)).toBe(false);
  });

  it("never throws when storage is blocked or missing", () => {
    expect(hasDismissedFirstDuelTips("bot", throwingStorage)).toBe(false);
    expect(() => dismissFirstDuelTips("bot", throwingStorage)).not.toThrow();
    expect(hasDismissedFirstDuelTips("bot", null)).toBe(false);
    expect(() => dismissFirstDuelTips("bot", null)).not.toThrow();
  });
});

describe("shouldOfferFirstDuelTips", () => {
  it("offers tips to seated players in a live duel only", () => {
    expect(shouldOfferFirstDuelTips({ isPlayerClient: true, gameMode: "DUEL" })).toBe(true);
    expect(shouldOfferFirstDuelTips({ isPlayerClient: true, gameMode: "REPLAY" })).toBe(false);
    expect(shouldOfferFirstDuelTips({ isPlayerClient: false, gameMode: "DUEL" })).toBe(false);
  });

  it("keeps every tour short", () => {
    for (const tips of Object.values(FIRST_DUEL_TIPS)) {
      expect(tips.length).toBeGreaterThanOrEqual(3);
      expect(tips.length).toBeLessThanOrEqual(4);
    }
  });

  it("picks the tips for the kind of duel", () => {
    expect(duelTipsKind({ engineRoom: true, controlsBothSides: false })).toBe("bot");
    expect(duelTipsKind({ engineRoom: false, controlsBothSides: true })).toBe("solo");
    expect(duelTipsKind({ engineRoom: false, controlsBothSides: false })).toBe("pvp");
  });
});
