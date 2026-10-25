import { useEffect, useMemo, type MouseEvent, type ReactNode, type TouchEvent } from "react";
import { Card } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { stopPropagationCallback } from "../../scripts/utils";
import { cardPointerEvent, hasPointerPosition } from "../components/pile-menu";
import { cancelPendingMenu, openMenuAfterTap, pulseElement, quickActionFor, registerTap, runQuickAction } from "../quick-action";

/** The zone the card menu of each pile viewer reads (assist-card-actions.ts). */
const PILE_ZONES: Record<string, string> = { "card-gy-menu": "GY", "card-banish-menu": "B", "card-extra-deck-menu": "ED" };

/** The duel's card press events for a card in a pile list (long-press preview, drag…). */
export function pileCardPressHandlers(duel: YGODuel, card: Card) {
  return {
    onMouseDown: (event: MouseEvent) => duel.events.dispatch("on-card-mouse-down", { card, event: cardPointerEvent(event) }),
    onMouseUp: (event: MouseEvent) => duel.events.dispatch("on-card-mouse-up", { card, event: cardPointerEvent(event) }),
    onTouchStart: (event: TouchEvent) => duel.events.dispatch("on-card-mouse-down", { card, event: cardPointerEvent(event) }),
    onTouchEnd: (event: TouchEvent) => duel.events.dispatch("on-card-mouse-up", { card, event: cardPointerEvent(event) }),
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

  const showCardMenu = (e: React.SyntheticEvent, card: Card, htmlCardElement: EventTarget | null) => {
    action.eventData = {
      duel,
      card,
      mouseEvent: e,
      htmlCardElement,
    };
    duel.actionManager.setAction(action);
    duel.gameActions.setSelectedCard({
      player,
      card,
    });
  };

  // Assisted Mode: a double-click on your card runs its quick action (ui/quick-action.ts); a single
  // click on a card that has one waits out the double-click window before opening its menu.
  // From the keyboard (no pointer) the menu opens at once.
  const zone = PILE_ZONES[menuEventType];
  const openCardMenu: OpenPileCardMenu = (e, card) => {
    const element = e.currentTarget;
    const pointer = hasPointerPosition(e as unknown as { clientX?: unknown; clientY?: unknown; detail?: unknown });
    if (!zone || !pointer) { showCardMenu(e, card, element); return; }
    const pos = e as unknown as { clientX: number; clientY: number };
    const row = quickActionFor(duel, card, zone, "pile", player);
    if (registerTap(duel, card, pos)) {
      if (row) {
        runQuickAction(duel, row);
        pulseElement(element as Element);
        return;
      }
      cancelPendingMenu(duel);
      showCardMenu(e, card, element);
      return;
    }
    openMenuAfterTap(duel, !!row, () => showCardMenu(e, card, element));
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
