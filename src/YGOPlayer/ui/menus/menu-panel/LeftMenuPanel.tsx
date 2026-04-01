import { useCallback, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { Chat } from "./components/chat";
import { SelectedCardMenu } from "./components/selected-card-menu";
import { stopPropagationCallback } from "../../../scripts/utils";
import { PlayerRemoteActionsComponent } from "./components/player-actions";
import { GameTimelineControls } from "./components/timeline-controls";
import { YgoAsideMenu } from "./components/mobile-aside";
import { MobileSelectedCardButton } from "./components/mobile-selected-card-button";
import "./left-menu.css";


enum LEFT_MENUS {
  EMPTY,
  SELECTED_CARD
}

export function LeftMenuPanel({ duel, isMobile }: { duel: YGODuel, isMobile: boolean }) {
  const [replayCommands] = useState(duel.config.gameMode === "REPLAY");
  const [openMenu, setOpenMenu] = useState<LEFT_MENUS>(LEFT_MENUS.EMPTY)

  const toggleSettings = useCallback((e: React.MouseEvent) => {
    stopPropagationCallback(e);
    duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "settings-menu" });
  }, [duel]);

  return <>
    {isMobile && <div className="ygo-left-menu-panel-mobile">
      <MobileSelectedCardButton
        duel={duel}
        toggle={() => {
          setOpenMenu(LEFT_MENUS.SELECTED_CARD);
          duel.clearActions();
        }} />

      <button className="ygo-floating-button" onClick={(e) => {
        setOpenMenu(LEFT_MENUS.EMPTY)
        duel.clearActions();
        toggleSettings(e);
      }}>
        <svg className="ygo-floating-button-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" /></svg>
      </button>
    </div>}


    <div className="ygo-left-menu-panel">
      <button onClick={() => setOpenMenu(LEFT_MENUS.SELECTED_CARD)}>SELECTED CARD</button>
      <div className="ygo-left-top-menus">
        <div className="ygo-selected">Card Info</div>
        <div onClick={toggleSettings}>Settings</div>
      </div>

      <div className="ygo-left-menu-card-container">
        <YgoAsideMenu
          isMobile={isMobile}
          visible={openMenu === LEFT_MENUS.SELECTED_CARD}
          close={() => setOpenMenu(LEFT_MENUS.EMPTY)}
        >
          <SelectedCardMenu
            duel={duel}
          />
        </YgoAsideMenu>
      </div>

      {
        !duel.ygo.options.viewOpponentCards && <>
          <PlayerRemoteActionsComponent duel={duel} />
        </>
      }


      <Chat duel={duel} />

      {replayCommands && <div className="ygo-left-menu-item-container">
        <GameTimelineControls duel={duel} />
      </div>}

    </div>

  </>
}