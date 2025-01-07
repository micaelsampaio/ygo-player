import { useMemo, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { Card } from "../../../YGOCore/types/types";
import { ActionUiMenu } from "../../actions/ActionUiMenu";

export function ViewDeckPopup({ duel, visible = true }: { duel: YGODuel, visible: boolean }) {

    const [search, setSearch] = useState("");

    const action = useMemo(() => {
        const action = new ActionUiMenu(duel, { eventType: "card-deck-menu" });
        return action;
    }, [duel])

    const onCardClick = (e: React.MouseEvent, card: Card) => {
        action.eventData = { duel, card, mouseEvent: e };
        duel.actionManager.setAction(action);
    }

    if (!visible) return null;

    const field = duel.ygo.state.fields[0];
    const cards = field.mainDeck;

    const cardsToShow = cards.filter(c => c.name.toLowerCase().includes(search));

    return <div className="game-popup" onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}

        onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            duel.events.publish("close-ui-menu", { key: "game-popup" });
        }}
    >

        <div className="game-popup-content menu-view-main-deck" onClick={e => {
            e.preventDefault();
            e.stopPropagation();
        }}>

            <h3>Menu</h3>

            <input value={search} onChange={e => setSearch(e.target.value)} />
            <br />

            <div className="menu-view-main-deck-cards">
                {
                    cardsToShow.map(card => <img key={card.index} onClick={(e) => onCardClick(e, card)} src={`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`} className="ygo-card" />)}
            </div>

        </div>

    </div>
}