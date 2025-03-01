import { YGODuel } from "../../core/YGODuel";
import { Card } from "../../../YGOCore/types/types";
import { useLayoutEffect, useRef } from "react";
import { getTransformFromCamera } from "../../scripts/ygo-utils";

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

    if (!visible) return null;
    if (!card) return null;

    return <div className="selected-card-menu" ref={menuRef} onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}

        onClick={e => {
            e.preventDefault();
            e.stopPropagation();
        }}
    >
        <div style={{ fontSize: "20px" }}>
            {
                card.name
            }
            <div style={{ fontSize: "10px" }}>{card.id}</div>
        </div>

        <img className="ygo-card" style={{ objectFit: "contain" }} src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`} />

        <div className="ygo-scroll-y ygo-grow ygo-text-md">
            <div className="mb-2 ygo-text-sm">
                {card.typeline && card.typeline.join(" / ")}
            </div>
            {
                card.desc && card.desc
            }
        </div>
    </div>
}