import { useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";

export function Graveyard({ duel, visible = true }: { duel: YGODuel, visible: boolean }) {

    const action = useMemo(() => {
        const action = new ActionUiMenu(duel, { eventType: "card-gy-menu" });
        return action;
    }, [duel])

    if (!visible) return null;
    if (!duel.ygo) return null;

    const field = duel.ygo.state.fields[0];
    const gy = field.graveyard;

    return <div className="float-right-menu" onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}>
        <h2>GY</h2>
        <hr />
        {gy.map(card => <div>
            <img onClick={(e) => {
                action.eventData = { duel, card, mouseEvent: e, htmlCardElement: e.target };
                duel.actionManager.setAction(action);
                duel.events.publish("set-selected-card", { player: 0, card });
            }}
                key={card.index}
                src={`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`}
                className="ygo-card" />
        </div>)}
    </div>

    // TODO
}