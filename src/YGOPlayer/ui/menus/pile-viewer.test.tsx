import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import type { Card } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import { pileCardPressHandlers, PileViewer } from "./pile-viewer";

/** Node has no DOM MouseEvent: a stand-in that keeps what the long-press preview reads. */
class FakeMouseEvent {
  type: string;
  clientX: number;
  clientY: number;
  button = 0;
  constructor(type: string, init: { clientX?: number; clientY?: number } = {}) {
    this.type = type;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
  }
}

const card = { id: 7, name: "Ash Blossom" } as Card;

function fakeDuel() {
  const dispatch = vi.fn();
  return { duel: { events: { dispatch }, ygo: {} } as unknown as YGODuel, dispatch };
}

describe("pileCardPressHandlers", () => {
  beforeEach(() => vi.stubGlobal("MouseEvent", FakeMouseEvent));
  afterEach(() => vi.unstubAllGlobals());

  it("hands a mouse press's native event to the duel's card press events", () => {
    const { duel, dispatch } = fakeDuel();
    const native = { type: "mousedown", button: 0, clientX: 10, clientY: 20 };
    const handlers = pileCardPressHandlers(duel, card);
    handlers.onMouseDown({ nativeEvent: native } as unknown as ReactMouseEvent);
    handlers.onMouseUp({ nativeEvent: { ...native, type: "mouseup" } } as unknown as ReactMouseEvent);
    expect(dispatch).toHaveBeenNthCalledWith(1, "on-card-mouse-down", { card, event: native });
    expect(dispatch.mock.calls[1][0]).toBe("on-card-mouse-up");
    expect(dispatch.mock.calls[1][1].event.type).toBe("mouseup");
  });

  it("turns a touch into a mouse event at the touch point, keeping the touch's type", () => {
    const { duel, dispatch } = fakeDuel();
    const touch = { clientX: 33, clientY: 44 };
    const handlers = pileCardPressHandlers(duel, card);
    handlers.onTouchStart({ type: "touchstart", touches: [touch], changedTouches: [touch] } as unknown as ReactTouchEvent);
    const [name, payload] = dispatch.mock.calls[0];
    expect(name).toBe("on-card-mouse-down");
    expect(payload.card).toBe(card);
    expect(payload.event).toMatchObject({ type: "touchstart", clientX: 33, clientY: 44 });
  });

  it("uses the lifted finger on touch end (no touches left)", () => {
    const { duel, dispatch } = fakeDuel();
    pileCardPressHandlers(duel, card).onTouchEnd({ type: "touchend", touches: [], changedTouches: [{ clientX: 5, clientY: 6 }] } as unknown as ReactTouchEvent);
    expect(dispatch).toHaveBeenCalledWith("on-card-mouse-up", { card, event: expect.objectContaining({ type: "touchend", clientX: 5, clientY: 6 }) });
  });
});

describe("PileViewer", () => {
  const render = (visible: boolean, duel: YGODuel = fakeDuel().duel) => renderToStaticMarkup(
    <PileViewer duel={duel} player={0} pile={null} visible={visible} hasAction={false} menuEventType="card-gy-menu" closeType="graveyard" iconClass="gy">
      {() => <span>cards</span>}
    </PileViewer>,
  );

  it("renders nothing while hidden or before the duel has a game", () => {
    expect(render(false)).toBe("");
    expect(render(true, { events: { dispatch: vi.fn() } } as unknown as YGODuel)).toBe("");
  });

  it("shows the pile's zone icon and its cards", () => {
    const html = render(true);
    expect(html).toContain("ygo-icon-game-zone-gy");
    expect(html).toContain("<span>cards</span>");
    expect(html).toContain('aria-label="Close"');
  });
});
