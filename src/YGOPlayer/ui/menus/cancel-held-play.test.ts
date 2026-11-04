import { describe, expect, it, vi } from "vitest";
import { YGOClientType } from "ygo-core";
import { bindCancelHeldPlay, canCancelHeldPlay } from "./cancel-held-play";

const duelWith = (botDuel: boolean, type: YGOClientType, gameMode = "DUEL") =>
  ({ ygo: { options: { botDuel } }, client: { type }, config: { gameMode } }) as never;

describe("cancel a held play", () => {
  it("is offered to the duelist of a bot duel only, never in replays", () => {
    expect(canCancelHeldPlay(duelWith(true, YGOClientType.PLAYER))).toBe(true);
    expect(canCancelHeldPlay(duelWith(false, YGOClientType.PLAYER))).toBe(false);
    expect(canCancelHeldPlay(duelWith(true, YGOClientType.SPECTATOR))).toBe(false);
    expect(canCancelHeldPlay(duelWith(true, YGOClientType.PLAYER, "REPLAY"))).toBe(false);
  });

  it("Escape and a right-click on the board cancel, and stop there; unbinding ends it", () => {
    const doc = new EventTarget();
    const canvas = new EventTarget();
    const onCancel = vi.fn();
    const unbind = bindCancelHeldPlay(doc, canvas, onCancel);

    const esc = Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" });
    doc.dispatchEvent(esc);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(esc.defaultPrevented).toBe(true);

    doc.dispatchEvent(Object.assign(new Event("keydown"), { key: "a" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    const right = new Event("contextmenu", { cancelable: true });
    canvas.dispatchEvent(right);
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(right.defaultPrevented).toBe(true);

    unbind();
    doc.dispatchEvent(Object.assign(new Event("keydown"), { key: "Escape" }));
    canvas.dispatchEvent(new Event("contextmenu"));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
