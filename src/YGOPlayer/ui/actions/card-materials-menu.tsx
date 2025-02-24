import { useCallback, useLayoutEffect, useRef } from "react";
import { YGOGameUtils } from "../../../YGOCore";
import { Card, FieldZone } from "../../../YGOCore/types/types";
import { YGODuel } from "../../core/YGODuel";
import { UiGameConfig } from "../YGOUiController";
import { CardMenu } from "../components/CardMenu";

export function CardMaterialsMenu({ duel, config, card, originZone, material, htmlCardElement, clearAction, mouseEvent }: { duel: YGODuel, zone: FieldZone, card: Card, material: Card, htmlCardElement: HTMLDivElement, clearAction: Function, originZone: FieldZone, mouseEvent: React.MouseEvent, config: UiGameConfig }) {
    const menuRef = useRef<HTMLDivElement>(null);
    const materialIndex = card.materials.findIndex(mat => mat === material);

    // const linkSummon = useCallback(() => {
    //     duel.gameActions.linkSummon({ card });
    // }, [card]);

    // const xyzSummonATK = useCallback(() => {
    //     duel.gameActions.xyzSummon({ card, position: "faceup-attack" });
    // }, [card]);

    // const xyzSummonDEF = useCallback(() => {
    //     duel.gameActions.xyzSummon({ card, position: "faceup-defense" });
    // }, [card]);

    // const synchroSummonATK = useCallback(() => {
    //     duel.gameActions.synchroSummon({ card, position: "faceup-attack" });
    // }, [card]);

    // const synchroSummonDEF = useCallback(() => {
    //     duel.gameActions.synchroSummon({ card, position: "faceup-defense" });
    // }, [card]);

    // const fusionSummonATK = useCallback(() => {
    //     duel.gameActions.fusionSummon({ card, position: "faceup-defense" });
    // }, [card]);

    // const fusionSummonDEF = useCallback(() => {
    //     duel.gameActions.fusionSummon({ card, position: "faceup-defense" });
    // }, [card]);

    // const specialSummonATK = useCallback(() => {
    //     duel.gameActions.specialSummon({ card, originZone, position: "faceup-attack" });
    // }, [card, originZone]);

    // const specialSummonDEF = useCallback(() => {
    //     duel.gameActions.specialSummon({ card, originZone, position: "faceup-defense" });
    // }, [card, originZone]);

    useLayoutEffect(() => {
        const container = menuRef.current!;
        const cardRect = htmlCardElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const top = Math.min(window.innerHeight - containerRect.height, cardRect.top);
        container.style.left = cardRect.left - containerRect.width + "px";
        container.style.top = top + "px";
    }, [card, htmlCardElement]);

    const detachMaterial = useCallback(() => {
        duel.gameActions.detachMaterial({ card, originZone, materialIndex });
    }, [card, material]);

    // const isLink = YGOGameUtils.isLinkMonster(card);
    // const isSynchro = YGOGameUtils.isSynchroMonster(card);
    // const isFusion = YGOGameUtils.isFusionMonster(card);
    // const isXYZ = YGOGameUtils.isXYZMonster(card);

    return <>
        <CardMenu menuRef={menuRef}>
            <button className="ygo-card-item" type="button" onClick={detachMaterial}>Detach</button>
            {/* {config.actions && <>
                {isLink && <button className="ygo-card-item" type="button" onClick={linkSummon}>Link Summon</button>}

                {isSynchro && <>
                    <button className="ygo-card-item" type="button" onClick={synchroSummonATK}>Synchro Summon ATK</button>
                    <button className="ygo-card-item" type="button" onClick={synchroSummonDEF}>Synchro Summon DEF</button>
                </>
                }

                {isFusion && <>
                    <button className="ygo-card-item" type="button" onClick={fusionSummonATK}>Fusion Summon ATK</button>
                    <button className="ygo-card-item" type="button" onClick={fusionSummonDEF}>Fusion Summon DEF</button>
                </>
                }

                {isXYZ && <button className="ygo-card-item" type="button" onClick={xyzSummonATK}>XYZ Summon ATK</button>}
                {isXYZ && <button className="ygo-card-item" type="button" onClick={xyzSummonDEF}>XYZ Summon DEF</button>}
                <button type="button" className="ygo-card-item" onClick={specialSummonATK}>SS ATK</button>
                {!isLink && <button type="button" className="ygo-card-item" onClick={specialSummonDEF}>SS DEF</button>}
            </>} */}
        </CardMenu>
    </>

}