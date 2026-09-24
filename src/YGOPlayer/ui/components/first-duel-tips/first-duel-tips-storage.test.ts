import { describe, expect, it } from "vitest";
import {
  FIRST_DUEL_TIPS,
  FIRST_DUEL_TIPS_KEY,
  dismissFirstDuelTips,
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
  it("is not dismissed until dismissed", () => {
    const storage = memoryStorage();
    expect(hasDismissedFirstDuelTips(storage)).toBe(false);
    dismissFirstDuelTips(storage);
    expect(storage.getItem(FIRST_DUEL_TIPS_KEY)).toBe("1");
    expect(hasDismissedFirstDuelTips(storage)).toBe(true);
  });

  it("never throws when storage is blocked or missing", () => {
    expect(hasDismissedFirstDuelTips(throwingStorage)).toBe(false);
    expect(() => dismissFirstDuelTips(throwingStorage)).not.toThrow();
    expect(hasDismissedFirstDuelTips(null)).toBe(false);
    expect(() => dismissFirstDuelTips(null)).not.toThrow();
  });
});

describe("shouldOfferFirstDuelTips", () => {
  it("offers tips to seated players in a live duel only", () => {
    expect(shouldOfferFirstDuelTips({ isPlayerClient: true, gameMode: "DUEL" })).toBe(true);
    expect(shouldOfferFirstDuelTips({ isPlayerClient: true, gameMode: "REPLAY" })).toBe(false);
    expect(shouldOfferFirstDuelTips({ isPlayerClient: false, gameMode: "DUEL" })).toBe(false);
  });

  it("keeps the tour short", () => {
    expect(FIRST_DUEL_TIPS.length).toBeGreaterThanOrEqual(3);
    expect(FIRST_DUEL_TIPS.length).toBeLessThanOrEqual(4);
  });
});
