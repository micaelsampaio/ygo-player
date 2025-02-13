import { useRef, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { Card, FieldZone, FieldZoneId } from "../../../YGOCore/types/types";
import { YGOGameUtils } from "../../../YGOCore";
import { CardZoneKV } from "../../types";

type OnSelectCard = (cards: CardZoneKV[]) => void

export function SelectCardPopup({ duel, visible = true, onSelectCards: onSelectedCardsCb }: { duel: YGODuel, visible: boolean, onSelectCards: OnSelectCard }) {
    const [render, setRender] = useState<number>(0);
    const selectedCards = useRef<Map<Card, { card: Card, zone: FieldZoneId }>>(new Map());

    // const action = useMemo(() => {
    //     const action = new ActionUiMenu(duel, { eventType: "card-deck-menu" });
    //     return action;
    // }, [duel])

    // const onCardClick = (e: React.MouseEvent, card: Card) => {
    //     action.eventData = { duel, card, mouseEvent: e };
    //     duel.actionManager.setAction(action);
    // }

    // if (!visible) return null;

    const onSelectCard = (zone: FieldZoneId, card: Card) => {
        if (selectedCards.current.has(card)) {
            selectedCards.current.delete(card);
        } else {
            selectedCards.current.set(card, { card, zone });
        }

        setRender(Date.now());
    }

    const onSelectCardsCallback = () => {
        const player = 0;
        const field = duel.ygo.state.fields[player];
        const cards = Array.from(selectedCards.current.values());

        const newCards = cards.map(cardData => {
            let zone: FieldZone | undefined;
            switch (cardData.zone) {
                case "H":
                    const handIndex = field.hand.findIndex(c => c == cardData.card);
                    zone = YGOGameUtils.createZone("H", player, handIndex + 1);
                    break;
                case "M":
                    const monsterIndex = field.monsterZone.findIndex(c => c == cardData.card);
                    zone = YGOGameUtils.createZone("M", player, monsterIndex + 1);
                    break;
                case "D":
                    const mainDeckIndex = field.mainDeck.findIndex(c => c == cardData.card);
                    zone = YGOGameUtils.createZone("D", player, mainDeckIndex + 1);
                    break;
                case "ED":
                    const extraDeckIndex = field.mainDeck.findIndex(c => c == cardData.card);
                    zone = YGOGameUtils.createZone("ED", player, extraDeckIndex + 1);
                    break;
                default:
                    throw new Error("invalid card zone in card selection " + cardData.zone);
            }

            return {
                card: cardData.card,
                zone
            }
        })

        onSelectedCardsCb(newCards);
    }

    const field = duel.ygo.state.fields[0];

    return <div className="game-popup" onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
    }}

        onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            duel.events.publish("close-ui-menu", { group: "game-popup" });
        }}
    >

        <div className="game-popup-content menu-view-main-deck" onClick={e => {
            e.preventDefault();
            e.stopPropagation();
        }}>

            <h3>Select Card</h3>

            <button onClick={onSelectCardsCallback}>Decide</button>

            <br />

            <div>
                {field.hand.length > 0 && <div>
                    <div>
                        <b>Hand</b>
                    </div>
                    <div>
                        {field.hand.map(card => {
                            if (!card) return null;
                            return <img key={card.index} src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`} className={`ygo-card ${selectedCards.current.has(card) ? "selected" : ""}`} onClick={() => onSelectCard("H", card)} />
                        })}
                    </div>
                </div>}

                {field.monsterZone.filter(card => card).length > 0 && <div>
                    <div>
                        <b>Monster Zone</b>
                    </div>
                    <div>
                        {field.monsterZone.map(card => {
                            if (!card) return null;
                            return <img key={card.index} src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`} className={`ygo-card ${selectedCards.current.has(card) ? "selected" : ""}`} onClick={() => onSelectCard("M", card)} />
                        })}
                    </div>
                </div>}

                {/* {
                    field.graveyard.length > 0 && <div>
                        <div>
                            <b>GY</b>
                        </div>
                        <div>
                            {field.graveyard.map(card => {
                                if (!card) return null;
                                return <img key={card.index} src={`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`} className={`ygo-card ${selectedCards.current.has(card) ? "selected" : ""}`} onClick={() => onSelectCard("GY", card)} />
                            })}
                        </div>
                    </div>
                } */}

                {
                    field.mainDeck.length > 0 && <div>
                        <div>
                            <b>Main Deck</b>
                        </div>
                        <div>
                            {field.mainDeck.map(card => {
                                if (!card) return null;
                                return <img key={card.index} src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`} className={`ygo-card ${selectedCards.current.has(card) ? "selected" : ""}`} onClick={() => onSelectCard("D", card)} />
                            })}
                        </div>
                    </div>
                }



                {/* {cardsToShow.map(card => <img key={card.index} onClick={(e) => onCardClick(e, card)} src={`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`} className="ygo-card" />)} */}
            </div>

        </div>

    </div>
}