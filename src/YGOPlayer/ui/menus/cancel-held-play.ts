import { useEffect, useRef } from "react";
import { YGOClientType } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import { bindEscapeToCancel, escapeOwnedElsewhere } from "../components/escape-to-cancel";
import type { PromptData } from "../../domain/assist-prompt";

/**
 * A bot duel's held prompt in the human's own play (the zone of a Normal
 * Summon, a Set, a Spell's activation; an effect's target, a position…) can
 * be backed out of: the server's undo takes the play back to the decision
 * point it started from (ygo-socket-server botUndo — PLAY_CANCELLED when the
 * board hadn't moved yet, else an ordinary timeline move).
 * Only the duelist, and not in replays.
 */
export function canCancelHeldPlay(duel: YGODuel): boolean {
  return !!duel.ygo?.options?.botDuel && duel.client?.type === YGOClientType.PLAYER && duel.config?.gameMode !== "REPLAY";
}

/**
 * Whether `prompt` (held for the human) gets the held-play cancel:
 * - not when the engine offers its own cancel (`cancelable`: respond 'cancel');
 * - a zone prompt always (the zone of the human's own card);
 * - any other kind (a target / Tribute / material, a position, yes/no, an
 *   option) on the human's own turn only: on the bot's turn a prompt can come
 *   from the bot's own play, and undo there would take back more than it.
 */
export function heldPromptCancellable(duel: YGODuel, prompt: PromptData): boolean {
  if (!canCancelHeldPlay(duel) || prompt.cancelable) return false;
  if (prompt.kind === "place") return true;
  const me = duel.perspective?.playerIndex;
  return me !== undefined && duel.ygo?.state?.turnPlayer === me;
}

/**
 * Escape (ahead of the settings menu's and the zone glow's own Escape) and a
 * right-click on the board call `onCancel`. Both step aside while a dialog
 * (bindEscapeToCancel: the enlarged card, a confirm, the LP popover) or
 * `yieldTo()` (a popup / menu that owns Escape) is there, so one key press
 * never closes that and cancels the play too. Returns the unsubscribe.
 */
export function bindCancelHeldPlay(doc: EventTarget, canvas: EventTarget | null | undefined, onCancel: () => void, yieldTo?: () => boolean): () => void {
  const unbindEscape = bindEscapeToCancel(doc, onCancel, { fallback: true, yieldTo });
  const onContextMenu = (event: Event) => {
    if (escapeOwnedElsewhere(doc, yieldTo)) return;
    event.preventDefault();
    onCancel();
  };
  canvas?.addEventListener("contextmenu", onContextMenu);
  return () => {
    unbindEscape();
    canvas?.removeEventListener("contextmenu", onContextMenu);
  };
}

/** While `enabled`: Escape / right-click cancel the held play through the server's undo
 * (yielding to a popup / menu / drag that has its own Escape on the duel's hotkeys). */
export function useCancelHeldPlay(duel: YGODuel, enabled: boolean): () => void {
  const sentRef = useRef(false);
  const cancel = () => {
    if (sentRef.current) return;
    sentRef.current = true;
    duel.serverActions.controls.previousCommand();
  };
  useEffect(() => {
    if (!enabled) return;
    sentRef.current = false;
    return bindCancelHeldPlay(document, duel.core?.renderer?.domElement, cancel, () => !!duel.globalHotKeysManager?.claimed("escPressed"));
    // cancel only reads refs and duel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel, enabled]);
  return cancel;
}
