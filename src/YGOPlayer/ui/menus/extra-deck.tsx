import { useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Card } from "ygo-core";

export function ExtraDeck({
  duel,
  player,
  hasAction,
  clearAction,
  visible = true,
}: {
  player: number;
  duel: YGODuel;
  visible: boolean;
  hasAction: boolean;
  clearAction: () => void;
}) {
  const action = useMemo(() => {
    const action = new ActionUiMenu(duel, {
      eventType: "card-extra-deck-menu",
    });
    return action;
  }, [duel]);

  if (!visible) return null;
  if (!duel.ygo) return null;

  const field = duel.ygo.state.fields[player];
  const cards = field.extraDeck;

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
      onScroll={() => {
        if (hasAction) {
          duel.events.dispatch("clear-ui-action");
        }
      }}
    >
      <h2>EX Deck</h2>
      <hr />
      {cards.map((card: Card) => (
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
              duel.events.dispatch("set-selected-card", { player, card });
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
