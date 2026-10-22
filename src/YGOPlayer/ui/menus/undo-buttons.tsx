import { useCallback, useEffect, useState } from "react";
import { YGOClientType } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import { stopPropagationCallback } from "../../scripts/utils";
import { undoTooltip } from "../duel-status";

/**
 * Undo, and Redo once something was undone, as floating buttons beside the others. Phases and
 * the end of the turn stay on the field's phase marker (N and E on a keyboard). Not in replays,
 * which have their own controls, nor for spectators.
 */
export function UndoButtons({ duel }: { duel: YGODuel }) {
  // Redo only once you've undone something: in a bot duel the moves still waiting to animate
  // count as "next" too.
  const [undone, setUndone] = useState(false);

  const undo = useCallback((e: React.MouseEvent) => {
    stopPropagationCallback(e);
    duel.serverActions.controls.previousCommand();
    setUndone(true);
  }, [duel]);

  const redo = useCallback((e: React.MouseEvent) => {
    stopPropagationCallback(e);
    duel.serverActions.controls.nextCommand();
  }, [duel]);

  // Back at the end of the timeline (redone, or a new play replaced what was undone).
  useEffect(() => {
    if (undone && !duel.ygo.hasNextCommand()) setUndone(false);
  });

  if (duel.config.gameMode === "REPLAY" || duel.client?.type !== YGOClientType.PLAYER) return null;
  const hasPrev = duel.ygo.hasPrevCommand();
  const hasNext = undone && duel.ygo.hasNextCommand();

  return <>
    {hasNext && <button type="button" className="ygo-floating-button" onClick={redo} title="Redo (→)" aria-label="Redo">
      <svg className="ygo-floating-button-icon ygo-undo-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
    </button>}
    <button type="button" className="ygo-floating-button" onClick={undo} disabled={!hasPrev} title={undoTooltip(duel.ygo.options) ?? "Undo (←)"} aria-label="Undo">
      <svg className="ygo-floating-button-icon ygo-undo-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
    </button>
  </>;
}
