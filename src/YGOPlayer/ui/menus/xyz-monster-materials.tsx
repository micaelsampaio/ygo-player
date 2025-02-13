import { useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Card } from "../../../YGOCore/types/types";

export function XyzMonsterMaterialsMenu({ duel, card, visible = true }: { duel: YGODuel, card: Card, visible: boolean }) {

    const action = useMemo(() => {
        const action = new ActionUiMenu(duel, { eventType: "card-extra-deck-menu" });
        return action;
    }, [duel])

    if (!visible) return null;
    if (!duel.ygo) return null;
    if (!card) return null;

    const materials = card.materials;

    return <div className="float-right-menu" onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}

        onClick={e => {
            e.preventDefault();
            e.stopPropagation();
        }}
    >
        <h2>Materials</h2>
        <hr />
        {materials.map(card => <div>
            <img onClick={(e) => {
                action.eventData = { duel, card, mouseEvent: e };
                duel.actionManager.setAction(action);
            }}
                key={card.index}
                src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`}
                className="ygo-card" />
        </div>)}
    </div>

    // TODO
}