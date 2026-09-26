import { describe, expect, it } from "vitest";
import { fieldTheme, getStoredFieldTheme, nightColor, setStoredFieldTheme, FIELD_THEMES } from "./field-themes";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}

describe("field themes", () => {
  it("falls back to Classic for an unknown or missing theme", () => {
    expect(fieldTheme(undefined).id).toBe("classic");
    expect(fieldTheme("nope").id).toBe("classic");
    expect(FIELD_THEMES.map((t) => t.id)).toEqual(["classic", "night", "minimal", "playmat"]);
  });

  it("saves the choice inside the player settings, keeping the other settings", () => {
    const s = memoryStorage({ ygo_player_settings: JSON.stringify({ gameSpeed: 1.5 }) });
    expect(getStoredFieldTheme(s)).toBe("classic");
    setStoredFieldTheme("playmat", s);
    expect(getStoredFieldTheme(s)).toBe("playmat");
    expect(JSON.parse(s.data.get("ygo_player_settings")!)).toEqual({ gameSpeed: 1.5, fieldTheme: "playmat" });
  });

  it("Night darkens and cools a colour, within 0-255", () => {
    const [r, g, b] = nightColor(120, 180, 60); // a grass green
    expect(r).toBeLessThan(120);
    expect(g).toBeLessThan(180);
    expect(b).toBeGreaterThan(r);
    for (const c of nightColor(255, 255, 255)) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(255); }
  });
});
