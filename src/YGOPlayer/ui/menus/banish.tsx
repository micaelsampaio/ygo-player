import { useEffect, useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Banish as GameBanish } from "../../../YGOPlayer/game/Banish";
import { Card } from "ygo-core";
import { stopPropagationCallback } from "../../scripts/utils";
import { YGOStatic } from "../../core/YGOStatic";

export function Banish({
  duel,
  banish,
  visible = true,
  hasAction,
}: {
  duel: YGODuel;
  banish: GameBanish;
  visible: boolean;
  hasAction: boolean;
}) {
  const action = useMemo(() => {
    const action = new ActionUiMenu(duel, { eventType: "card-banish-menu" });
    return action;
  }, [duel]);

  useEffect(() => {
    if (banish) {
      banish.isMenuVisible = true;
      return () => {
        banish.isMenuVisible = false;
      };
    }
  }, [banish]);

  if (!visible) return null;
  if (!duel.ygo) return null;

  const field = duel.ygo.state.fields[banish.player];
  const cards = field.banishedZone;
  const isPlayerPOV = YGOStatic.isPlayerPOV(banish.player);

  return (
    <div
      className="float-right-menu ygo-right-menu-grid"
      onMouseMove={stopPropagationCallback}
      onClick={stopPropagationCallback}
      onScroll={() => {
        if (hasAction) {
          duel.events.dispatch("clear-ui-action");
        }
      }}
    >
      <button
        className="float-right-menu-toggle-btn"
        onClick={() => {
          duel.events.dispatch("close-ui-menu", {
            group: "game-overlay",
            type: "banish",
          });
        }}
      >
        <div className="ygo-close-btn-icon"></div>
      </button>

      <div className="float-right-menu-icon">
        <div className="ygo-icon-game-zone ygo-icon-game-zone-b"></div>
      </div>

      <div className="float-right-menu-content">
        <div className="float-right-menu-cards">
          {cards.map((card: Card) => {
            const isVisible = card.position !== "facedown" || isPlayerPOV;
            return (
              <div>
                <div
                  style={{ position: "relative" }}
                  onMouseDown={(event: any) =>
                    duel.events.dispatch("on-card-mouse-down", { card, event })
                  }
                  onMouseUp={(event: any) =>
                    duel.events.dispatch("on-card-mouse-up", { card, event })
                  }
                  onTouchStart={(event: any) =>
                    duel.events.dispatch("on-card-mouse-down", { card, event })
                  }
                  onTouchEnd={(event: any) =>
                    duel.events.dispatch("on-card-mouse-up", { card, event })
                  }
                  onClick={(e) => {
                    if (!isVisible) return;
                    action.eventData = {
                      duel,
                      card,
                      mouseEvent: e,
                      htmlCardElement: e.target,
                    };
                    duel.actionManager.setAction(action);
                    duel.gameActions.setSelectedCard({
                      player: banish.player,
                      card,
                    });
                  }}
                >
                  <img
                    src={
                      isVisible
                        ? card.images.small_url
                        : duel.createCdnUrl("/images/card_back.png")
                    }
                    key={card.index}
                    className="ygo-card"
                  />
                  {isPlayerPOV && card?.position?.includes("facedown") && (
                    <div className="ygo-card-banish-fd-icon"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}