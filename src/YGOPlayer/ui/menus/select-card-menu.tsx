import { YGODuel } from "../../core/YGODuel";
import { Card } from "../../../YGOCore/types/types";
import { useLayoutEffect, useMemo, useRef } from "react";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { YGOGameUtils } from "../../../YGOCore";

export function SelectedCardMenu({ duel, card, visible = true }: { duel: YGODuel, card: Card, visible: boolean }) {
    const menuRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!menuRef.current) return;
        const placeholder = duel.duelScene.selectedCardPlaceholder;
        const container = menuRef.current!;
        const { x, y, width, height } = getTransformFromCamera(duel, placeholder);
        container.style.top = y + "px";
        container.style.left = 0 + "px";
        container.style.width = width + "px";
        container.style.maxHeight = height + "px";

        const selectedCardHtml = document.querySelector<HTMLDivElement>(".ygo-card")!
        selectedCardHtml.style.maxHeight = height * 0.6 + "px";
        selectedCardHtml.style.maxWidth = width * 0.6 + "px";

    }, [visible, menuRef.current, card, duel.duelScene.selectedCardPlaceholder]);

    const cardData = useMemo(() => {
        if (!card) return null;

        let colorClassName;
        const isMonster = YGOGameUtils.isMonster(card);
        const isLinkMonster = YGOGameUtils.isLinkMonster(card);

        if (isLinkMonster) {
            colorClassName = "ygo-link-card-bg";
        } else if (YGOGameUtils.isXYZMonster(card)) {
            colorClassName = "ygo-xyz-card-bg";
        } else if (isMonster) {
            colorClassName = "ygo-effect-monster-card-bg";
        } else if (YGOGameUtils.isSpell(card)) {
            colorClassName = "ygo-spell-card-bg";
        } else if (YGOGameUtils.isTrap(card)) {
            colorClassName = "ygo-trap-card-bg";
        } else {
            colorClassName = "ygo-effect-monster-card";
        }

        return {
            type: `[${card.typeline && card.typeline.join(" / ")}]`,
            colorClassName,
            isMonster,
            isLinkMonster
        }
    }, [card]);

    if (!visible) return null;
    if (!card) return null;
    if (!cardData) return null;

    return <div className="selected-card-menu" ref={menuRef} onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}

        onClick={e => {
            e.preventDefault();
            e.stopPropagation();
        }}
    >
        <div className={`ygo-selected-card-header ${cardData.colorClassName}`} style={{ fontSize: "20px" }}>
            {
                card.name
            }
            <div style={{ fontSize: "10px" }}>{card.id}</div>
        </div>

        <div className={`ygo-player-${card.owner}-bg-bottom ygo-flex`}>
            <div>
                <img className="ygo-card" style={{ objectFit: "contain" }} src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`} />
            </div>
            <div>
                {cardData.isMonster && <>
                    <div>
                        LVL: {card.linkval || card.level}
                    </div>
                    <div>
                        ATK: {card.currentAtk}
                    </div>
                    <div>
                        {!cardData.isLinkMonster && <>
                            DEF: {card.currentDef}
                        </>}
                    </div>
                </>}

            </div>

        </div>



        <div className="mb-2 ygo-text-sm">
            {cardData.type}
        </div>

        <div className="ygo-scroll-y ygo-grow ygo-text-md">
            {
                card.desc && card.desc
            }
        </div>
    </div>
}