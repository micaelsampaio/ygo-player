import { YGOGameUtils } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { Card, FieldZone } from "ygo-core";
import { useCallback, useLayoutEffect, useRef } from "react";
import { CardMenu } from "../components/CardMenu";

export function CardHandMenu({
  duel,
  card,
  index,
}: {
  duel: YGODuel;
  card: Card;
  index: number;
  clearAction: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const originZone: FieldZone = YGOGameUtils.createZone(
    "H",
    card.originalOwner,
    index + 1
  );

  const normalSummon = useCallback(() => {
    duel.gameActions.normalSummon({ card, originZone });
  }, [card, index]);

  const setSummon = useCallback(() => {
    duel.gameActions.setSummon({ card, originZone });
  }, [card, index]);

  const tributeSummonATK = useCallback(() => {
    duel.gameActions.tributeSummon({ card, originZone });
  }, [card, index]);

  const tributeSummonDEF = useCallback(() => {
    duel.gameActions.tributeSummon({
      card,
      originZone,
      position: "faceup-defense",
    });
  }, [card, index]);

  const specialSummonATK = useCallback(() => {
    duel.gameActions.specialSummon({
      card,
      originZone,
      position: "faceup-attack",
    });
  }, [card, index]);

  const specialSummonDEF = useCallback(() => {
    duel.gameActions.specialSummon({
      card,
      originZone,
      position: "faceup-defense",
    });
  }, [card, index]);

  const setSpellTrap = useCallback(() => {
    duel.gameActions.setCard({ card, originZone });
  }, [card, index]);

  const activateSpellTrap = useCallback(() => {
    duel.gameActions.activateCard({ card, originZone, selectZone: true });
  }, [card, index]);

  const activateCard = useCallback(() => {
    duel.gameActions.activateCard({ card, originZone, selectZone: false });
  }, [card, index]);

  const revealCard = useCallback(() => {
    duel.gameActions.revealCard({ card, originZone });
  }, [card, index]);

  const sendToGy = useCallback(() => {
    duel.gameActions.sendToGy({ card, originZone });
  }, [card, index]);

  const toTopDeck = useCallback(() => {
    duel.gameActions.toDeck({ card, originZone, position: "top" });
  }, [card, index]);

  const toBottomDeck = useCallback(() => {
    duel.gameActions.toDeck({ card, originZone, position: "bottom" });
  }, [card, index]);

  const banish = useCallback(() => {
    duel.gameActions.banish({ card, originZone, position: "faceup" });
  }, [card, index]);

  const banishFD = useCallback(() => {
    duel.gameActions.banish({ card, originZone, position: "facedown" });
  }, [card, index]);

  const toST = useCallback(() => {
    duel.gameActions.toST({ card, originZone });
  }, [card, index]);

  const activateFieldSpell = useCallback(() => {
    duel.gameActions.fieldSpell({ card, originZone, position: "faceup" });
  }, [card, index]);

  const setFieldSpell = useCallback(() => {
    duel.gameActions.fieldSpell({ card, originZone, position: "facedown" });
  }, [card, index]);

  const attachMaterial = useCallback(() => {
    duel.gameActions.attachMaterial({ card, originZone });
  }, [card, index]);

  const negateCard = useCallback(() => {
    duel.gameActions.negateCard({ card, originZone });
  }, [card, originZone]);

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const cardFromHand =
      duel.fields[card.originalOwner].hand.getCardFromReference(card)!;
    const size = container.getBoundingClientRect();
    const { x, y, width, height } = getTransformFromCamera(
      duel,
      cardFromHand.gameObject
    );
    if (card.originalOwner === 0) {
      container.style.top = y - size.height + "px";
    } else {
      container.style.top = y + height + "px";
    }
    container.style.left = x + width / 2 - size.width / 2 + "px";
  }, [card]);

  const player = duel.getActivePlayer();
  const field = duel.ygo.state.fields[player];
  const freeMonsterZones = field.monsterZone.filter((zone: any) => !zone).length;
  const freeSpellTrapZones = field.spellTrapZone.filter((zone: any) => !zone).length;
  const isFieldSpell = YGOGameUtils.isFieldSpell(card);
  const isSpell = !isFieldSpell && YGOGameUtils.isSpell(card);
  const isTrap = YGOGameUtils.isTrap(card);
  const isSpellOrTrap = YGOGameUtils.isSpellTrap(card);
  const isMonster = card.type.includes("Monster");
  const canTribute = isMonster && card.level > 4;
  const hasXyzMonstersInField = YGOGameUtils.XyzMonstersInFieldsCounter(duel.ygo) > 0;

  if (!isMonster && isSpellOrTrap) {
    return <>
      <CardMenu cols indicator menuRef={menuRef}>
        <button className="ygo-card-item" onClick={revealCard}>
          Reveal
        </button>

        {hasXyzMonstersInField && (
          <div>
            <button
              className="ygo-card-item"
              type="button"
              onClick={attachMaterial}
            >
              Attach Material to XYZ
            </button>
          </div>
        )}

        <button className="ygo-card-item" onClick={toST}>
          To S/T
        </button>
        <button className="ygo-card-item" type="button" onClick={banishFD}>
          Banish FD
        </button>
        <button className="ygo-card-item" type="button" onClick={banish}>
          Banish
        </button>
        <button className="ygo-card-item" onClick={toBottomDeck}>
          To Bottom Deck
        </button>
        <button className="ygo-card-item" onClick={toTopDeck}>
          To Top Deck
        </button>
        <button className="ygo-card-item" type="button" onClick={sendToGy}>
          To Grave
        </button>
        {
          // FIELD SPELL
          isFieldSpell && <>
            <button
              className="ygo-card-item"
              type="button"
              onClick={setFieldSpell}
            >
              Set Field Spell
            </button>

            <button
              className="ygo-card-item"
              type="button"
              onClick={activateFieldSpell}
            >
              Activate Field Spell
            </button>
          </>}
        {
          // SPELL AND TRAPS
          !isFieldSpell && <>
            {isTrap && <>
              <button
                className="ygo-card-item"
                type="button"
                disabled={freeSpellTrapZones === 0}
                onClick={activateSpellTrap}
              >
                Activate From Hand
              </button>
            </>}
            <button
              className="ygo-card-item"
              type="button"
              disabled={freeSpellTrapZones === 0}
              onClick={setSpellTrap}
            >
              Set
            </button>

            {isSpell && <>
              <button
                className="ygo-card-item"
                type="button"
                disabled={freeSpellTrapZones === 0}
                onClick={activateSpellTrap}
              >
                Activate
              </button>
            </>}
          </>
        }
      </CardMenu >
    </>
  }

  return (
    <>
      <CardMenu cols indicator menuRef={menuRef}>
        <button className="ygo-card-item" onClick={revealCard}>
          Reveal
        </button>

        <button className="ygo-card-item" onClick={negateCard}>Negate</button>

        {hasXyzMonstersInField && (
          <div>
            <button
              className="ygo-card-item"
              type="button"
              onClick={attachMaterial}
            >
              Attach Material to XYZ
            </button>
          </div>
        )}

        <button className="ygo-card-item" onClick={toST}>
          To S/T
        </button>


        <button className="ygo-card-item" onClick={toBottomDeck}>
          To Bottom Deck
        </button>

        <button className="ygo-card-item" onClick={toTopDeck}>
          To Top Deck
        </button>


        <button className="ygo-card-item" type="button" onClick={banishFD}>
          Banish FD
        </button>

        <button className="ygo-card-item" type="button" onClick={banish}>
          Banish
        </button>

        <button className="ygo-card-item" type="button" onClick={sendToGy}>
          To Grave
        </button>

        <button
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          type="button"
          onClick={specialSummonDEF}
        >
          Special Summon DEF
        </button>

        <button
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          type="button"
          onClick={specialSummonATK}
        >
          Special Summon ATK
        </button>

        {canTribute && <>
          <button
            className="ygo-card-item"
            disabled={freeMonsterZones === 0}
            type="button"
            onClick={tributeSummonDEF}
          >
            Tribute Summon DEF
          </button>

          <button
            className="ygo-card-item"
            disabled={freeMonsterZones === 0}
            type="button"
            onClick={tributeSummonATK}
          >
            Tribute Summon ATK
          </button>
        </>}

        {!isSpellOrTrap && (
          <button className="ygo-card-item" onClick={activateCard}>
            Activate on Hand
          </button>
        )}

        <button
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          type="button"
          onClick={setSummon}
        >
          Set
        </button>

        <button
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          type="button"
          onClick={normalSummon}
        >
          Normal Summon
        </button>


      </CardMenu >
    </>
  );
}
