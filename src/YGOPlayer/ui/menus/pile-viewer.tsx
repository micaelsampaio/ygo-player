import { useEffect, useMemo, type ReactNode } from "react";
import { Card } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { stopPropagationCallback } from "../../scripts/utils";

/** The duel's card press events for a card in a pile list (long-press preview, drag…). */
export function pileCardPressHandlers(duel: YGODuel, card: Card) {
  return {
    onMouseDown: (event: any) => duel.events.dispatch("on-card-mouse-down", { card, event }),
    onMouseUp: (event: any) => duel.events.dispatch("on-card-mouse-up", { card, event }),
    onTouchStart: (event: any) => duel.events.dispatch("on-card-mouse-down", { card, event }),
    onTouchEnd: (event: any) => duel.events.dispatch("on-card-mouse-up", { card, event }),
  };
}

export type OpenPileCardMenu = (e: React.SyntheticEvent, card: Card) => void;

/**
 * The right-side overlay that lists a pile (Graveyard, Banished, Extra
 * Deck): close button, zone icon, the card list, and opening a card's menu
 * (`menuEventType`) as the selected card. While mounted it marks `pile` as
 * having its menu open; scrolling it clears a pending card menu. `children`
 * renders the cards, given the function that opens a card's menu.
 */
export function PileViewer({
  duel,
  player,
  pile,
  visible,
  hasAction,
  menuEventType,
  closeType,
  iconClass,
  children,
}: {
  duel: YGODuel;
  player: number;
  /** The game pile object whose `isMenuVisible` tracks this overlay. */
  pile: { isMenuVisible: boolean } | null | undefined;
  visible: boolean;
  hasAction: boolean;
  menuEventType: string;
  /** The overlay's close-ui-menu type ("graveyard", "banish", "extra-deck"). */
  closeType: string;
  /** The zone icon's modifier class ("gy", "b", "ed"). */
  iconClass: string;
  children: (openCardMenu: OpenPileCardMenu) => ReactNode;
}) {
  const action = useMemo(() => {
    const action = new ActionUiMenu(duel, { eventType: menuEventType });
    return action;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel]);

  useEffect(() => {
    if (pile) {
      pile.isMenuVisible = true;
      return () => {
        pile.isMenuVisible = false;
      };
    }
  }, [pile]);

  if (!visible) return null;
  if (!duel.ygo) return null;

  const openCardMenu: OpenPileCardMenu = (e, card) => {
    action.eventData = {
      duel,
      card,
      mouseEvent: e,
      htmlCardElement: e.currentTarget,
    };
    duel.actionManager.setAction(action);
    duel.gameActions.setSelectedCard({
      player,
      card,
    });
  };

  return (
    <div
      className="float-right-menu ygo-right-menu-grid"
      onMouseMove={stopPropagationCallback}
      role="presentation"
      onClick={stopPropagationCallback}
      onScroll={() => {
        if (hasAction) {
          duel.events.dispatch("clear-ui-action");
        }
      }}
    >
      <button aria-label="Close"
        className="float-right-menu-toggle-btn"
        onClick={() => {
          duel.events.dispatch("close-ui-menu", {
            group: "game-overlay",
            type: closeType,
          });
        }}
      >
        <div className="ygo-close-btn-icon"></div>
      </button>

      <div className="float-right-menu-icon">
        <div className={`ygo-icon-game-zone ygo-icon-game-zone-${iconClass}`}></div>
      </div>

      <div className="float-right-menu-content">
        <div className="float-right-menu-cards">
          {children(openCardMenu)}
        </div>
      </div>
    </div>
  );
}
