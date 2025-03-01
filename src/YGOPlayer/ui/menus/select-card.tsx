import { useMemo, useRef, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { Card, FieldZone, FieldZoneId } from "../../../YGOCore/types/types";
import { YGOGameUtils } from "../../../YGOCore";
import { CardZoneKV } from "../../types";

type OnSelectCard = (cards: CardZoneKV[]) => void

export function SelectCardPopup({ duel, visible = true, filter, onSelectCards: onSelectedCardsCb }:
    { duel: YGODuel, filter: { monsters?: boolean, field: boolean, hand: boolean, mainDeck: boolean }, visible: boolean, onSelectCards: OnSelectCard }) {

    const [render, setRender] = useState<number>(0);
    const selectedCards = useRef<Map<Card, { card: Card, zone: FieldZone }>>(new Map());

    // const action = useMemo(() => {
    //     const action = new ActionUiMenu(duel, { eventType: "card-deck-menu" });
    //     return action;
    // }, [duel])

    // const onCardClick = (e: React.MouseEvent, card: Card) => {
    //     action.eventData = { duel, card, mouseEvent: e };
    //     duel.actionManager.setAction(action);
    // }

    // if (!visible) return null;

    // const onSelectCard = (zone: FieldZoneId, card: Card) => {
    //     if (selectedCards.current.has(card)) {
    //         selectedCards.current.delete(card);
    //     } else {
    //         selectedCards.current.set(card, { card, zone });
    //     }

    //     setRender(Date.now());
    // }

    const onSelectCard = (card: Card, zone: FieldZone) => {
        if (selectedCards.current.has(card)) {
            selectedCards.current.delete(card);
        } else {
            selectedCards.current.set(card, { card, zone });
        }

        setRender(Date.now());
    }

    // const onSelectCardsCallback = () => {
    //     const player = 0;
    //     const field = duel.ygo.state.fields[player];
    //     const cards = Array.from(selectedCards.current.values());

    //     const newCards = cards.map(cardData => {
    //         let zone: FieldZone | undefined;
    //         switch (cardData.zone) {
    //             case "H":
    //                 const handIndex = field.hand.findIndex(c => c == cardData.card);
    //                 zone = YGOGameUtils.createZone("H", player, handIndex + 1);
    //                 break;
    //             case "M":
    //                 const monsterIndex = field.monsterZone.findIndex(c => c == cardData.card);
    //                 zone = YGOGameUtils.createZone("M", player, monsterIndex + 1);
    //                 break;
    //             case "D":
    //                 const mainDeckIndex = field.mainDeck.findIndex(c => c == cardData.card);
    //                 zone = YGOGameUtils.createZone("D", player, mainDeckIndex + 1);
    //                 break;
    //             case "ED":
    //                 const extraDeckIndex = field.mainDeck.findIndex(c => c == cardData.card);
    //                 zone = YGOGameUtils.createZone("ED", player, extraDeckIndex + 1);
    //                 break;
    //             default:
    //                 throw new Error("invalid card zone in card selection " + cardData.zone);
    //         }

    //         return {
    //             card: cardData.card,
    //             zone
    //         }
    //     })

    //     onSelectedCardsCb(newCards);
    // }

    const onSelectCardsCallback = () => {
        const cards = Array.from(selectedCards.current.values());
        onSelectedCardsCb(cards);
    }

    const field = duel.ygo.state.fields[0];

    const fieldCards = useMemo(() => {
        if (!filter.field) return [];
        const cards: { card: Card, zone: FieldZone }[] = [];

        field.monsterZone.forEach((card, index) => {
            if (!card) return false;

            let showCard = false;

            if (filter.monsters && YGOGameUtils.isMonster(card)) showCard = true;

            if (!showCard) return false;

            cards.push({
                card,
                zone: YGOGameUtils.createZone("M", card.owner, index + 1)
            });
        });
        return cards;
    }, [field, filter]);

    const handCards = useMemo(() => {
        if (!filter.field) return [];
        const cards: { card: Card, zone: FieldZone }[] = [];

        field.hand.forEach((card, index) => {
            if (!card) return false;

            let showCard = false;

            if (filter.monsters && YGOGameUtils.isMonster(card)) showCard = true;

            if (!showCard) return false;

            cards.push({
                card,
                zone: YGOGameUtils.createZone("H", card.owner, index + 1)
            });
        });
        return cards;
    }, [field, filter]);


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

        <div className="game-popup-dialog" onClick={e => {
            e.preventDefault();
            e.stopPropagation();
        }}>

            <div className="game-popup-header">
                <div className="game-popup-header-title">
                    Select Card
                </div>
                <div>
                    <button onClick={onSelectCardsCallback}>Decide</button>
                </div>
                <div>
                    <button className="ygo-close"></button>
                </div>
            </div>
            <div className="game-popup-content">
                <div>

                    {fieldCards.length > 0 && <div>
                        <div>
                            <b>Monsters Zone</b>
                        </div>
                        <div className="ygo-menu-view-main-deck-cards">
                            {fieldCards.map(cardData => {
                                return <img key={cardData.card.index} src={`${duel.config.cdnUrl}/images/cards_small/${cardData.card.id}.jpg`} className={`ygo-card ${selectedCards.current.has(cardData.card) ? "selected" : ""}`} onClick={() => onSelectCard(cardData.card, cardData.zone)} />
                            })}
                        </div>
                    </div>}

                    {handCards.length > 0 && <div>
                        <div>
                            <b>Hand</b>
                        </div>
                        <div className="ygo-menu-view-main-deck-cards">
                            {handCards.map(cardData => {
                                return <img key={cardData.card.index} src={`${duel.config.cdnUrl}/images/cards_small/${cardData.card.id}.jpg`} className={`ygo-card ${selectedCards.current.has(cardData.card) ? "selected" : ""}`} onClick={() => onSelectCard(cardData.card, cardData.zone)} />
                            })}
                        </div>
                    </div>}

                    {/* {field.hand.length > 0 && <div>
                    <div>
                        <b>Hand</b>
                    </div>
                    <div>
                        {field.hand.map(card => {
                            if (!card) return null;
                            return <img key={card.index} src={`${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg`} className={`ygo-card ${selectedCards.current.has(card) ? "selected" : ""}`} onClick={() => onSelectCard("H", card)} />
                        })}
                    </div>
                </div>} */}

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
                    {/* 
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
                } */}



                    {/* {cardsToShow.map(card => <img key={card.index} onClick={(e) => onCardClick(e, card)} src={`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`} className="ygo-card" />)} */}

                </div>
            </div>
        </div>

    </div>
}