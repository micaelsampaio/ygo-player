import { describe, expect, it, vi } from "vitest";
import { bindEscapeToCancel } from "./escape-to-cancel";

function keydown(key: string) {
  return Object.assign(new Event("keydown", { bubbles: true, cancelable: true }), { key });
}

describe("bindEscapeToCancel", () => {
  it("cancels on Escape and stops the event", () => {
    const target = new EventTarget();
    const onCancel = vi.fn();
    bindEscapeToCancel(target, onCancel);
    const event = keydown("Escape");
    const stop = vi.spyOn(event, "stopPropagation");
    target.dispatchEvent(event);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores other keys", () => {
    const target = new EventTarget();
    const onCancel = vi.fn();
    bindEscapeToCancel(target, onCancel);
    target.dispatchEvent(keydown("Enter"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("stops listening after unsubscribe", () => {
    const target = new EventTarget();
    const onCancel = vi.fn();
    const unsubscribe = bindEscapeToCancel(target, onCancel);
    unsubscribe();
    target.dispatchEvent(keydown("Escape"));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
