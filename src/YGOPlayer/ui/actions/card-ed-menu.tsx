import { useRef } from "react";
import { useAnchoredMenu } from "../components/use-anchored-menu";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { UiGameConfig } from "../YGOUiController";
import { CardMenu } from "../components/CardMenu";
import { pileMenuActions } from "./pile-card-actions";

export function CardExtraDeckMenu({
  duel,
  config,
  card,
  htmlCardElement,
  clearAction,
  mouseEvent,
}: {
  duel: YGODuel;
  zone: FieldZone;
  card: Card;
  htmlCardElement: HTMLDivElement;
  clearAction: Function;
  mouseEvent: React.MouseEvent;
  config: UiGameConfig;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const actions = pileMenuActions(duel, card, "ED");

  useAnchoredMenu(duel, menuRef, () => ({ kind: "left-of", element: htmlCardElement, event: mouseEvent }), [card, htmlCardElement]);

  return (
    <>
      <CardMenu menuRef={menuRef}>
        {config.actions && (
          <>
            {actions.map((action) => (
              <button key={action.key} type="button" className="ygo-card-item" onClick={action.run}>
                {action.label}
              </button>
            ))}
          </>
        )}
      </CardMenu>
    </>
  );
}
