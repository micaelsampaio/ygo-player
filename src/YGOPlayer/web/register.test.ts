import { afterEach, describe, expect, it, vi } from "vitest";

// The component extends HTMLElement at module load; the node test env has none.
vi.hoisted(() => {
  const g = globalThis as { HTMLElement?: unknown };
  g.HTMLElement ??= class {};
});

import { registerYGOWebComponents } from "./index";
import { YGOPlayerComponentImpl } from "./YGOPlayerWebComponent";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registerYGOWebComponents", () => {
  it("does nothing outside a browser", () => {
    expect(typeof window).toBe("undefined");
    expect(() => registerYGOWebComponents()).not.toThrow();
  });

  it("defines <ygo-player> once", () => {
    const registry = new Map<string, CustomElementConstructor>();
    const define = vi.fn((name: string, ctor: CustomElementConstructor) => registry.set(name, ctor));
    vi.stubGlobal("window", {});
    vi.stubGlobal("customElements", { get: (name: string) => registry.get(name), define });

    registerYGOWebComponents();
    registerYGOWebComponents();

    expect(define).toHaveBeenCalledTimes(1);
    expect(registry.get("ygo-player")).toBe(YGOPlayerComponentImpl);
  });
});
