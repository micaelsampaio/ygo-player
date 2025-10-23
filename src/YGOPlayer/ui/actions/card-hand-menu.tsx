import { YGOGameUtils } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { Card, FieldZone } from "ygo-core";
import { useCallback, useLayoutEffect, useRef } from "react";
import { CardMenu } from "../components/CardMenu";
import { YGOStatic } from "../../core/YGOStatic";
import { ActionButton, YGOIcon } from "../components/ActionButton";

export function CardHandMenu({
  duel,
  card,
  index
}: {
  duel: YGODuel;
  card: Card;
  index: number;
  clearAction: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const originZone: FieldZone = YGOGameUtils.createZone(
    "H",
    card.owner,
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

  const destroy = useCallback(() => {
    duel.gameActions.destroyCard({ card, originZone });
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
    const cardFromHand = duel.fields[card.owner].hand.getCardFromReference(card)!;
    const size = container.getBoundingClientRect();
    const { x, y, width, height } = getTransformFromCamera(
      duel,
      cardFromHand.gameObject
    );
    if (YGOStatic.isPlayerPOV(card.owner)) {
      container.style.top = y - size.height + "px";
    } else {
      container.style.top = y + height + "px";
    }
    container.style.left = x + width / 2 - size.width / 2 + "px";
  }, [card]);

  const player = card.owner;
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
      <CardMenu cols indicator playerIndex={player} menuRef={menuRef}>
        {hasXyzMonstersInField && (
          <>
            <button
              className="ygo-card-item"
              type="button"
              onClick={attachMaterial}
            >
              Attach Material to XYZ
            </button>
            <div></div>
          </>
        )}
        <button className="ygo-card-item" onClick={revealCard}>
          Reveal
        </button>

        <div></div>

        <button className="ygo-card-item" type="button" onClick={banish}>
          Banish
        </button>
        <button className="ygo-card-item" type="button" onClick={banishFD}>
          Banish FD
        </button>
        <button className="ygo-card-item" onClick={toTopDeck}>
          To T/Deck
        </button>
        <button className="ygo-card-item" onClick={toBottomDeck}>
          To B/Deck
        </button>
        <button className="ygo-card-item" type="button" onClick={sendToGy}>
          To Grave
        </button>
        <button className="ygo-card-item" onClick={toST}>
          To S/T
        </button>
        {
          // FIELD SPELL
          isFieldSpell && <>
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

            <button
              className="ygo-card-item"
              type="button"
              disabled={freeSpellTrapZones === 0}
              onClick={setSpellTrap}
            >
              Set
            </button>
          </>
        }
      </CardMenu >
    </>
  }

  return (
    <>
      <CardMenu cols indicator playerIndex={player} menuRef={menuRef}>

        {hasXyzMonstersInField && (
          <>
            <button
              className="ygo-card-item"
              type="button"
              onClick={attachMaterial}
            >
              Attach Material to XYZ
            </button>
            <div></div>
          </>
        )}

        <button className="ygo-card-item" onClick={negateCard}>Negate</button>

        <ActionButton className="ygo-card-item" onClick={destroy} icon={<YGOIcon icon="destroy" />}>
          Destroy
        </ActionButton>

        <button className="ygo-card-item" onClick={toTopDeck}>
          To T/Deck
        </button>

        <button className="ygo-card-item" onClick={toBottomDeck}>
          To B/Deck
        </button>

        <ActionButton className="ygo-card-item" onClick={banish} icon={<YGOIcon icon="b" />}>
          Banish
        </ActionButton>

        <ActionButton className="ygo-card-item" onClick={banishFD} icon={<YGOIcon icon="b_fd" />}>
          Banish FD
        </ActionButton>

        <ActionButton className="ygo-card-item" onClick={sendToGy} icon={<YGOIcon icon="gy" />}>
          To Grave
        </ActionButton>

        <ActionButton onClick={toST} icon={<div></div>}>
          <div className="ygo-card-item-text">To S/T</div>
        </ActionButton>

        <button className="ygo-card-item" onClick={activateCard}>
          Activate on Hand
        </button>

        <button className="ygo-card-item" onClick={revealCard}>
          Reveal
        </button>

        <ActionButton
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          onClick={specialSummonATK}
          icon={<YGOIcon icon="special_summon" />}
        >
          Special Summon ATK
        </ActionButton>


        <ActionButton
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          onClick={specialSummonDEF}
          icon={<YGOIcon icon="special_summon_def" />}
        >
          Special Summon DEF
        </ActionButton>

        {canTribute && <>
          <ActionButton
            icon={<div className="ygo-i--b"></div>}
            disabled={freeMonsterZones === 0}
            onClick={tributeSummonATK}>
            Tribute Summon ATK
          </ActionButton>

          <ActionButton
            icon={<div></div>}
            disabled={freeMonsterZones === 0}
            onClick={tributeSummonDEF}>
            Tribute Summon ATK
          </ActionButton>

        </>}

        <ActionButton
          icon={<div className="ygo-i--normal_summon"></div>}
          disabled={freeMonsterZones === 0}
          onClick={normalSummon}>
          Normal Summon
        </ActionButton>

        <ActionButton
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          icon={<div className="ygo-i--set"></div>}
          onClick={setSummon}
        >
          Set
        </ActionButton>
      </CardMenu >
    </>
  );
}
