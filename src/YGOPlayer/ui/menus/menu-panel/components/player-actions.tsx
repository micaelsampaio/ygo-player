import { useCallback, useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../../core/YGODuel";
import { YGOPlayerRemoteActions } from "ygo-core";
import { YGOStatic } from "../../../../core/YGOStatic";

const LONG_PRESS_MS = 600;

export function PlayerRemoteActionsComponent({ duel }: { duel: YGODuel }) {
  // Lit for a held OK, and in Assisted Mode for Chain stops Off (the same thing, kept on).
  const isLit = () => duel.continuousAccept || duel.chainStops?.value === "off";
  const [continuousAccept, setContinuousAccept] = useState(isLit);
  const [chainStopsOff, setChainStopsOff] = useState(duel.chainStops?.value === "off");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    const handler = () => {
      setContinuousAccept(isLit());
      setChainStopsOff(duel.chainStops?.value === "off");
    };
    duel.events.on("render-ui", handler);
    return () => duel.events.off("render-ui", handler);
  }, [duel]);

  const onOkPointerDown = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      // Chain stops is Off: holding OK turns it back to Auto.
      if (duel.chainStops?.value === "off" && !duel.continuousAccept) {
        duel.chainStops.set("auto");
        return;
      }
      duel.continuousAccept = !duel.continuousAccept;
      if (duel.continuousAccept) {
        duel.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.ContinuousOK });
      } else {
        duel.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.CancelContinuousOK });
      }
      duel.events.dispatch("render-ui");
    }, LONG_PRESS_MS);
  }, [duel]);

  // Also bound to pointerleave/pointercancel so dragging off the button (or
  // the browser taking over the touch) can't still fire the long-press.
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
      onPointerLeave={onOkPointerUp}
      onPointerCancel={onOkPointerUp}
      onClick={onOkClick}
      aria-pressed={continuousAccept}
      aria-label={chainStopsOff && !duel.continuousAccept ? "Chain stops Off (hold to set Auto)" : continuousAccept ? "Auto-pass on (hold to turn off)" : "Pass / OK (hold to auto-pass)"}
      title={chainStopsOff && !duel.continuousAccept ? "Chain stops is Off: only forced chains stop. Hold to set it back to Auto." : continuousAccept ? "Auto-pass is on. Hold to turn it off." : "Pass / OK. Hold to auto-pass every response."}
    >
      <div className="ygo-ui-icon ygo-p-action-ok"></div>
    </button>
    <button className="ygo-btn ygo-btn-action" type="button" onClick={thinking} aria-label="Thinking" title="Thinking: tell your opponent you need a moment">
      <div className="ygo-ui-icon ygo-p-action-think"></div>
    </button>
    <button className="ygo-btn ygo-btn-action" type="button" onClick={wait} aria-label="Wait" title="Wait: ask your opponent to hold, you want to respond">
      <div className="ygo-ui-icon ygo-p-action-wait"></div>
    </button>
  </div>
}
