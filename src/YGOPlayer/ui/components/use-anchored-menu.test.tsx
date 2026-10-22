import { afterEach, describe, expect, it, vi } from "vitest";

// No DOM here: the hook's layout effect runs straight away, its cleanup is kept.
let cleanup: (() => void) | void;
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useLayoutEffect: (effect: () => (() => void) | void) => { cleanup = effect(); },
}));

const { useAnchoredMenu } = await import("./use-anchored-menu");

let resizeCallbacks: Array<() => void> = [];
class FakeResizeObserver {
  constructor(private cb: () => void) { resizeCallbacks.push(cb); }
  observe() {}
  disconnect() { resizeCallbacks = resizeCallbacks.filter((c) => c !== this.cb); }
}

describe("useAnchoredMenu", () => {
  afterEach(() => { vi.unstubAllGlobals(); resizeCallbacks = []; cleanup = undefined; });

  it("places the menu again when it grows, so it stays on screen (Show free-play moves)", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 600 });
    let height = 100;
    const container = {
      style: {} as Record<string, string>,
      getBoundingClientRect: () => ({ width: 200, height }),
      querySelector: () => null,
    };
    // Beside a card near the bottom of a 600px-high screen.
    const card = { getBoundingClientRect: () => ({ top: 450, left: 300, width: 50, height: 70 }) };
    useAnchoredMenu({} as never, { current: container as never }, () => ({ kind: "left-of", element: card as never }), []);
    expect(container.style.top).toBe("450px");

    height = 400;
    resizeCallbacks.forEach((cb) => cb());
    expect(container.style.top).toBe("200px");

    cleanup?.();
    expect(resizeCallbacks).toEqual([]);
  });

  it("still places the menu once where there is no ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 600 });
    const container = { style: {} as Record<string, string>, getBoundingClientRect: () => ({ width: 200, height: 100 }), querySelector: () => null };
    const card = { getBoundingClientRect: () => ({ top: 450, left: 300, width: 50, height: 70 }) };
    useAnchoredMenu({} as never, { current: container as never }, () => ({ kind: "left-of", element: card as never }), []);
    expect(container.style).toEqual({ top: "450px", left: "100px" });
    expect(() => cleanup?.()).not.toThrow();
  });
});
