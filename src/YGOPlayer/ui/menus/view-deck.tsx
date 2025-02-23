import { useMemo, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { Card } from "../../../YGOCore/types/types";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Deck } from "../../../YGOPlayer/game/Deck";

export function ViewDeckPopup({ duel, deck, visible = true }: { deck: Deck, duel: YGODuel, visible: boolean }) {

    const [search, setSearch] = useState("");

    const action = useMemo(() => {
        const action = new ActionUiMenu(duel, { eventType: "card-deck-menu" });
        return action;
    }, [duel])

    const onCardClick = (e: React.MouseEvent, card: Card) => {
        action.eventData = { duel, player: deck.player, deck, card, mouseEvent: e };
        duel.actionManager.setAction(action);
    }

    if (!visible) return null;

    const field = duel.ygo.state.fields[deck.player];
    const cards = field.mainDeck;

    const cardsToShow = cards.filter(c => c.name.toLowerCase().includes(search));

    return <div className="game-popup" onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}

        onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            duel.events.dispatch("close-ui-menu", { group: "game-popup" });
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
                    cardsToShow.map(card => <img key={card.index} onClick={(e) => onCardClick(e, card)} src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`} className="ygo-card" />)}
            </div>

        </div>

    </div>
}