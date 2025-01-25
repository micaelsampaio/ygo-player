import { YGODuel } from "../../core/YGODuel";
import { Card } from "../../../YGOCore/types/types";

export function SelectedCardMenu({ duel, card, visible = true }: { duel: YGODuel, card: Card, visible: boolean }) {

    if (!visible) return null;
    if (!card) return null;

    return <div className="selected-card-menu" onMouseMove={(e) => {
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
        </div>

        <img className="ygo-card" src={`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`} />

        <div style={{ fontSize: "16px" }}>
            {card.typeline && card.typeline.join(" / ")} <br />

            {
                card.desc && card.desc
            }
        </div>
    </div>
}