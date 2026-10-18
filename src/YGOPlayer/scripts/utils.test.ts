import { afterEach, describe, expect, it, vi } from "vitest";
import { chunkRandomly, deepMerge, getJsonFromLocalStorage, isObject, safeStringify } from "./utils";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deepMerge", () => {
  it("merges nested objects into the target in place", () => {
    const target = { volume: 1, ui: { hand: true, log: { open: false } } };
    const merged = deepMerge<typeof target>(target, { ui: { log: { open: true } }, extra: 2 });
    expect(merged).toBe(target);
    expect(merged).toEqual({ volume: 1, ui: { hand: true, log: { open: true } }, extra: 2 });
  });

  it("replaces primitives, and merges arrays index by index (arrays are objects too)", () => {
    const target = { list: [1, 2, 3], name: "a" };
    deepMerge(target, { list: [9], name: "b" });
    expect(target).toEqual({ list: [9, 2, 3], name: "b" });
  });

  it("leaves the target alone for an empty or missing source", () => {
    const target = { a: 1 };
    expect(deepMerge(target, null)).toEqual({ a: 1 });
    expect(deepMerge(target, undefined)).toEqual({ a: 1 });
    expect(deepMerge(target, {})).toEqual({ a: 1 });
  });

  it("ignores inherited keys", () => {
    const source = Object.create({ inherited: true }) as Record<string, unknown>;
    source.own = 1;
    expect(deepMerge({}, source)).toEqual({ own: 1 });
  });
});

describe("isObject", () => {
  it("is true for objects and arrays only", () => {
    expect(isObject({})).toBe(true);
    expect(isObject([])).toBe(true);
    expect(isObject(null)).toBe(false);
    expect(isObject("x")).toBe(false);
    expect(isObject(1)).toBe(false);
  });
});

describe("safeStringify", () => {
  it("stringifies plain values", () => {
    expect(safeStringify({ a: 1 })).toBe('{"a":1}');
  });

  it("falls back to an empty object for circular data", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(safeStringify(circular)).toBe("{}");
  });
});

describe("getJsonFromLocalStorage", () => {
  it("returns the default when there is no storage", () => {
    expect(getJsonFromLocalStorage("settings", { fallback: true })).toEqual({ fallback: true });
  });

  it("parses the stored JSON", () => {
    vi.stubGlobal("localStorage", { getItem: () => '{"volume":0.5}' });
    expect(getJsonFromLocalStorage("settings")).toEqual({ volume: 0.5 });
  });

  it("returns the default for unreadable JSON", () => {
    vi.stubGlobal("localStorage", { getItem: () => "{not json" });
    expect(getJsonFromLocalStorage("settings", 7)).toBe(7);
  });
});

describe("chunkRandomly", () => {
  it("keeps every item, in order, in at most maxGroups + 1 groups", () => {
    const items = Array.from({ length: 23 }, (_, i) => i);
    for (let run = 0; run < 20; ++run) {
      const groups = chunkRandomly(items, 6);
      expect(groups.flat()).toEqual(items);
      expect(groups.length).toBeLessThanOrEqual(7);
      expect(groups.every(group => group.length > 0)).toBe(true);
    }
  });

  it("handles the trivial cases", () => {
    expect(chunkRandomly([], 3)).toEqual([]);
    expect(chunkRandomly([1, 2], 1)).toEqual([[1, 2]]);
  });

  it("splits by the random sizes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    // 6 items, 2 groups: floor(0.99 * ceil(6/2)) = 2, then floor(0.99 * 4) = 3, and the leftover.
    expect(chunkRandomly([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4, 5], [6]]);
  });
});
