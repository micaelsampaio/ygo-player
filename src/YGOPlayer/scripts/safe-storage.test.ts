import { afterEach, describe, expect, it, vi } from "vitest";
import { getStorage, safeGetItem, safeRemoveItem, safeSetItem } from "./safe-storage";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
  };
}
const throwing = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
  removeItem: () => { throw new Error("blocked"); },
};

describe("safe-storage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads, writes and removes through the given storage", () => {
    const s = memoryStorage();
    expect(safeGetItem("k", s)).toBeNull();
    expect(safeSetItem("k", "v", s)).toBe(true);
    expect(safeGetItem("k", s)).toBe("v");
    expect(safeRemoveItem("k", s)).toBe(true);
    expect(safeGetItem("k", s)).toBeNull();
  });

  it("falls back when storage throws or is missing", () => {
    expect(safeGetItem("k", throwing)).toBeNull();
    expect(safeSetItem("k", "v", throwing)).toBe(false);
    expect(safeRemoveItem("k", throwing)).toBe(false);
    expect(safeGetItem("k", undefined)).toBeNull();
    expect(safeSetItem("k", "v", undefined)).toBe(false);
    expect(safeRemoveItem("k", undefined)).toBe(false);
  });

  it("getStorage is undefined without localStorage and never throws when access is blocked", () => {
    expect(getStorage()).toBeUndefined();
    const s = memoryStorage();
    vi.stubGlobal("localStorage", s);
    expect(getStorage()).toBe(s);
    vi.unstubAllGlobals();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("SecurityError"); } });
    expect(getStorage()).toBeUndefined();
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
});
