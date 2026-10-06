import { beforeAll, describe, expect, it, vi } from "vitest";
import { stopPropagationCallback } from "./utils";

// No DOM in these tests: the helper only needs instanceof HTMLInputElement and Element.closest.
beforeAll(() => { (globalThis as any).HTMLInputElement ??= class {}; });

const target = (insideSubmit: boolean) => ({ closest: (sel: string) => (insideSubmit && sel.includes('type="submit"') ? {} : null) });
const event = (t: unknown) => ({ target: t, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe("stopPropagationCallback", () => {
  it("lets a submit button submit its form (only stops the event)", () => {
    const e = event(target(true));
    stopPropagationCallback(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
  });

  it("still cancels other clicks in a menu", () => {
    const e = event(target(false));
    stopPropagationCallback(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
  });
});
