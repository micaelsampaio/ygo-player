import { useRef } from "react";
import { useAnchoredMenu } from "../components/use-anchored-menu";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";
import { pileMenuActions } from "./pile-card-actions";

export function CardDeckMenu({
  duel,
  card,
  mouseEvent,
  htmlCardElement,
}: {
  duel: YGODuel;
  zone: FieldZone;
  card: Card;
  clearAction: Function;
  /** The click (or, from the keyboard, the Enter/Space keydown) that opened the menu. */
  mouseEvent: React.MouseEvent | React.KeyboardEvent;
  /** The card image that was activated: the anchor when there is no pointer position. */
  htmlCardElement?: Element;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const actions = pileMenuActions(duel, card, "D");

  useAnchoredMenu(duel, menuRef, () => ({
    kind: "pointer",
    element: htmlCardElement ?? (mouseEvent?.target instanceof Element ? mouseEvent.target : null),
    event: mouseEvent as any,
  }), [card, mouseEvent, htmlCardElement]);

  return (
    <CardMenu menuRef={menuRef}>
      {actions.map((action) => (
        <button key={action.key} type="button" className="ygo-card-item" onClick={action.run}>
          {action.label}
        </button>
      ))}
    </CardMenu>
  );
}
