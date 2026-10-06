import { useRef } from "react";
import { useAnchoredMenu } from "../components/use-anchored-menu";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";
import { pileMenuActions } from "./pile-card-actions";

export function CardGraveyardMenu({
  duel,
  card,
  htmlCardElement,
  mouseEvent,
}: {
  duel: YGODuel;
  zone: FieldZone;
  card: Card;
  htmlCardElement: HTMLDivElement;
  clearAction: Function;
  mouseEvent: React.MouseEvent;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const actions = pileMenuActions(duel, card, "GY");

  useAnchoredMenu(duel, menuRef, () => ({ kind: "left-of", element: htmlCardElement, event: mouseEvent }), [card, htmlCardElement]);

  return (
    <>
      <CardMenu menuRef={menuRef} assist={{ duel, card, zone: "GY" }}>
        {actions.map((action) => (
          <button key={action.key} type="button" className="ygo-card-item" onClick={action.run}>
            {action.label}
          </button>
        ))}
      </CardMenu>
    </>
  );
}
