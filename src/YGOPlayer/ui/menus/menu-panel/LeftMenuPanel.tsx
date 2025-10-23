import { useCallback } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { Chat } from "./components/chat";
import { SelectedCardMenu } from "./components/selected-card-menu";
import { stopPropagationCallback } from "../../../scripts/utils";
import { PlayerRemoteActionsComponent } from "./components/player-actions";
import "./left-menu.css";

export function LeftMenuPanel({ duel }: { duel: YGODuel }) {

  const toggleSettings = useCallback((e: React.MouseEvent) => {
    stopPropagationCallback(e);
    duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "settings-menu" });
  }, [duel]);

  if (!duel) return null;

  return <div className="ygo-left-menu-panel">

    <div className="ygo-left-top-menus">
      <div className="ygo-selected">Card Info</div>
      <div onClick={toggleSettings}>Settings</div>
    </div>

    <div className="ygo-left-menu-card-container">
      <SelectedCardMenu
        duel={duel}
      />
    </div>

    {
      !duel.ygo.options.viewOpponentCards && <>
        <PlayerRemoteActionsComponent duel={duel} />
      </>
    }

    <div className="ygo-left-menu-chat-container">
      <Chat duel={duel} />
    </div>
  </div>
}