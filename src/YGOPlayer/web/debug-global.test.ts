import { describe, expect, it } from "vitest";
import {
  DEBUG_FLAG_STORAGE_KEY,
  clearDebugGlobal,
  exposeDebugGlobal,
  isDebugGlobalEnabled,
} from "./debug-global";

function storage(values: Record<string, string>) {
  return { getItem: (k: string) => values[k] ?? null };
}

describe("debug global", () => {
  it("is not exposed by default, even on localhost", () => {
    const win: Record<string, unknown> = {
      location: { href: "http://localhost:5173/duel" },
      localStorage: storage({}),
    };
    expect(isDebugGlobalEnabled(win)).toBe(false);
    expect(exposeDebugGlobal(win, {})).toBe(false);
    expect("YGO_WEB_COMPONENT" in win).toBe(false);
  });

  it("is exposed when the host sets YGO_PLAYER_DEBUG = true", () => {
    const instance = {};
    const win: Record<string, unknown> = { YGO_PLAYER_DEBUG: true };
    expect(exposeDebugGlobal(win, instance)).toBe(true);
    expect(win.YGO_WEB_COMPONENT).toBe(instance);
  });

  it("ignores truthy non-boolean flag values", () => {
    expect(isDebugGlobalEnabled({ YGO_PLAYER_DEBUG: "true" })).toBe(false);
    expect(isDebugGlobalEnabled({ YGO_PLAYER_DEBUG: 1 })).toBe(false);
  });

  it("is exposed when localStorage opts in", () => {
    const instance = {};
    const win: Record<string, unknown> = { localStorage: storage({ [DEBUG_FLAG_STORAGE_KEY]: "1" }) };
    expect(exposeDebugGlobal(win, instance)).toBe(true);
    expect(win.YGO_WEB_COMPONENT).toBe(instance);
    expect(isDebugGlobalEnabled({ localStorage: storage({ [DEBUG_FLAG_STORAGE_KEY]: "0" }) })).toBe(false);
  });

  it("treats throwing storage as disabled", () => {
    const win = {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
      },
    };
    expect(isDebugGlobalEnabled(win)).toBe(false);
  });

  it("handles a missing window", () => {
    expect(isDebugGlobalEnabled(undefined)).toBe(false);
    expect(exposeDebugGlobal(undefined, {})).toBe(false);
    expect(() => clearDebugGlobal(undefined, {})).not.toThrow();
  });

  it("clears only its own instance", () => {
    const a = {};
    const b = {};
    const win: Record<string, unknown> = { YGO_PLAYER_DEBUG: true };
    exposeDebugGlobal(win, a);
    exposeDebugGlobal(win, b);
    clearDebugGlobal(win, a);
    expect(win.YGO_WEB_COMPONENT).toBe(b);
    clearDebugGlobal(win, b);
    expect("YGO_WEB_COMPONENT" in win).toBe(false);
  });
});
