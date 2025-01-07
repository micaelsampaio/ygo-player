import { useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";

export function ExtraDeck({ duel, visible = true }: { duel: YGODuel, visible: boolean }) {

    const action = useMemo(() => {
        const action = new ActionUiMenu(duel, { eventType: "card-extra-deck-menu" });
        return action;
    }, [duel])

    if (!visible) return null;
    if (!duel.ygo) return null;

    const field = duel.ygo.state.fields[0];
    const cards = field.extraDeck;
    console.log("extra cards >> ", cards);

    return <div className="float-right-menu" onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}

        onClick={e => {
            e.preventDefault();
            e.stopPropagation();
        }}
    >
        <h2>EX Deck</h2>
        <hr />
        {cards.map(card => <div>
            <img onClick={(e) => {
                action.eventData = { duel, card, mouseEvent: e };
                duel.actionManager.setAction(action);
            }}
                key={card.index}
                src={`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`}
                className="ygo-card" />
        </div>)}
    </div>

    // TODO
}