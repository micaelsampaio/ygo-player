import { useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Banish as GameBanish } from "../../../YGOPlayer/game/Banish";

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
      <h2>Banish</h2>
      <hr />
      {cards.map((card: any) => (
        <div>
          <div style={{ position: "relative" }}>
            <img
              onClick={(e) => {
                action.eventData = {
                  duel,
                  card,
                  mouseEvent: e,
                  htmlCardElement: e.target,
                };
                duel.actionManager.setAction(action);
                duel.events.dispatch("set-selected-card", { player: card.owner, card });
              }}
              src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`}
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

  // TODO
}
