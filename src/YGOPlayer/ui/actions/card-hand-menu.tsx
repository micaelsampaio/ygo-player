import { YGOGameUtils } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { Card, FieldZone } from "ygo-core";
import { useCallback, useLayoutEffect, useRef } from "react";
import { CardMenu, CardMenuSection } from "../components/CardMenu";
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
      position: "facedown",
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
    const { x, y, width, height } = getTransformFromCamera(duel, cardFromHand.gameObject);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top: number;
    if (YGOStatic.isPlayerPOV(card.owner)) {
      top = y - size.height;
    } else {
      top = y + height;
    }

    let left = x + width / 2 - size.width / 2;
    top = Math.max(0, Math.min(top, viewportHeight - size.height));
    left = Math.max(0, Math.min(left, viewportWidth - size.width));

    container.style.top = top + "px";
    container.style.left = left + "px";
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

  const noMonsterZone = freeMonsterZones === 0 ? "No free Monster Zone" : undefined;
  const noSpellTrapZone = freeSpellTrapZones === 0 ? "No free Spell/Trap Zone" : undefined;

  // Shared "More" group: the less common moves, with full labels.
  const moreActions = <>
    <CardMenuSection label="More" />
    {hasXyzMonstersInField && (
      <button className="ygo-card-item" type="button" onClick={attachMaterial}>
        Attach to Xyz
      </button>
    )}
    <button className="ygo-card-item" type="button" onClick={revealCard}>
      Reveal
    </button>
    {isMonster && <button className="ygo-card-item" type="button" onClick={negateCard}>Negate</button>}
    {isMonster && <ActionButton className="ygo-card-item" onClick={destroy} icon={<YGOIcon icon="destroy" />}>
      Destroy
    </ActionButton>}
    <ActionButton className="ygo-card-item" onClick={sendToGy} icon={<YGOIcon icon="gy" />}>
      To Graveyard
    </ActionButton>
    <ActionButton className="ygo-card-item" onClick={banish} icon={<YGOIcon icon="b" />}>
      Banish
    </ActionButton>
    <ActionButton className="ygo-card-item" onClick={banishFD} icon={<YGOIcon icon="b_fd" />}>
      Banish Face-down
    </ActionButton>
    <button className="ygo-card-item" type="button" onClick={toTopDeck}>
      Top of Deck
    </button>
    <button className="ygo-card-item" type="button" onClick={toBottomDeck}>
      Bottom of Deck
    </button>
    <button className="ygo-card-item" type="button" onClick={toST}>
      To Spell/Trap Zone
    </button>
  </>;

  if (!isMonster && isSpellOrTrap) {
    return <>
      <CardMenu cols indicator playerIndex={player} menuRef={menuRef}>
        {
          // FIELD SPELL
          isFieldSpell && <>
            <button className="ygo-card-item" type="button" onClick={activateFieldSpell}>
              Activate
            </button>
            <button className="ygo-card-item" type="button" onClick={setFieldSpell}>
              Set
            </button>
          </>}
        {
          // SPELL AND TRAPS
          !isFieldSpell && <>
            {(isTrap || isSpell) && <button
              className="ygo-card-item"
              type="button"
              disabled={freeSpellTrapZones === 0}
              title={noSpellTrapZone}
              onClick={activateSpellTrap}
            >
              {isTrap ? "Activate from Hand" : "Activate"}
            </button>}

            <button
              className="ygo-card-item"
              type="button"
              disabled={freeSpellTrapZones === 0}
              title={noSpellTrapZone}
              onClick={setSpellTrap}
            >
              Set
            </button>
          </>
        }
        {moreActions}
      </CardMenu >
    </>
  }

  return (
    <>
      <CardMenu cols indicator playerIndex={player} menuRef={menuRef}>
        <ActionButton
          icon={<div className="ygo-i--normal_summon"></div>}
          disabled={freeMonsterZones === 0}
          title={noMonsterZone}
          onClick={normalSummon}>
          Normal Summon
        </ActionButton>

        <ActionButton
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          title={noMonsterZone}
          icon={<div className="ygo-i--set"></div>}
          onClick={setSummon}
        >
          Set
        </ActionButton>

        <ActionButton
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          title={noMonsterZone}
          onClick={specialSummonATK}
          icon={<YGOIcon icon="special_summon" />}
        >
          Special Summon (ATK)
        </ActionButton>

        <ActionButton
          className="ygo-card-item"
          disabled={freeMonsterZones === 0}
          title={noMonsterZone}
          onClick={specialSummonDEF}
          icon={<YGOIcon icon="special_summon_def" />}
        >
          Special Summon (DEF)
        </ActionButton>

        {canTribute && <>
          <ActionButton
            icon={<div className="ygo-i--b"></div>}
            disabled={freeMonsterZones === 0}
            title={noMonsterZone}
            onClick={tributeSummonATK}>
            Tribute Summon
          </ActionButton>

          <ActionButton
            disabled={freeMonsterZones === 0}
            title={noMonsterZone}
            onClick={tributeSummonDEF}>
            Tribute Set
          </ActionButton>
        </>}

        <button className="ygo-card-item" type="button" onClick={activateCard}>
          Activate from Hand
        </button>

        {moreActions}
      </CardMenu >
    </>
  );
}
