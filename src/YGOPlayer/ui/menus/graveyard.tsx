import { useEffect, useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Graveyard as GameGraveyard } from "../../../YGOPlayer/game/Graveyard";
import { Card } from "ygo-core";
import { stopPropagationCallback } from "../../scripts/utils";

export function Graveyard({
  duel,
  graveyard,
  visible = true,
  hasAction,
}: {
  duel: YGODuel;
  graveyard: GameGraveyard;
  visible: boolean;
  hasAction: boolean;
}) {
  const action = useMemo(() => {
    const action = new ActionUiMenu(duel, { eventType: "card-gy-menu" });
    return action;
  }, [duel]);

  useEffect(() => {
    if (graveyard) {
      graveyard.isMenuVisible = true;
      return () => {
        graveyard.isMenuVisible = false;
      };
    }
  }, [graveyard]);

  if (!visible) return null;
  if (!duel.ygo) return null;

  const field = duel.ygo.state.fields[graveyard.player];
  const gy = field.graveyard;

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
            type: "graveyard",
          });
        }}
      >
        <div className="ygo-close-btn-icon"></div>
      </button>

      <div className="float-right-menu-icon">
        <div className="ygo-icon-game-zone ygo-icon-game-zone-gy"></div>
      </div>

      <div className="float-right-menu-content">
        <div className="float-right-menu-cards">
          {gy.map((card: Card) => (
            <div key={card.index}>
              <img
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
                  action.eventData = {
                    duel,
                    card,
                    mouseEvent: e,
                    htmlCardElement: e.target,
                  };
                  duel.actionManager.setAction(action);
                  duel.gameActions.setSelectedCard({
                    player: graveyard.player,
                    card,
                  });
                }}
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
