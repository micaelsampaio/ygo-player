import { describe, expect, it } from "vitest";
import { preferencesPayload, readPreferences, storeChainStops, storedChainStops } from "./duel-preferences";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
  };
}

describe("chain stops preference", () => {
  it("remembers the choice and starts on auto, whatever the old switch said", () => {
    expect(storedChainStops(memoryStorage())).toBe("auto");
    expect(storedChainStops(memoryStorage({ "ygo-player:stop-at-every-window": "1" }))).toBe("auto");
    const s = memoryStorage({ "ygo-player:stop-at-every-window": "1" });
    storeChainStops("off", s);
    expect(storedChainStops(s)).toBe("off");
    expect(s.data.has("ygo-player:stop-at-every-window")).toBe(false);
    storeChainStops("auto", s);
    expect(s.data.size).toBe(0);
  });

  it("reads the server's reply, including an older server's boolean", () => {
    expect(readPreferences({ preferences: { chainStops: "off", stopAtEveryWindow: false } })).toEqual({ chainStops: "off" });
    expect(readPreferences({ preferences: { stopAtEveryWindow: true } })).toEqual({ chainStops: "always" });
    expect(readPreferences({ preferences: { chainStops: "nope" } })).toEqual({});
    expect(readPreferences(null)).toBeNull();
  });

  it("sends the older boolean alongside for servers that predate chainStops", () => {
    expect(preferencesPayload("always")).toEqual({ chainStops: "always", stopAtEveryWindow: true });
    expect(preferencesPayload("off")).toEqual({ chainStops: "off", stopAtEveryWindow: false });
  });
});
