import { useEffect, useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Card, YGOGameUtils } from "ygo-core";
import { stopPropagationCallback } from "../../scripts/utils";
import { pileCardProps } from "../components/pile-menu";

export function ExtraDeck({
  duel,
  player,
  hasAction,
  visible = true,
}: {
  player: number;
  duel: YGODuel;
  visible: boolean;
  hasAction: boolean;
}) {
  const action = useMemo(() => {
    const action = new ActionUiMenu(duel, {
      eventType: "card-extra-deck-menu",
    });
    return action;
  }, [duel]);

  useEffect(() => {
    if (duel && player >= 0) {
      duel.fields[player].extraDeck.isMenuVisible = true;
      return () => {
        duel.fields[player].extraDeck.isMenuVisible = false;
      }
    }
  }, [duel, player]);

  if (!visible) return null;
  if (!duel.ygo) return null;

  const field = duel.ygo.state.fields[player];
  const cards = field.extraDeck;

  // From the mouse or, focused, Enter/Space: the card menu anchors to this card's image.
  const openCardMenu = (e: React.SyntheticEvent, card: Card) => {
    action.eventData = {
      duel,
      card,
      mouseEvent: e,
      htmlCardElement: e.currentTarget,
    };
    duel.actionManager.setAction(action);
    duel.gameActions.setSelectedCard({
      player,
      card
    })
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
      <button aria-label="Close" className="float-right-menu-toggle-btn" onClick={() => {
        duel.events.dispatch("close-ui-menu", { group: "game-overlay", type: "extra-deck" })
      }}>
        <div className="ygo-close-btn-icon"></div>
      </button>
      <div className="float-right-menu-icon">
        <div className="ygo-icon-game-zone ygo-icon-game-zone-ed"></div>
      </div>
      <div className="float-right-menu-content">
        <div className="float-right-menu-cards">
          {cards.map((card: Card, cardIndex: number) => (
            <div>
              <img
                onMouseDown={(event: any) => duel.events.dispatch("on-card-mouse-down", { card, event })}
                onMouseUp={(event: any) => duel.events.dispatch("on-card-mouse-up", { card, event })}
                onTouchStart={(event: any) => duel.events.dispatch("on-card-mouse-down", { card, event })}
                onTouchEnd={(event: any) => duel.events.dispatch("on-card-mouse-up", { card, event })}
                onClick={(e) => openCardMenu(e, card)}
                {...pileCardProps<HTMLImageElement>((e) => openCardMenu(e, card), card.name)}
                alt={card.name}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const originZone = YGOGameUtils.createZone("ED", player, cardIndex + 1);
                  duel.gameActions.targetCard({ card, originZone });
                }}
                key={card.index}
                src={card.images.small_url}
                className="ygo-card"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
