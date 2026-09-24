import { describe, expect, it } from "vitest";
import { parseTimeToSeconds } from "./parse-time";

describe("parseTimeToSeconds", () => {
  it("reads minutes, seconds and bare seconds", () => {
    expect(parseTimeToSeconds("2m30s")).toBe(150);
    expect(parseTimeToSeconds("5m")).toBe(300);
    expect(parseTimeToSeconds("30s")).toBe(30);
    expect(parseTimeToSeconds(" 90 ")).toBe(90);
    expect(parseTimeToSeconds("2m 30s")).toBe(150);
  });

  it("rejects empty, zero and garbage", () => {
    expect(parseTimeToSeconds("")).toBeNull();
    expect(parseTimeToSeconds("0")).toBeNull();
    expect(parseTimeToSeconds("0m0s")).toBeNull();
    expect(parseTimeToSeconds("abc")).toBeNull();
    expect(parseTimeToSeconds("1h")).toBeNull();
  });
});
