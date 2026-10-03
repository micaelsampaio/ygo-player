import { describe, expect, it, vi } from "vitest";
import { YGOAssistController } from "./YGOAssistController";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function setup() {
  const pending: ReturnType<typeof deferred<any>>[] = [];
  const listeners = new Map<string, Function[]>();
  const dispatch = vi.fn((event: string, payload?: any) => (listeners.get(event) ?? []).forEach((l) => l(payload)));
  const host: any = {
    assist: {
      query: vi.fn(() => { const d = deferred<any>(); pending.push(d); return d.promise; }),
      choose: vi.fn(async () => ({ ok: true })),
    },
    events: {
      dispatch,
      on: (e: string, l: Function) => listeners.set(e, [...(listeners.get(e) ?? []), l]),
      off: (e: string, l: Function) => listeners.set(e, (listeners.get(e) ?? []).filter((x) => x !== l)),
    },
    ygo: { state: { registerCardData: vi.fn() } },
  };
  const controller = new YGOAssistController(host);
  const published = () => dispatch.mock.calls.filter((c) => c[0] === "assist-options").map((c) => c[1]);
  return { host, controller, pending, published };
}

const a = { available: true, pending: "idle", options: {} } as any;
const b = { available: true, pending: "chain", respond: {} } as any;

describe("YGOAssistController", () => {
  it("stores and publishes each answer exactly once", async () => {
    const s = setup();
    const seen: any[] = [];
    s.controller.subscribe((o) => seen.push(o));
    const q = s.controller.query();
    s.pending[0].resolve(a);
    await expect(q).resolves.toBe(a);
    expect(s.controller.options).toBe(a);
    expect(s.published()).toEqual([a]);
    expect(seen).toEqual([a]);
  });

  it("drops an answer that arrives after a newer query was sent (still returned to its caller)", async () => {
    const s = setup();
    const first = s.controller.query();
    const second = s.controller.query();
    s.pending[1].resolve(b);
    await second;
    s.pending[0].resolve(a);
    await expect(first).resolves.toBe(a);
    expect(s.controller.options).toBe(b);
    expect(s.published()).toEqual([b]);
  });

  it("registers the card data the answer carries, even when superseded", async () => {
    const s = setup();
    const first = s.controller.query();
    s.controller.query();
    s.pending[0].resolve({ ...a, cards: [{ id: 1 }] });
    await first;
    expect(s.host.ygo.state.registerCardData).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("a failed newest query clears the options (refresh swallows the error, query rethrows)", async () => {
    const s = setup();
    s.controller.options = a;
    const r = s.controller.refresh();
    s.pending[0].reject(new Error("boom"));
    await r;
    expect(s.controller.options).toBeNull();
    expect(s.published()).toEqual([null]);
    const q = s.controller.query();
    s.pending[1].reject(new Error("again"));
    await expect(q).rejects.toThrow("again");
  });

  it("clear() drops the options and any answer still on its way", async () => {
    const s = setup();
    s.controller.options = a;
    const q = s.controller.query();
    s.controller.clear();
    s.pending[0].resolve(b);
    await q;
    expect(s.controller.options).toBeNull();
    expect(s.published()).toEqual([null]);
  });

  it("counts queries in flight", async () => {
    const s = setup();
    const q = s.controller.query();
    expect(s.controller.inFlight).toBe(1);
    s.pending[0].resolve(a);
    await q;
    expect(s.controller.inFlight).toBe(0);
  });

  it("without assist, query answers null and choose rejects", async () => {
    const s = setup();
    delete s.host.assist;
    await expect(s.controller.query()).resolves.toBeNull();
    await expect(s.controller.choose({ commandType: "Pass", data: {} })).rejects.toThrow();
  });

  it("space action / hand pick: removing only clears its own handler", () => {
    const s = setup();
    const first = () => true;
    const removeFirst = s.controller.setSpaceAction(first);
    const second = () => false;
    s.controller.setSpaceAction(second);
    removeFirst();
    expect(s.controller.spaceAction).toBe(second);
    const pick = () => true;
    const removePick = s.controller.setHandPick(pick);
    expect(s.controller.handPick).toBe(pick);
    removePick();
    expect(s.controller.handPick).toBeNull();
  });
});
