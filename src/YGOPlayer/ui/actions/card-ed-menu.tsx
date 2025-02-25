import { useCallback, useLayoutEffect, useRef } from "react";
import { YGOGameUtils } from "../../../YGOCore";
import { Card, FieldZone } from "../../../YGOCore/types/types";
import { YGODuel } from "../../core/YGODuel";
import { UiGameConfig } from "../YGOUiController";
import { CardMenu } from "../components/CardMenu";

export function CardExtraDeckMenu({ duel, config, card, htmlCardElement, clearAction, mouseEvent }: { duel: YGODuel, zone: FieldZone, card: Card, htmlCardElement: HTMLDivElement, clearAction: Function, mouseEvent: React.MouseEvent, config: UiGameConfig }) {
    const menuRef = useRef<HTMLDivElement>(null);
    const player = card.originalOwner;
    const cardIndex = duel.ygo.state.fields[player].extraDeck.findIndex((c) => c === card);
    const originZone: FieldZone = YGOGameUtils.createZone("ED", player, cardIndex + 1);

    const linkSummon = useCallback(() => {
        duel.gameActions.linkSummon({ card });
    }, [card]);

    const xyzSummonATK = useCallback(() => {
        duel.gameActions.xyzSummon({ card, position: "faceup-attack" });
    }, [card]);

    const xyzSummonDEF = useCallback(() => {
        duel.gameActions.xyzSummon({ card, position: "faceup-defense" });
    }, [card]);

    const xyzOverlaySummonATK = useCallback(() => {
        duel.gameActions.xyzOverlaySummon({ card, position: "faceup-attack" });
    }, [card]);

    const xyzOverlaySummonDEF = useCallback(() => {
        duel.gameActions.xyzOverlaySummon({ card, position: "faceup-defense" });
    }, [card]);

    const synchroSummonATK = useCallback(() => {
        duel.gameActions.synchroSummon({ card, position: "faceup-attack" });
    }, [card]);

    const synchroSummonDEF = useCallback(() => {
        duel.gameActions.synchroSummon({ card, position: "faceup-defense" });
    }, [card]);

    const fusionSummonATK = useCallback(() => {
        duel.gameActions.fusionSummon({ card, position: "faceup-defense" });
    }, [card]);

    const fusionSummonDEF = useCallback(() => {
        duel.gameActions.fusionSummon({ card, position: "faceup-defense" });
    }, [card]);

    const specialSummonATK = useCallback(() => {
        duel.gameActions.specialSummon({ card, originZone, position: "faceup-attack" });
    }, [card, originZone]);

    const specialSummonDEF = useCallback(() => {
        duel.gameActions.specialSummon({ card, originZone, position: "faceup-defense" });
    }, [card, originZone]);

    useLayoutEffect(() => {
        const container = menuRef.current!;
        const cardRect = htmlCardElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const top = Math.min(window.innerHeight - containerRect.height, cardRect.top);
        container.style.left = cardRect.left - containerRect.width + "px";
        container.style.top = top + "px";
    }, [card, htmlCardElement]);

    const isLink = YGOGameUtils.isLinkMonster(card);
    const isSynchro = YGOGameUtils.isSynchroMonster(card);
    const isFusion = YGOGameUtils.isFusionMonster(card);
    const isXYZ = YGOGameUtils.isXYZMonster(card);

    return <>
        <CardMenu menuRef={menuRef}>
            {config.actions && <>
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

                {isXYZ && <>
                    <button className="ygo-card-item" type="button" onClick={xyzSummonATK}>XYZ Summon ATK</button>
                    <button className="ygo-card-item" type="button" onClick={xyzSummonDEF}>XYZ Summon DEF</button>
                    <button className="ygo-card-item" type="button" onClick={xyzOverlaySummonATK}>XYZ Overlay ATK</button>
                    <button className="ygo-card-item" type="button" onClick={xyzOverlaySummonDEF}>XYZ Overlay DEF</button>
                </>}

                <button type="button" className="ygo-card-item" onClick={specialSummonATK}>SS ATK</button>

                {!isLink && <button type="button" className="ygo-card-item" onClick={specialSummonDEF}>SS DEF</button>}
            </>}
        </CardMenu>
    </>

}