import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { getCardImageUrl } from "../../../utils/cardImages";
import { usePreDuelLobbyContext } from "./context"
import { Card } from "ygo-core";
import { PRE_GAME_ACTIONS_TYPES } from "../actions";
import { Button } from "../../UI";

export function PlayerLobby({ player: playerIndex }: { player: number }) {
  const { deckNames, players, action, startDuel, setAction, setPlayerDeck } = usePreDuelLobbyContext();
  const player = players[playerIndex];
  const { deckId } = player;
  const [cardsSize, setCardsSize] = useState({ mainDeck: "0px", extraDeck: "0px" });
  const containerRef = useRef<HTMLDivElement>(null);

  const changeDeck = useCallback((deckId: string) => {
    setPlayerDeck(playerIndex, deckId);
  }, [playerIndex, setPlayerDeck]);

  const onCardClick = (card: Card) => {
    if (action?.data?.lock) return;

    setAction({
      name: PRE_GAME_ACTIONS_TYPES.select_card_zone,
      data: {
        selectedCard: card,
        player: playerIndex,
        card
      }
    });
  }

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mainDeckContainer = container.querySelector<HTMLDivElement>(".main-deck-container")!;
    const extraDeckContainer = container.querySelector<HTMLDivElement>(".extra-deck-container")!;

    const getCardSize = (parent: HTMLDivElement, minRows: number, maxNumberOfCards: number): number => {
      if (maxNumberOfCards === 0) return 0;

      const containerWidth = parent.offsetWidth;
      const containerHeight = parent.offsetHeight;
      const aspectRatio = 1.45;
      const minCols = 5;
      const minAcceptableRows = 2;

      let bestCardHeight = 0;

      for (let rows = Math.max(minRows, minAcceptableRows); rows <= Math.min(Math.ceil(maxNumberOfCards / minCols), 10); rows++) {
        const cols = Math.ceil(maxNumberOfCards / rows);

        if (cols < minCols) {
          continue;
        }

        const maxCardWidth = containerWidth / cols;
        const maxCardHeight = containerHeight / rows;

        let cardHeight;
        const heightIfUsingFullWidth = maxCardWidth * aspectRatio;

        if (heightIfUsingFullWidth <= maxCardHeight) {
          cardHeight = heightIfUsingFullWidth;
        } else {
          cardHeight = maxCardHeight;
        }

        if (cardHeight > bestCardHeight) {
          bestCardHeight = cardHeight;
        }
      }

      return bestCardHeight;
    };

    const sizes = {
      mainDeck: getCardSize(mainDeckContainer, 4, player.mainDeck.length) + "px",
      extraDeck: getCardSize(extraDeckContainer, 2, player.extraDeck.length) + "px",
    };

    setCardsSize(sizes);
  }, [player.mainDeck.length, player.extraDeck.length]);

  const mainDeckCardStyle = { height: cardsSize.mainDeck };
  const extraDeckCardStyle = { height: cardsSize.extraDeck };

  return <div className="h-full p-4 text-white" ref={containerRef}>
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Choose your deck</label>
      <select className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" value={deckId} onChange={e => changeDeck(e.target.value)}>
        <option value="">Choose your deck</option>
        {deckNames.map(deckName => <option key={deckName} value={deckName}>{deckName}</option>)}
      </select>
    </div>
    <div className="text-sm font-bold mt-4 mb-1">
      Main deck
    </div>
    <div className="main-deck-container h-[50%] bg-black/30 w-full rounded-md">
      <div className="flex flex-wrap justify-start items-start">
        {player.mainDeck.map((card) => (
          <div
            key={card.index}
            className={`ygo-card border-1 border-solid ${action?.data.selectedCard === card ? "border-yellow-300" : "border-transparent"}`}
            style={mainDeckCardStyle}
          >
            <img
              src={`${getCardImageUrl(card.id, "small")}`}
              className="w-full h-full"
              onClick={() => onCardClick(card)}
              alt={`Card ${card.id}`}
            />
          </div>
        ))}
      </div>
    </div>
    <div className="text-sm font-bold mt-3 mb-1">
      Extra deck
    </div>
    <div className="extra-deck-container h-[20%] bg-black/30 w-full rounded-md">
      <div className="flex flex-wrap justify-start items-start">
        {player.extraDeck.map((card) => (
          <div
            key={card.index}
            className={`ygo-card border-1 border-solid ${action?.data.selectedCard === card ? "border-yellow-300" : "border-transparent"}`}
            style={extraDeckCardStyle}
          >
            <img
              src={`${getCardImageUrl(card.id, "small")}`}
              className="w-full h-full"
              onClick={() => onCardClick(card)}
              alt={`Card ${card.id}`}
            />
          </div>
        ))}
      </div>
    </div>
    {
      playerIndex === 1 && <div className="pt-4">
        <Button className="w-full" variant="success" onClick={startDuel}>Start Duel</Button>
      </div>
    }
  </div>
}