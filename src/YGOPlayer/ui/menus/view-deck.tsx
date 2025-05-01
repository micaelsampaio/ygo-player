import { useMemo, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { Card } from "ygo-core";
import { ActionUiMenu } from "../../actions/ActionUiMenu";
import { Deck } from "../../../YGOPlayer/game/Deck";
import { YGOGameUtils } from "ygo-core";

export function ViewDeckPopup({
  duel,
  deck,
  visible = true,
}: {
  deck: Deck;
  duel: YGODuel;
  visible: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typesOfCards, setTypesOfCards] = useState({
    monster: false,
    spell: false,
    trap: false,
  });

  const action = useMemo(() => {
    const action = new ActionUiMenu(duel, { eventType: "card-deck-menu" });
    return action;
  }, [duel]);

  const onCardClick = (e: React.MouseEvent, card: Card) => {
    action.eventData = { duel, player: deck.player, deck, card, mouseEvent: e };
    duel.actionManager.setAction(action);
  };
  const close = () => {
    duel.events.dispatch("close-ui-menu", { group: "game-popup" });
  };

  if (!visible) return null;

  const field = duel.ygo.state.fields[deck.player];
  const cards = field.mainDeck;

  const cardsToShow = useMemo(() => {
    let searchTypes = Object.values(typesOfCards).some((v) => v);

    return cards
      .filter((card: any) => {
        let showCard = !searchTypes;

        if (typesOfCards.monster && YGOGameUtils.isMonster(card))
          showCard = true;
        if (typesOfCards.spell && YGOGameUtils.isSpell(card)) showCard = true;
        if (typesOfCards.trap && YGOGameUtils.isTrap(card)) showCard = true;

        if (!showCard) return false;

        return card.name.toLowerCase().includes(search);
      })
      .reverse();
  }, [search, cards, cards.length, typesOfCards]);

  return (
    <div
      className="game-popup"
      onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
      }}
    >
      <div
        className="game-popup-dialog ygo-menu-view-main-deck"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="game-popup-header">
          <div className="game-popup-header-title">View Deck</div>
          <div>
            <button className="ygo-close" onClick={close}></button>
          </div>
        </div>
        <div className="game-popup-content-no-scroll ygo-flex ygo-gap-2 ygo-items-center ygo-pt-0">
          <div>
            <input
              className="ygo-menu-view-main-deck-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a Card..."
            />
          </div>
          <div>
            <CardIcon
              selected={typesOfCards.monster}
              type="monster"
              onClick={() => {
                setTypesOfCards((currentState) => {
                  currentState.monster = !currentState.monster;
                  return { ...currentState };
                });
              }}
            />
          </div>
          <div>
            <CardIcon
              selected={typesOfCards.spell}
              type="spell"
              onClick={() => {
                setTypesOfCards((currentState) => {
                  currentState.spell = !currentState.spell;
                  return { ...currentState };
                });
              }}
            />
          </div>
          <div>
            <CardIcon
              selected={typesOfCards.trap}
              type="trap"
              onClick={() => {
                setTypesOfCards((currentState) => {
                  currentState.trap = !currentState.trap;
                  return { ...currentState };
                });
              }}
            />
          </div>
        </div>
        <div className="game-popup-content">
          <div className="ygo-menu-view-main-deck-cards">
            {cardsToShow.map((card: Card) => (
              <img
                key={card.index}
                onMouseDown={(event: any) => duel.events.dispatch("on-card-mouse-down", { card, event })}
                onMouseUp={(event: any) => duel.events.dispatch("on-card-mouse-up", { card, event })}
                onClick={(e) => onCardClick(e, card)}
                src={card.images.small_url}
                className="ygo-card"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardIcon({
  type,
  selected,
  onClick,
}: {
  selected: boolean;
  type: "monster" | "spell" | "trap";
  onClick?: any;
}) {
  const className =
    type === "spell"
      ? "ygo-spell"
      : type === "trap"
        ? "ygo-trap"
        : "ygo-monster";
  return (
    <div onClick={onClick}>
      <div
        className={`card-icon ygo-cursor-pointer ${className} ${selected ? `` : "not-selected"
          }`}
      ></div>
    </div>
  );
}
