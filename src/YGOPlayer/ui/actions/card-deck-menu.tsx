import { useCallback } from "react";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";
import { YGOGameUtils } from "ygo-core";

export function CardDeckMenu({
  duel,
  card,
  mouseEvent,
}: {
  duel: YGODuel;
  zone: FieldZone;
  card: Card;
  clearAction: Function;
  mouseEvent: React.MouseEvent;
}) {
  const x = mouseEvent.clientX; // Horizontal mouse position in px
  const y = mouseEvent.clientY; // Vertical mouse position in px
  const field = duel.ygo.getField(card.originalOwner);
  const cardIndex = field.mainDeck.findIndex(
    (cardToSearch: any) => cardToSearch === card
  );
  const originZone: FieldZone = YGOGameUtils.createZone(
    "D",
    card.originalOwner,
    cardIndex + 1
  );

  const closeViewDeckMenu = useCallback(() => {
    duel.events.dispatch("close-ui-menu", { type: "view-main-deck" });
  }, []);

  const toHand = useCallback(() => {
    duel.gameActions.toHand({ card, originZone });
  }, [card, originZone]);

  const toGy = useCallback(() => {
    duel.gameActions.sendToGy({ card, originZone });
  }, [card, originZone]);

  const specialSummonATK = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.specialSummon({
      card,
      originZone,
      position: "faceup-attack",
    });
  }, [card, originZone]);

  const specialSummonDEF = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.specialSummon({
      card,
      originZone,
      position: "faceup-defense",
    });
  }, [card, originZone]);

  const toST = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.toST({ card, originZone });
  }, [card, originZone]);

  const setSpellTrap = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.setCard({ card, originZone, reveal: false }); // TODO FIX REVEAL
  }, [card, originZone]);

  const banish = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.banish({ card, originZone, position: "faceup" });
  }, [card, originZone]);

  const banishFD = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.banish({ card, originZone, position: "facedown" });
  }, [card, originZone]);

  const reveal = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.revealCard({ card, originZone });
  }, [card, originZone]);

  const isMonster = YGOGameUtils.isMonster(card);
  const isSpellTrap = YGOGameUtils.isSpellTrap(card);

  return (
    <>
      <CardMenu x={x} y={y}>
        {isMonster && (
          <>
            <button
              className="ygo-card-item"
              type="button"
              onClick={specialSummonATK}
            >
              SS ATK
            </button>
            <button
              className="ygo-card-item"
              type="button"
              onClick={specialSummonDEF}
            >
              SS DEF
            </button>
          </>
        )}
        <button className="ygo-card-item" type="button" onClick={toHand}>
          To Hand
        </button>
        <button className="ygo-card-item" type="button" onClick={toGy}>
          To GY
        </button>
        <button className="ygo-card-item" type="button" onClick={toST}>
          To ST (Face up)
        </button>
        {isSpellTrap && (
          <button
            className="ygo-card-item"
            type="button"
            onClick={setSpellTrap}
          >
            Set (FD)
          </button>
        )}
        <button className="ygo-card-item" type="button" onClick={banish}>
          Banish
        </button>
        <button className="ygo-card-item" type="button" onClick={banishFD}>
          Banish FD
        </button>
        <button className="ygo-card-item" type="button" onClick={reveal}>
          Reveal
        </button>
      </CardMenu>
    </>
  );
}
