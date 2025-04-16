import { useCallback, useLayoutEffect, useRef } from "react";
import { YGOGameUtils } from "ygo-core";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";

export function CardGraveyardMenu({
  duel,
  card,
  htmlCardElement,
}: {
  duel: YGODuel;
  zone: FieldZone;
  card: Card;
  htmlCardElement: HTMLDivElement;
  clearAction: Function;
  mouseEvent: React.MouseEvent;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const player = card.originalOwner;
  const field = duel.ygo.state.fields[player];
  const cardIndex = duel.ygo.state.fields[player].graveyard.findIndex(
    (c: any) => c === card
  );
  const originZone: FieldZone = YGOGameUtils.createZone(
    "GY",
    player,
    cardIndex + 1
  );

  const specialSummonATK = useCallback(() => {
    duel.gameActions.specialSummon({
      card,
      originZone,
      position: "faceup-attack",
    });
  }, [card, originZone]);

  const specialSummonDEF = useCallback(() => {
    duel.gameActions.specialSummon({
      card,
      originZone,
      position: "faceup-defense",
    });
  }, [card, originZone]);

  const attachMaterial = useCallback(() => {
    duel.gameActions.attachMaterial({ card, originZone });
  }, [card, originZone]);

  const toHand = useCallback(() => {
    duel.gameActions.toHand({ card, originZone });
  }, [card, originZone]);

  const activateCard = useCallback(() => {
    duel.gameActions.activateCard({ card, originZone, selectZone: false });
  }, [card, originZone]);

  const toST = useCallback(() => {
    duel.gameActions.toST({ card, originZone });
  }, [card, originZone]);

  const banish = useCallback(() => {
    duel.gameActions.banish({ card, originZone, position: "faceup" });
  }, [card, originZone]);

  const banishFD = useCallback(() => {
    duel.gameActions.banish({ card, originZone, position: "facedown" });
  }, [card, originZone]);

  const toTopDeck = useCallback(() => {
    duel.gameActions.toDeck({ card, originZone, position: "top" });
  }, [card, originZone]);

  const toBottomDeck = useCallback(() => {
    duel.gameActions.toDeck({ card, originZone, position: "bottom" });
  }, [card, originZone]);

  const toExtraDeck = useCallback(() => {
    duel.gameActions.toExtraDeck({ card, originZone });
  }, [card, originZone]);

  const targetCard = useCallback(() => {
    duel.gameActions.targetCard({ card, originZone });
  }, [card, originZone]);

  const activateFieldSpell = useCallback(() => {
    duel.gameActions.fieldSpell({ card, originZone, position: "faceup" });
  }, [card, originZone]);

  const setFieldSpell = useCallback(() => {
    duel.gameActions.fieldSpell({ card, originZone, position: "facedown" });
  }, [card, originZone]);

  const negateCard = useCallback(() => {
    duel.gameActions.negateCard({ card, originZone });
  }, [card, originZone]);

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

  const hasXyzMonstersInField = YGOGameUtils.hasXyzMonstersInField(field);
  const isMonster = YGOGameUtils.isMonster(card);
  const isFieldSpell = YGOGameUtils.isFieldSpell(card);

  return (
    <>
      <CardMenu menuRef={menuRef}>
        {isMonster && (
          <>
            <button
              type="button"
              className="ygo-card-item"
              onClick={specialSummonATK}
            >
              SS ATK
            </button>

            <button
              type="button"
              className="ygo-card-item"
              onClick={specialSummonDEF}
            >
              SS DEF
            </button>
          </>
        )}

        {isFieldSpell && <>
          <button
            className="ygo-card-item"
            type="button"
            onClick={activateFieldSpell}
          >
            Activate Field Spell
          </button>
          <button
            className="ygo-card-item"
            type="button"
            onClick={setFieldSpell}
          >
            Set Field Spell
          </button>
        </>}

        <button type="button" className="ygo-card-item" onClick={activateCard}>
          Activate
        </button>

        <button
          type="button"
          className="ygo-card-item"
          onClick={targetCard}
        >
          Target
        </button>

        <button type="button" className="ygo-card-item" onClick={toST}>
          TO ST
        </button>

        <button type="button" className="ygo-card-item" onClick={toHand}>
          To Hand
        </button>

        <button type="button" className="ygo-card-item" onClick={banish}>
          Banish
        </button>

        <button type="button" className="ygo-card-item" onClick={banishFD}>
          Banish FD
        </button>

        {card.isMainDeckCard && (
          <>
            <button type="button" className="ygo-card-item" onClick={toTopDeck}>
              To Top Deck
            </button>
            <button
              type="button"
              className="ygo-card-item"
              onClick={toBottomDeck}
            >
              To Bottom Deck
            </button>
          </>
        )}

        {!card.isMainDeckCard && (
          <>
            <button
              type="button"
              className="ygo-card-item"
              onClick={toExtraDeck}
            >
              To Extra Deck
            </button>
          </>
        )}

        {hasXyzMonstersInField && (
          <>
            <button
              type="button"
              className="ygo-card-item"
              onClick={attachMaterial}
            >
              Attach Material
            </button>
          </>
        )}

        <button className="ygo-card-item" onClick={negateCard}>Negate</button>
      </CardMenu>
    </>
  );
}
