import { describe, expect, it } from "vitest";
import { fieldTheme, getStoredFieldTheme, setStoredFieldTheme, FIELD_THEMES } from "./field-themes";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}

describe("field themes", () => {
  it("falls back to Classic for an unknown or missing theme", () => {
    expect(fieldTheme(undefined).id).toBe("classic");
    expect(fieldTheme("nope").id).toBe("classic");
    expect(FIELD_THEMES.map((t) => t.id)).toEqual(["classic", "holo", "coliseum"]);
    // Themes that were dropped fall back to Classic.
    expect(fieldTheme("night").id).toBe("classic");
    expect(fieldTheme("playmat").id).toBe("classic");
  });

  it("saves the choice inside the player settings, keeping the other settings", () => {
    const s = memoryStorage({ ygo_player_settings: JSON.stringify({ gameSpeed: 1.5 }) });
    expect(getStoredFieldTheme(s)).toBe("classic");
    setStoredFieldTheme("holo", s);
    expect(getStoredFieldTheme(s)).toBe("holo");
    expect(JSON.parse(s.data.get("ygo_player_settings")!)).toEqual({ gameSpeed: 1.5, fieldTheme: "holo" });
  });

});
