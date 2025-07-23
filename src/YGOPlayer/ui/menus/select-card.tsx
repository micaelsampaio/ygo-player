import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { Card, FieldZone, FieldZoneId } from "ygo-core";
import { YGOGameUtils } from "ygo-core";
import { CardZoneKV } from "../../types";

type OnSelectCard = (cards: CardZoneKV[]) => void;

export function SelectCardPopup({
  player,
  duel,
  visible = true,
  filter,
  onSelectCards: onSelectedCardsCb,
}: {
  player: number,
  duel: YGODuel;
  filter: {
    monsters?: boolean;
    field: boolean;
    hand: boolean;
    mainDeck: boolean;
  };
  visible: boolean;
  onSelectCards: OnSelectCard;
}) {
  const [render, setRender] = useState<number>(0);
  const selectedCards = useRef<Map<Card, { card: Card; zone: FieldZone }>>(
    new Map()
  );

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
  };

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
  };

  const field = duel.ygo.state.fields[player];

  const fieldCards = useMemo(() => {
    if (!filter.field) return [];
    const cards: { card: Card; zone: FieldZone }[] = [];

    field.monsterZone.forEach((card: any, index: any) => {
      if (!card) return false;

      let showCard = false;

      if (filter.monsters && YGOGameUtils.isMonster(card)) showCard = true;
      if (filter.monsters && YGOGameUtils.isToken(card)) showCard = true;

      if (!showCard) return false;

      cards.push({
        card,
        zone: YGOGameUtils.createZone("M", card.owner, index + 1),
      });
    });

    field.extraMonsterZone.forEach((card: any, index: any) => {
      if (!card) return false;

      let showCard = false;

      if (filter.monsters && YGOGameUtils.isMonster(card) && card.owner === player) showCard = true;

      if (!showCard) return false;

      cards.push({
        card,
        zone: YGOGameUtils.createZone("EMZ", card.owner, index + 1),
      });
    });
    return cards;
  }, [field, filter]);

  const handCards = useMemo(() => {
    if (!filter.field) return [];
    const cards: { card: Card; zone: FieldZone }[] = [];

    field.hand.forEach((card: any, index: any) => {
      if (!card) return false;

      let showCard = false;

      if (filter.monsters && YGOGameUtils.isMonster(card)) showCard = true;

      if (!showCard) return false;

      cards.push({
        card,
        zone: YGOGameUtils.createZone("H", card.owner, index + 1),
      });
    });
    return cards;
  }, [field, filter]);

  const close = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
    duel.events.dispatch("close-ui-menu", { group: "game-popup" });
  }, []);

  useEffect(() => {
    if (visible) {
      const unsubscribe = duel.globalHotKeysManager.on("escPressed", () => {
        duel.events.dispatch("close-ui-menu", { group: "game-popup" });
      });

      return () => {
        unsubscribe();
      }
    }
  }, [visible]);

  return (
    <div
      className="game-popup"
      onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onContextMenu={(e) => {
        if (e.currentTarget === e.target) {
          close(e);
        }
      }}
      onClick={close}
    >
      <div
        className="game-popup-dialog"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="game-popup-header">
          <div className="game-popup-header-title">Select Card</div>
          <div>
            <button
              className="ygo-btn ygo-btn-action"
              onClick={onSelectCardsCallback}
            >
              Decide
            </button>
          </div>
          <div style={{ marginLeft: "20px" }}>
            <button onClick={close} className="ygo-close"></button>
          </div>
        </div>
        <div className="game-popup-content">
          <div>
            {fieldCards.length > 0 && (
              <div>
                <div>
                  <b>Monsters Zone</b>
                </div>
                <div className="ygo-menu-view-main-deck-cards">
                  {fieldCards.map((cardData) => {
                    return (
                      <img
                        key={cardData.card.index}
                        src={cardData.card.images.small_url}
                        className={`ygo-card ${selectedCards.current.has(cardData.card)
                          ? "selected"
                          : ""
                          }`}
                        onClick={() =>
                          onSelectCard(cardData.card, cardData.zone)
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {handCards.length > 0 && (
              <div>
                <div>
                  <b>Hand</b>
                </div>
                <div className="ygo-menu-view-main-deck-cards">
                  {handCards.map((cardData) => {
                    return (
                      <img
                        key={cardData.card.index}
                        src={cardData.card.images.small_url}
                        className={`ygo-card ${selectedCards.current.has(cardData.card)
                          ? "selected"
                          : ""
                          }`}
                        onClick={() =>
                          onSelectCard(cardData.card, cardData.zone)
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
