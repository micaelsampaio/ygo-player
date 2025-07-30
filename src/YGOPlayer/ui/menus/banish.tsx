import { useEffect, useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Banish as GameBanish } from "../../../YGOPlayer/game/Banish";
import { Card } from "ygo-core";

export function Banish({
  duel,
  banish,
  visible = true,
}: {
  duel: YGODuel;
  banish: GameBanish;
  visible: boolean;
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
      }
    }
  }, [banish]);

  if (!visible) return null;
  if (!duel.ygo) return null;

  const field = duel.ygo.state.fields[banish.player];
  const cards = field.banishedZone;

  return (
    <div
      className="float-right-menu"
      onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="float-right-menu-icon">
        <div className="ygo-icon-game-zone ygo-icon-game-zone-b"></div>
      </div>

      {cards.map((card: Card) => (
        <div>
          <div style={{ position: "relative" }}
            onMouseDown={(event: any) => duel.events.dispatch("on-card-mouse-down", { card, event })}
            onMouseUp={(event: any) => duel.events.dispatch("on-card-mouse-up", { card, event })}
            onTouchStart={(event: any) => duel.events.dispatch("on-card-mouse-down", { card, event })}
            onTouchEnd={(event: any) => duel.events.dispatch("on-card-mouse-up", { card, event })}
            onClick={(e) => {
              action.eventData = {
                duel,
                card,
                mouseEvent: e,
                htmlCardElement: e.target,
              };
              duel.actionManager.setAction(action);
              duel.events.dispatch("set-selected-card", { player: card.owner, card });
            }}>
            <img
              src={card.images.small_url}
              key={card.index}
              className="ygo-card"
            />
            {card.position === "facedown" && (
              <div className="ygo-card-banish-fd-icon">
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
