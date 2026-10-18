import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YGODuelEvents } from "ygo-core";

const h = vi.hoisted(() => ({
  moves: [] as { props: unknown; start: () => void; finish: () => void }[],
}));

vi.mock("./move-card-event", () => ({
  MoveCardEventHandler: class {
    start = vi.fn();
    finish = vi.fn();
    constructor(public props: unknown) {
      h.moves.push(this);
    }
  },
}));

import { SendToGyEventHandler } from "./send-to-gy-event";

type Props = ConstructorParameters<typeof SendToGyEventHandler>[0];

function props(event: Partial<YGODuelEvents.SendToGY>): Props {
  return {
    duel: {},
    ygo: {},
    event: { type: YGODuelEvents.LogType.SendToGY, player: 0, commandId: 1, id: 7, originZone: "M-1", zone: "GY", ...event },
    onCompleted: vi.fn(),
    playSound: vi.fn(),
    startTask: vi.fn(),
  } as unknown as Props; // the handler only routes; it never reads the duel
}

describe("SendToGyEventHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => setTimeout(cb, 16));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
    h.moves.length = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("plays a plain send to the GY as a card move with the same props", () => {
    const p = props({});
    const handler = new SendToGyEventHandler(p);

    expect(h.moves).toHaveLength(1);
    expect(h.moves[0].props).toBe(p);

    handler.start();
    expect(h.moves[0].start).toHaveBeenCalledTimes(1);
    handler.finish();
    expect(h.moves[0].finish).toHaveBeenCalledTimes(1);
  });

  it("only completes, on the next tick, for a send that a summon animation already played", () => {
    const p = props({ reason: "Fusion Summon" });
    const handler = new SendToGyEventHandler(p);

    handler.start();
    expect(h.moves).toHaveLength(0);
    expect(p.onCompleted).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(p.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("drops the pending completion when it is finished first", () => {
    const p = props({ reason: "XYZ Material" });
    const handler = new SendToGyEventHandler(p);

    handler.start();
    handler.finish();
    vi.runAllTimers();

    expect(p.onCompleted).not.toHaveBeenCalled();
  });
});
