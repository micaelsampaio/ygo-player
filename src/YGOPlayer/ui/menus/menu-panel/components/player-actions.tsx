import { useCallback, useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../../core/YGODuel";
import { YGOPlayerRemoteActions } from "ygo-core";
import { YGOStatic } from "../../../../core/YGOStatic";

const LONG_PRESS_MS = 600;

export function PlayerRemoteActionsComponent({ duel }: { duel: YGODuel }) {
  const [continuousAccept, setContinuousAccept] = useState(duel.continuousAccept);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    const handler = () => setContinuousAccept(duel.continuousAccept);
    duel.events.on("render-ui", handler);
    return () => duel.events.off("render-ui", handler);
  }, [duel]);

  const onOkPointerDown = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      duel.continuousAccept = !duel.continuousAccept;
      if (duel.continuousAccept) {
        duel.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.ContinuousOK });
      } else {
        duel.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.CancelContinuousOK });
      }
      duel.events.dispatch("render-ui");
    }, LONG_PRESS_MS);
  }, [duel]);

  const onOkPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onOkClick = useCallback(() => {
    if (isLongPress.current) return;
    if (duel.continuousAccept) return;
    duel.passPriority();
  }, [duel]);

  const thinking = useCallback(() => {
    duel.continuousAccept = false;
    duel.events.dispatch("render-ui");
    duel.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.Thinking });
  }, [duel]);

  const wait = useCallback(() => {
    duel.continuousAccept = false;
    duel.events.dispatch("render-ui");
    duel.serverActions.ygo.setPlayerPriority(YGOStatic.playerIndex);
    duel.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.WAIT });
  }, [duel]);

  return <div className="ygo-player-actions-menu">
    <button
      className={`ygo-btn ygo-btn-action${continuousAccept ? " ygo-btn-action-active" : ""}`}
      type="button"
      onPointerDown={onOkPointerDown}
      onPointerUp={onOkPointerUp}
      onClick={onOkClick}
    >
      <div className="ygo-ui-icon ygo-p-action-ok"></div>
    </button>
    <button className="ygo-btn ygo-btn-action" type="button" onClick={thinking}>
      <div className="ygo-ui-icon ygo-p-action-think"></div>
    </button>
    <button className="ygo-btn ygo-btn-action" type="button" onClick={wait}>
      <div className="ygo-ui-icon ygo-p-action-wait"></div>
    </button>
  </div>
}
