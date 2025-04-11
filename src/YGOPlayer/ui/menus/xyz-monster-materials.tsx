import { useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Card, FieldZone } from "ygo-core";

export function XyzMonsterMaterialsMenu({
  duel,
  card,
  zone,
  visible = true,
}: {
  duel: YGODuel;
  card: Card;
  zone: FieldZone;
  visible: boolean;
}) {
  const action = useMemo(() => {
    const action = new ActionUiMenu(duel, { eventType: "card-materials-menu" });
    return action;
  }, [duel]);

  if (!visible) return null;
  if (!duel.ygo) return null;
  if (!card) return null;

  const materials = card.materials;

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
      <h2>Materials</h2>
      <hr />
      {materials.map((material: Card) => (
        <div>
          <img
            onClick={(e) => {
              action.eventData = {
                duel,
                card,
                material,
                originZone: zone,
                mouseEvent: e,
                htmlCardElement: e.target,
              };
              duel.actionManager.setAction(action);
            }}
            key={material.index}
            src={material.images.small_url}
            className="ygo-card"
          />
        </div>
      ))}
    </div>
  );

  // TODO
}
