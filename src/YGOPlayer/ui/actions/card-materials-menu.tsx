import { useCallback, useLayoutEffect, useRef } from "react";
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

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const cardRect = htmlCardElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const top = Math.min(
      window.innerHeight - containerRect.height,
      cardRect.top
    );
    container.style.left = cardRect.left - containerRect.width + "px";
    container.style.top = top + "px";
  }, [card, htmlCardElement]);

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
