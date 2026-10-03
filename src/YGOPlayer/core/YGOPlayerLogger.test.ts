import { afterEach, describe, expect, it, vi } from "vitest";
import { YGOPlayerLogger } from "./YGOPlayerLogger";

describe("YGOPlayerLogger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("swallowed: prints nothing and only reaches the host hook", () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => { }));
    const onError = vi.fn();
    const err = new Error("x");
    new YGOPlayerLogger(onError).swallowed("src", err, { a: 1 });
    new YGOPlayerLogger().swallowed("src", err);
    spies.forEach((s) => expect(s).not.toHaveBeenCalled());
    expect(onError).toHaveBeenCalledWith(err, { source: "src", details: { a: 1 } });
  });

  it("error: keeps the console.error output and reports to the hook", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => { });
    const onError = vi.fn();
    const err = new Error("x");
    new YGOPlayerLogger(onError).error("Src", "it failed", err, "cmd");
    expect(spy).toHaveBeenCalledWith("Src: it failed", "cmd", err);
    expect(onError).toHaveBeenCalledWith(err, { source: "Src", details: "cmd" });
  });

  it("never throws when the host hook throws", () => {
    const logger = new YGOPlayerLogger(() => { throw new Error("host"); });
    expect(() => logger.swallowed("src", new Error("x"))).not.toThrow();
  });
});
