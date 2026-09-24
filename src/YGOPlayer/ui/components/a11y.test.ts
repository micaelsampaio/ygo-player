import { describe, expect, it, vi } from "vitest";
import type { KeyboardEvent } from "react";
import { clickableProps, isActivationKey, onActivateKey } from "./a11y";

function keyEvent(key: string, nested = false) {
  const el = {};
  return {
    key,
    currentTarget: el,
    target: nested ? {} : el,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<Element> & { preventDefault: ReturnType<typeof vi.fn> };
}

describe("isActivationKey", () => {
  it("accepts Enter and Space only", () => {
    expect(isActivationKey("Enter")).toBe(true);
    expect(isActivationKey(" ")).toBe(true);
    expect(isActivationKey("Escape")).toBe(false);
  });
});

describe("onActivateKey", () => {
  it("runs on Enter/Space and prevents the default", () => {
    const handler = vi.fn();
    const onKeyDown = onActivateKey(handler);
    const enter = keyEvent("Enter");
    onKeyDown(enter);
    onKeyDown(keyEvent(" "));
    onKeyDown(keyEvent("a"));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(enter.preventDefault).toHaveBeenCalled();
  });

  it("ignores keys from nested elements", () => {
    const handler = vi.fn();
    onActivateKey(handler)(keyEvent("Enter", true));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("clickableProps", () => {
  it("is empty without a handler", () => {
    expect(clickableProps(undefined)).toEqual({});
  });

  it("adds button role, focusability and label", () => {
    const handler = vi.fn();
    const props = clickableProps(handler, "Close");
    expect(props).toMatchObject({ role: "button", tabIndex: 0, "aria-label": "Close", onClick: handler });
  });
});
