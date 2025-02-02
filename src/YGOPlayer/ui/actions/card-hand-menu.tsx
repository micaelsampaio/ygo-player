import { YGOGameUtils } from "../../../YGOCore";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { Card, FieldZone } from "../../../YGOCore/types/types";
import { useCallback, useLayoutEffect, useRef } from "react";
import { CardMenu } from "../components/CardMenu";

export function CardHandMenu({ duel, card, index }: { duel: YGODuel, card: Card, index: number, clearAction: () => void }) {
    const menuRef = useRef<HTMLDivElement>(null);
    const originZone: FieldZone = `H-${index + 1}`;

    const normalSummon = useCallback(() => {
        duel.gameActions.normalSummon({ card, originZone });
    }, [card, index]);

    const setSummon = useCallback(() => {
        duel.gameActions.setSummon({ card, originZone });
    }, [card, index]);

    const specialSummonATK = useCallback(() => {
        duel.gameActions.specialSummon({ card, originZone, position: "faceup-attack" });
    }, [card, index]);

    const specialSummonDEF = useCallback(() => {
        duel.gameActions.specialSummon({ card, originZone, position: "faceup-defense" });
    }, [card, index]);

    const setSpellTrap = useCallback(() => {
        duel.gameActions.setSpellTrap({ card, originZone });
    }, [card, index]);

    const activateSpellTrap = useCallback(() => {
        duel.gameActions.activateCard({ card, originZone, selectZone: true });
    }, [card, index]);

    const revealCard = useCallback(() => {
        duel.gameActions.revealCard({ card, originZone });
    }, [card, index]);

    const sendToGy = useCallback(() => {
        duel.gameActions.sendToGy({ card, originZone });
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

    useLayoutEffect(() => {
        const container = menuRef.current!;
        const cardFromHand = duel.fields[0].hand.getCardFromReference(card)!;
        const size = container.getBoundingClientRect();
        const { x, y, width, height } = getTransformFromCamera(duel, cardFromHand.gameObject);
        container.style.width = (width * 1.5) + "px";
        container.style.top = (y - size.height) + "px";
        container.style.left = x + "px";
    }, [card]);

    const player = duel.getActivePlayer();
    const field = duel.ygo.state.fields[player];
    const freeMonsterZones = field.monsterZone.filter(zone => !zone).length;
    const freeSpellTrapZones = field.spellTrapZone.filter(zone => !zone).length;
    const isFieldSpell = YGOGameUtils.isFieldSpell(card);
    const isSpell = !isFieldSpell && YGOGameUtils.isSpell(card);
    const isTrap = YGOGameUtils.isTrap(card);
    const isMonster = card.type.includes("Monster");
    const hasXyzMonstersInField = YGOGameUtils.hasXyzMonstersInField(field);

    return <>
        <CardMenu menuRef={menuRef} >
            {isMonster && <>
                <button className="ygo-card-item" disabled={freeMonsterZones === 0} type="button" onClick={normalSummon}>Normal Summon</button>
                <button className="ygo-card-item" disabled={freeMonsterZones === 0} type="button" onClick={setSummon}>Set</button>
                <button className="ygo-card-item" disabled={freeMonsterZones === 0} type="button" onClick={specialSummonATK}>Special Summon ATK</button>
                <button className="ygo-card-item" disabled={freeMonsterZones === 0} type="button" onClick={specialSummonDEF}>Special Summon DEF</button>
            </>}
            {hasXyzMonstersInField && <div>
                <button className="ygo-card-item" type="button" onClick={attachMaterial}>Attach Material</button>
            </div>}
            {(isSpell || isTrap) && <>
                <button className="ygo-card-item" type="button" disabled={freeSpellTrapZones === 0} onClick={activateSpellTrap}>Activate</button>

                <button className="ygo-card-item" type="button" disabled={freeSpellTrapZones === 0} onClick={setSpellTrap}>Set</button>
            </>}
            {(isFieldSpell) && <>
                <div>
                    <button className="ygo-card-item" type="button" onClick={activateFieldSpell}>Activate Field</button>
                </div>
                <div>
                    <button className="ygo-card-item" type="button" disabled={freeSpellTrapZones === 0} onClick={setFieldSpell}>Set Field</button>
                </div>
            </>}
            <button className="ygo-card-item" onClick={toST}>To S/T</button>
            <button className="ygo-card-item" type="button" onClick={sendToGy}>To Graveyard</button>
            <button className="ygo-card-item" type="button" onClick={banish}>Banish</button>
            <button className="ygo-card-item" type="button" onClick={banishFD}>Banish FD</button>
            <button className="ygo-card-item" onClick={revealCard}>Reveal</button>
        </CardMenu>
    </>

}