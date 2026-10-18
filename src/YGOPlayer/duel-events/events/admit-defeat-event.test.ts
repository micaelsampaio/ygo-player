import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YGODuelEvents } from "ygo-core";
import { AdmitDefeatEventHandler } from "./admit-defeat-event";
import { UpdateFieldEvent } from "./update-field-event";

type Props = ConstructorParameters<typeof AdmitDefeatEventHandler>[0];

function props() {
  const duel = { events: { dispatch: vi.fn() }, endDuel: vi.fn(), updateField: vi.fn() };
  return {
    duel,
    ygo: {},
    event: { type: YGODuelEvents.LogType.AdmitDefeat, player: 1, commandId: 1 },
    onCompleted: vi.fn(),
    playSound: vi.fn(),
    startTask: vi.fn(),
  } as unknown as Props & { duel: typeof duel }; // a stub duel with only what these handlers read
}

describe("timer-completed handlers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AdmitDefeat shows the end-game overlay, ends the duel and reports the defeat on the next tick", () => {
    const p = props();
    new AdmitDefeatEventHandler(p).start();

    expect(p.duel.events.dispatch).toHaveBeenCalledWith("set-ui-menu", {
      group: "game-overlay",
      type: "duel-endgame-overlay",
      data: { loser: 1 },
    });
    expect(p.duel.endDuel).toHaveBeenCalledTimes(1);
    expect(p.onCompleted).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(p.duel.events.dispatch).toHaveBeenCalledWith("game-defeat", { player: 1 });
    expect(p.onCompleted).toHaveBeenCalledTimes(1);
  });

  it("AdmitDefeat finished before the tick neither reports the defeat nor completes", () => {
    const p = props();
    const handler = new AdmitDefeatEventHandler(p);
    handler.start();
    handler.finish();
    vi.runAllTimers();

    expect(p.duel.events.dispatch).not.toHaveBeenCalledWith("game-defeat", expect.anything());
    expect(p.onCompleted).not.toHaveBeenCalled();
  });

  it("UpdateFieldEvent (the fallback) redraws the field and completes on the next tick unless finished", () => {
    const p = props();
    new UpdateFieldEvent(p).start();
    expect(p.duel.updateField).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(0);
    expect(p.onCompleted).toHaveBeenCalledTimes(1);

    const cancelled = props();
    const handler = new UpdateFieldEvent(cancelled);
    handler.start();
    handler.finish();
    vi.runAllTimers();
    expect(cancelled.onCompleted).not.toHaveBeenCalled();
  });

  it("finishing a handler that never started is harmless", () => {
    expect(() => new UpdateFieldEvent(props()).finish()).not.toThrow();
    expect(() => new AdmitDefeatEventHandler(props()).finish()).not.toThrow();
  });
});
