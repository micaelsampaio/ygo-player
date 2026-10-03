import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YGODuelEvents } from "ygo-core";
import { getDuelEventHandler } from ".";

/**
 * Smoke test: every duel-event handler can be built and started against a
 * stub duel/scene without throwing. The stub is a "universal" object: any
 * property is another stub, calling it returns a stub, and it converts to 0
 * / "" when used as a number or string. It checks the handlers' plumbing
 * (props, timers, tasks, finish) — not what they draw.
 */
function stub(name = "stub"): any {
  const cache = new Map<PropertyKey, any>();
  const target = function () { } as any;
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === Symbol.toPrimitive) return (hint: string) => (hint === "string" ? "" : 0);
      if (prop === Symbol.iterator) return function* () { };
      if (prop === "then") return undefined; // not a thenable
      if (prop === "toJSON") return () => ({});
      if (prop === "length") return 0;
      if (typeof prop === "symbol") return undefined;
      if (!cache.has(prop)) cache.set(prop, stub(`${name}.${String(prop)}`));
      return cache.get(prop);
    },
    set(_t, prop, value) {
      cache.set(prop, value);
      return true;
    },
    apply() {
      return stub(`${name}()`);
    },
    construct() {
      return stub(`new ${name}`);
    },
  });
}

/** One handler per distinct class, with a LogType that routes to it. */
function handlerTable() {
  const byClass = new Map<any, string>();
  for (const type of Object.values(YGODuelEvents.LogType)) {
    const handler = getDuelEventHandler({ type } as YGODuelEvents.DuelLog);
    if (!byClass.has(handler)) byClass.set(handler, String(type));
  }
  const fallback = getDuelEventHandler({ type: "__unknown__" } as unknown as YGODuelEvents.DuelLog);
  if (!byClass.has(fallback)) byClass.set(fallback, "__unknown__");
  return [...byClass.entries()].map(([Handler, type]) => ({ name: Handler.name as string, type, Handler }));
}

const table = handlerTable();

describe("duel-event handlers (smoke)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", stub("window"));
    vi.stubGlobal("document", stub("document"));
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => setTimeout(cb, 16));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
    vi.spyOn(console, "log").mockImplementation(() => { });
    vi.spyOn(console, "warn").mockImplementation(() => { });
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("covers every handler class in the registry", () => {
    expect(table.length).toBeGreaterThanOrEqual(30);
  });

  it.each(table)("$name ($type) starts, updates and finishes without throwing", ({ type, Handler }) => {
    const duel = stub("duel");
    const event = stub("event");
    event.type = type;
    // Real zone names, so zone lookups resolve to (stub) field zones.
    event.originZone = "M-1";
    event.attackingZone = "M-1";
    event.zone = "M-2";
    event.attackedZone = "M-3";
    const onCompleted = vi.fn();
    const props = {
      duel,
      ygo: duel.ygo,
      event,
      onCompleted,
      playSound: vi.fn(),
      startTask: vi.fn(),
    };

    const handler = new Handler(props);
    expect(() => handler.start()).not.toThrow();
    expect(() => handler.update(0.016)).not.toThrow();
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
    expect(() => handler.finish()).not.toThrow();
  });
});
