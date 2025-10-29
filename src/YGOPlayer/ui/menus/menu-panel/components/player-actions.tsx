import { useCallback } from "react";
import { YGODuel } from "../../../../core/YGODuel";
import { YGOPlayerRemoteActions } from "ygo-core";
import { YGOStatic } from "../../../../core/YGOStatic";

export function PlayerRemoteActionsComponent({ duel }: { duel: YGODuel }) {

  const ok = useCallback(() => {
    duel.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.OK })
  }, []);

  const thinking = useCallback(() => {
    duel.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.Thinking })
  }, []);

  const wait = useCallback(() => {
    duel.serverActions.ygo.setPlayerPriority(YGOStatic.playerIndex)
    duel.serverActions.ygo.sendPlayerAction({ action: YGOPlayerRemoteActions.WAIT })
  }, []);

  return <div className="ygo-player-actions-menu">
    <button className="ygo-btn ygo-btn-action" type="button" onClick={ok}>
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