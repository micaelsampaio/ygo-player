import { useMemo } from "react";
import { YGODuel } from "../../core/YGODuel";
import { ActionUiMenu } from "../../actions/ActionUiMenu";

export function ExtraDeck({ duel, player, clearAction, visible = true }: { player: number, duel: YGODuel, visible: boolean, clearAction: () => void }) {

    const action = useMemo(() => {
        const action = new ActionUiMenu(duel, { eventType: "card-extra-deck-menu" });
        return action;
    }, [duel])

    if (!visible) return null;
    if (!duel.ygo) return null;

    const field = duel.ygo.state.fields[player];
    const cards = field.extraDeck;

    return <div className="float-right-menu" onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}

        onClick={e => {
            e.preventDefault();
            e.stopPropagation();
        }}

        onScroll={() => duel.events.publish("clear-ui-action")}
    >
        <h2>EX Deck</h2>
        <hr />
        {cards.map(card => <div>
            <img onClick={(e) => {
                action.eventData = { duel, card, mouseEvent: e, htmlCardElement: e.target };
                duel.actionManager.setAction(action);
                duel.events.publish("set-selected-card", { player, card });
            }}
                key={card.index}
                src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`}
                className="ygo-card" />
        </div>)}
    </div>

    // TODO
}