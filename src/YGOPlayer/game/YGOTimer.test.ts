import { describe, expect, it } from "vitest";
import { YGOTimer } from "./YGOTimer";

const display = (seconds: number) => {
  const timer = Object.create(YGOTimer.prototype) as YGOTimer;
  (timer as unknown as { time: number }).time = seconds;
  return timer.toString();
};

describe("YGOTimer display", () => {
  it("shows seconds alone under a minute, mm:ss above", () => {
    expect(display(42)).toBe("42");
    expect(display(150)).toBe("02:30");
  });

  it("does not wrap at an hour", () => {
    expect(display(60 * 60)).toBe("60:00");
    expect(display(75 * 60 + 5)).toBe("75:05");
  });
});
