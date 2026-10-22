import { useCallback, useState } from "react";
import type { YGODuel } from "../../../core/YGODuel";
import { Chat } from "./components/chat";
import { SelectedCardMenu } from "./components/selected-card-menu";
import { stopPropagationCallback } from "../../../scripts/utils";
import { safeGetItem, safeSetItem } from "../../../scripts/safe-storage";
import { PlayerRemoteActionsComponent } from "./components/player-actions";
import { GameTimelineControls } from "./components/timeline-controls";
import { YgoAsideMenu } from "./components/mobile-aside";
import { MobileSelectedCardButton } from "./components/mobile-selected-card-button";
import "./left-menu.css";

enum LEFT_MENUS {
  EMPTY,
  SELECTED_CARD
}

const COLLAPSED_KEY = "ygo-left-panel-collapsed";

function readCollapsed(): boolean {
  return safeGetItem(COLLAPSED_KEY) === "1";
}

export function LeftMenuPanel({ duel, isMobileLayout, showMenus }: { duel: YGODuel, isMobileLayout: boolean, showMenus: boolean }) {
  const [replayCommands] = useState(duel.config.gameMode === "REPLAY");
  const [openMenu, setOpenMenu] = useState<LEFT_MENUS>(LEFT_MENUS.EMPTY)
  // Desktop only (mobile already has its own aside/floating buttons). The
  // contents stay mounted while collapsed so chat history and the selected
  // card survive a collapse/expand.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleCollapsed = useCallback((e: React.MouseEvent) => {
    stopPropagationCallback(e);
    setCollapsed((c) => {
      safeSetItem(COLLAPSED_KEY, c ? "0" : "1");
      return !c;
    });
  }, []);

  const toggleSettings = useCallback((e: React.SyntheticEvent) => {
    stopPropagationCallback(e);
    duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "settings-menu" });
  }, [duel]);

  return <>
    {isMobileLayout && <div className="ygo-left-menu-panel-mobile">
      {/* Pass stays reachable while the other floating buttons are folded away. */}
      {!duel.ygo.options.viewOpponentCards && <PlayerRemoteActionsComponent duel={duel} compact />}
      {showMenus && <>
      <MobileSelectedCardButton
        duel={duel}
        toggle={() => {

          setOpenMenu(LEFT_MENUS.SELECTED_CARD);
          duel.clearActions();
        }} />

      <button type="button" className="ygo-floating-button" aria-label="Settings" title="Settings" onClick={(e) => {
        stopPropagationCallback(e);
        setOpenMenu(LEFT_MENUS.EMPTY)
        duel.clearActions();
        toggleSettings(e);
      }}>
        <GearIcon size={24} />
      </button>
      </>}
    </div>}


    <div className={`ygo-left-menu-panel ${collapsed ? "ygo-left-menu-collapsed" : ""}`}>
      <button
        className="ygo-left-menu-collapse"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand side panel" : "Collapse side panel"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? "»" : "«"}
      </button>

      {/* A heading and two square buttons (Settings, collapse): nothing that looks like a tab. */}
      <div className="ygo-left-top-menus">
        <h2 className="ygo-left-panel-title">Card Info</h2>
        <button type="button" className="ygo-left-panel-icon-button" onClick={toggleSettings} aria-label="Settings" title="Settings (Esc)">
          <GearIcon size={18} />
        </button>
      </div>

      <div className="ygo-left-menu-card-container">
        <YgoAsideMenu
          isMobile={isMobileLayout}
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

function GearIcon({ size }: { size: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" /></svg>;
}
