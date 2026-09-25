import { useCallback, useLayoutEffect, useRef } from "react";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";
import { YGOGameUtils } from "ygo-core";
import { anchorCardMenu, hasPointerPosition } from "../components/pile-menu";

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
    duel.gameActions.toHand({ card, originZone, reveal: true });
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

  const activateFieldSpell = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.fieldSpell({ card, originZone, position: "faceup" });
  }, [card, originZone]);

  const setFieldSpell = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.fieldSpell({ card, originZone, position: "facedown" });
  }, [card, originZone]);

  const destroy = useCallback(() => {
    closeViewDeckMenu();
    duel.gameActions.destroyCard({ card, originZone });
  }, [card, originZone]);

  const isMonster = YGOGameUtils.isMonster(card);
  const isSpellTrap = YGOGameUtils.isSpellTrap(card);
  const isFieldSpell = YGOGameUtils.isFieldSpell(card);

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const { width, height } = container.getBoundingClientRect();
    const anchor = htmlCardElement ?? (mouseEvent?.target instanceof Element ? mouseEvent.target : null);
    const { left, top } = anchorCardMenu(mouseEvent as any, anchor, { width, height }, { width: window.innerWidth, height: window.innerHeight });

    container.style.left = left + "px";
    container.style.top = top + "px";

    // Opened from the keyboard: move focus into the menu so its actions are one Tab away.
    if (!hasPointerPosition(mouseEvent as any)) {
      container.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }, [card, mouseEvent, htmlCardElement]);

  return (
    <CardMenu menuRef={menuRef}>
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
      {isFieldSpell && <>
        <button className="ygo-card-item" type="button" onClick={activateFieldSpell}>
          Place Field Spell
        </button>
        <button className="ygo-card-item" type="button" onClick={setFieldSpell}>
          Place Field Spell FD
        </button>
      </>}
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
      <button className="ygo-card-item" type="button" onClick={destroy}>
        Destroy
      </button>
    </CardMenu>
  );
}
