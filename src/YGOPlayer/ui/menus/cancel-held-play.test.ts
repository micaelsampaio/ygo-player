import { describe, expect, it, vi } from "vitest";
import { YGOClientType } from "ygo-core";
import { bindCancelHeldPlay, canCancelHeldPlay, heldPromptCancellable } from "./cancel-held-play";
import { bindEscapeToCancel } from "../components/escape-to-cancel";
import { HotKeyManager } from "../../scripts/hotkey-manager";
import type { PromptData } from "../../domain/assist-prompt";

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

  it("covers the human's own held prompts, never one the engine can cancel itself, and only zones on the bot's turn", () => {
    const duel = (turnPlayer: number, botDuel = true) =>
      ({ ygo: { options: { botDuel }, state: { turnPlayer } }, client: { type: YGOClientType.PLAYER }, config: { gameMode: "DUEL" }, perspective: { playerIndex: 0 } }) as never;
    const prompt = (over: Partial<PromptData>): PromptData => ({ player: 0, msg: 15, kind: "card", ...over });
    for (const kind of ["card", "tribute", "unselectCard", "effectYesNo", "yesNo", "option", "position", "place"] as const) {
      expect(heldPromptCancellable(duel(0), prompt({ kind }))).toBe(true);
    }
    // The engine's own cancel ('cancel' / 'finish') stays the way out.
    expect(heldPromptCancellable(duel(0), prompt({ kind: "card", cancelable: true }))).toBe(false);
    expect(heldPromptCancellable(duel(0), prompt({ kind: "unselectCard", cancelable: true }))).toBe(false);
    // The bot's turn: its own play can prompt the human; only a zone (the human's own card) is theirs.
    expect(heldPromptCancellable(duel(1), prompt({ kind: "card" }))).toBe(false);
    expect(heldPromptCancellable(duel(1), prompt({ kind: "position" }))).toBe(false);
    expect(heldPromptCancellable(duel(1), prompt({ kind: "place" }))).toBe(true);
    expect(heldPromptCancellable(duel(0, false), prompt({ kind: "card" }))).toBe(false);
  });

  it("steps aside while a dialog's own Escape is bound: one Escape never does both", () => {
    const doc = new EventTarget();
    const canvas = new EventTarget();
    const onCancel = vi.fn();
    const onClose = vi.fn();
    const unbind = bindCancelHeldPlay(doc, canvas, onCancel);
    // The enlarged card opens over the prompt (its listener comes after ours on the same target).
    const unbindDialog = bindEscapeToCancel(doc, onClose);

    doc.dispatchEvent(Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    canvas.dispatchEvent(new Event("contextmenu", { cancelable: true }));
    expect(onCancel).not.toHaveBeenCalled();

    unbindDialog();
    unbindDialog(); // twice is harmless
    doc.dispatchEvent(Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    unbind();
  });

  it("steps aside while a popup / menu / drag owns Escape on the duel's hotkeys, not for the ambient ones", () => {
    vi.stubGlobal("window", new EventTarget()); // tinykeys binds on window
    const hotkeys = new HotKeyManager();
    const doc = new EventTarget();
    const onCancel = vi.fn();
    const unbind = bindCancelHeldPlay(doc, null, onCancel, () => hotkeys.claimed("escPressed"));
    const esc = () => {
      const event = Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" });
      doc.dispatchEvent(event);
      return event.defaultPrevented;
    };

    // The default Escape (Settings) and the field glow's dismiss are background: the cancel goes first.
    hotkeys.on("escPressed", () => {}, { background: true });
    const offGlow = hotkeys.on("escPressed", () => {}, { background: true });
    expect(esc()).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);

    // A GY view open over the prompt: its Escape closes it, the play stays.
    const offPopup = hotkeys.on("escPressed", () => {});
    expect(esc()).toBe(false);
    expect(onCancel).toHaveBeenCalledTimes(1);
    offPopup();
    offGlow();
    expect(esc()).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(2);
    unbind();
    hotkeys.destroy();
    vi.unstubAllGlobals();
  });
});
