import { useEffect, useRef } from "react";
import { YGOClientType } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import { bindEscapeToCancel } from "../components/escape-to-cancel";

/**
 * A bot duel's held zone prompt (the zone of a Normal Summon, a Set, a Spell's
 * activation) can be backed out of: the server's undo takes the play back to
 * the decision point it started from (ygo-socket-server botUndo, PLAY_CANCELLED).
 * Only the duelist, and not in replays.
 */
export function canCancelHeldPlay(duel: YGODuel): boolean {
  return !!duel.ygo?.options?.botDuel && duel.client?.type === YGOClientType.PLAYER && duel.config?.gameMode !== "REPLAY";
}

/**
 * Escape (ahead of the settings menu's and the zone glow's own Escape) and a
 * right-click on the board call `onCancel`. Returns the unsubscribe.
 */
export function bindCancelHeldPlay(doc: EventTarget, canvas: EventTarget | null | undefined, onCancel: () => void): () => void {
  const unbindEscape = bindEscapeToCancel(doc, onCancel);
  const onContextMenu = (event: Event) => {
    event.preventDefault();
    onCancel();
  };
  canvas?.addEventListener("contextmenu", onContextMenu);
  return () => {
    unbindEscape();
    canvas?.removeEventListener("contextmenu", onContextMenu);
  };
}

/** While `enabled`: Escape / right-click cancel the held play through the server's undo. */
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
    return bindCancelHeldPlay(document, duel.core?.renderer?.domElement, cancel);
    // cancel only reads refs and duel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel, enabled]);
  return cancel;
}
