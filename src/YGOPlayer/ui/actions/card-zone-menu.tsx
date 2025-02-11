import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { YGOCommands, YGOGameUtils } from "../../../YGOCore";
import { Card, FieldZone } from "../../../YGOCore/types/types";
import { ActionCardSelection } from "../../actions/ActionSelectCard";
import { YGODuel } from "../../core/YGODuel";
import { getCardZones, getTransformFromCamera, getXyzMonstersZones } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import { GameCard } from "../../game/GameCard";

export function CardZoneMenu({ duel, card, zone, gameCard, clearAction, mouseEvent }: { duel: YGODuel, gameCard: GameCard, zone: FieldZone, card: Card, clearAction: Function, mouseEvent: React.MouseEvent }) {
    const menuRef = useRef<HTMLDivElement>()
    const ygo = duel.ygo;
    const player = duel.getActivePlayer();

    const sendToGY = useCallback(() => {
        duel.gameActions.sendToGy({ card, originZone: zone });
    }, [card, zone]);

    const banish = useCallback(() => {
        duel.gameActions.banish({ card, originZone: zone, position: "faceup" });
    }, [card, zone]);

    const banishFD = useCallback(() => {
        duel.gameActions.banish({ card, originZone: zone, position: "faceup" });
    }, [card, zone]);

    const toHand = useCallback(() => {
        duel.gameActions.toHand({ card, originZone: zone });
    }, [card, zone]);

    const toExtraDeck = useCallback(() => {
        duel.gameActions.toExtraDeck({ card, originZone: zone });
    }, [card, zone]);

    const toTopDeck = useCallback(() => {
        duel.gameActions.toDeck({ card, originZone: zone, position: "top" });
    }, [card, zone]);

    const toBottomDeck = useCallback(() => {
        duel.gameActions.toDeck({ card, originZone: zone, position: "top" });
    }, [card, zone]);

    const setCard = useCallback(() => {
        duel.gameActions.setCard({ card, originZone: zone, selectZone: false });
    }, [card, zone]);

    const flip = useCallback(() => {
        duel.gameActions.flip({ card, originZone: zone });
    }, [card, zone]);

    const changeBattleToATK = useCallback(() => {
        duel.gameActions.changeBattlePosition({ card, originZone: zone, position: "faceup-attack" });
    }, [card, zone]);

    const changeBattleToDEF = useCallback(() => {
        duel.gameActions.changeBattlePosition({ card, originZone: zone, position: "faceup-defense" });
    }, [card, zone]);

    const viewMaterials = () => {
        duel.events.publish("toggle-ui-menu", { group: "game-overlay", autoClose: true, type: "xyz-monster-materials", data: { card, zone } });
    }

    const attachMaterial = useCallback(() => {
        duel.gameActions.attachMaterial({ card, originZone: zone });
    }, [card, zone]);

    const activateCard = useCallback(() => {
        duel.gameActions.activateCard({ card, originZone: zone, selectZone: false });
    }, [card, zone]);

    const moveCard = useCallback(() => {
        duel.gameActions.moveCard({ card, originZone: zone });
    }, [card, zone]);

    useLayoutEffect(() => {
        const container = menuRef.current!;
        const size = container.getBoundingClientRect();
        const { x, y, width, height } = getTransformFromCamera(duel, gameCard.gameObject);
        container.style.top = Math.max(0, (y - size.height)) + "px";
        container.style.left = (x - (size.width / 2) + (width / 2)) + "px";
    }, [card]);

    const field = duel.ygo.state.fields[player];
    const isXYZ = YGOGameUtils.isXYZMonster(card);
    const isFaceUp = YGOGameUtils.isFaceUp(card);
    const isLink = YGOGameUtils.isLinkMonster(card);
    const hasXyzMonstersInField = YGOGameUtils.hasXyzMonstersInField(field);
    const canAttachMaterial = isXYZ ? getXyzMonstersZones(duel, [0]).length > 1 : true;
    const isMonsterZone = zone.includes("M");
    const isMonster = YGOGameUtils.isMonster(card);
    const isMainDeckCard = card.isMainDeckCard;
    const isAttack = YGOGameUtils.isAttack(card);
    const isSpellTrap = YGOGameUtils.isSpellTrap(card);

    return <CardMenu menuRef={menuRef}>
        {isXYZ && <>
            <button type="button" className="ygo-card-item" onClick={viewMaterials}>View Materials</button>
        </>}

        <button type="button" className="ygo-card-item" onClick={moveCard}>Move</button>

        <button type="button" className="ygo-card-item" onClick={() => alert("TODO")}>Target</button>
        <button type="button" className="ygo-card-item" onClick={toBottomDeck}>To Bottom Deck</button>
        <button type="button" className="ygo-card-item" onClick={toTopDeck}>To Top. Deck</button>

        <button type="button" className="ygo-card-item" onClick={banish}>Banish</button>

        <button type="button" className="ygo-card-item" onClick={banishFD}>Banish FD</button>

        {isMainDeckCard && <button type="button" className="ygo-card-item" onClick={toHand}>To Hand</button>}

        {!isMainDeckCard && <button type="button" className="ygo-card-item" onClick={toExtraDeck}>To Extra Deck</button>}

        {isMonsterZone && isMonster && !isLink && <>
            {isFaceUp && <>
                <button type="button" className="ygo-card-item" onClick={setCard}>Set</button>
                {!isAttack && <button type="button" className="ygo-card-item" onClick={changeBattleToATK}>TO ATK</button>}
                {isAttack && <button type="button" className="ygo-card-item" onClick={changeBattleToDEF}>TO DEF</button>}
            </>
            }
            {!isFaceUp && <>
                <button type="button" className="ygo-card-item" onClick={flip}>Flip</button>
            </>
            }
        </>}

        {isSpellTrap && isFaceUp && <>
            <button type="button" className="ygo-card-item" onClick={setCard}>Set</button>
        </>}

        {(isMonster && isFaceUp) || (isSpellTrap) && <button type="button" className="ygo-card-item" onClick={activateCard}>Activate</button>}

        <button type="button" className="ygo-card-item" onClick={sendToGY}>Send To GY</button>

        {
            hasXyzMonstersInField && <>
                {canAttachMaterial && <button type="button" className="ygo-card-item" onClick={attachMaterial}>Attach Material</button>}
            </>
        }
        {
            isFaceUp && <button type="button" className="ygo-card-item" onClick={activateCard}>Activate</button>
        }
    </CardMenu>
}