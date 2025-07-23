import { useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Graveyard as GameGraveyard } from "../../../YGOPlayer/game/Graveyard";
import { Card } from "ygo-core";

export function Graveyard({
  duel,
  graveyard,
  visible = true,
}: {
  duel: YGODuel;
  graveyard: GameGraveyard;
  visible: boolean;
}) {
  const action = useMemo(() => {
    const action = new ActionUiMenu(duel, { eventType: "card-gy-menu" });
    return action;
  }, [duel]);

  if (!visible) return null;
  if (!duel.ygo) return null;

  const field = duel.ygo.state.fields[graveyard.player];
  const gy = field.graveyard;

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
        <div className="ygo-icon-game-zone ygo-icon-game-zone-gy"></div>
      </div>

      {gy.map((card: Card) => (
        <div>
          <img
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
              duel.events.dispatch("set-selected-card", {
                graveyard,
                player: graveyard.player,
                card,
              });
            }}
            key={card.index}
            src={card.images.small_url}
            className="ygo-card"
          />
        </div>
      ))}
    </div>
  );

  // TODO
}
