import { useCallback, useRef } from "react";
import { useAnchoredMenu } from "../components/use-anchored-menu";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { UiGameConfig } from "../YGOUiController";
import { CardMenu } from "../components/CardMenu";

export function CardMaterialsMenu({
  duel,
  card,
  originZone,
  material,
  htmlCardElement,
  mouseEvent,
}: {
  duel: YGODuel;
  zone: FieldZone;
  card: Card;
  material: Card;
  htmlCardElement: HTMLDivElement;
  clearAction: Function;
  originZone: FieldZone;
  mouseEvent: React.MouseEvent;
  config: UiGameConfig;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const materialIndex = card.materials.findIndex((mat) => mat === material);

  useAnchoredMenu(duel, menuRef, () => ({ kind: "left-of", element: htmlCardElement, event: mouseEvent }), [card, htmlCardElement]);

  const detachMaterial = useCallback(() => {
    duel.gameActions.detachMaterial({ card, originZone, materialIndex });
  }, [card, material]);


  return (
    <>
      <CardMenu menuRef={menuRef}>
        <button
          className="ygo-card-item"
          type="button"
          onClick={detachMaterial}
        >
          Detach
        </button>
      </CardMenu>
    </>
  );
}
