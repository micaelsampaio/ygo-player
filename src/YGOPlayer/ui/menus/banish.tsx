import { useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";

export function Banish({ duel, visible = true }: { duel: YGODuel, visible: boolean }) {

    const action = useMemo(() => {
        const action = new ActionUiMenu(duel, { eventType: "card-b-menu" });
        return action;
    }, [duel])

    if (!visible) return null;
    if (!duel.ygo) return null;

    const field = duel.ygo.state.fields[0];
    const cards = field.banishedZone;

    return <div className="float-right-menu" onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}>
        <h2>Banish</h2>
        <hr />
        {cards.map(card => <div>
            <div style={{ position: "relative" }}>
                <img onClick={(e) => {
                    action.eventData = { duel, card, mouseEvent: e };
                    duel.actionManager.setAction(action);
                }} src={`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`} 
                key={card.index}
                className="ygo-card" />
                {card.position === "facedown" && <div style={{ position: "absolute", bottom: '5px', left: '0px', background: "red", color: "white", padding: "5px 10px" }}>FD</div>}
            </div>
        </div>)}
    </div>

    // TODO
}