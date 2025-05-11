import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { getCardImageUrl } from "../../../utils/cardImages";
import { usePreDuelLobbyContext } from "./context"
import { Card } from "ygo-core";
import { PRE_GAME_ACTIONS_TYPES } from "../actions";
import { Button } from "../../UI";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "../../ui/select";

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

    const getCardSize = (
      parent: HTMLDivElement,
      minRows: number,
      maxNumberOfCards: number
    ): number => {
      if (maxNumberOfCards <= 0) return 0;

      const containerWidth = parent.offsetWidth;
      const containerHeight = parent.offsetHeight;
      const aspectRatio = 1.45;
      const minCols = Math.min(5, maxNumberOfCards);

      let bestCardHeight = 0;

      for (let cols = minCols; cols <= Math.min(maxNumberOfCards, 20); cols++) {
        const rows = Math.ceil(maxNumberOfCards / cols);

        if (rows < minRows) continue;

        const availableWidthPerCard = containerWidth / cols;
        const heightBasedOnWidth = availableWidthPerCard / aspectRatio;

        const availableHeightPerCard = containerHeight / rows;

        const cardHeight = Math.min(heightBasedOnWidth, availableHeightPerCard);
        const cardWidth = cardHeight * aspectRatio;

        if (cardWidth * cols <= containerWidth &&
          cardHeight * rows <= containerHeight &&
          cardHeight > bestCardHeight) {
          bestCardHeight = cardHeight;
        }
      }

      if (bestCardHeight === 0) {
        const cols = Math.min(minCols, maxNumberOfCards);
        const cardWidth = containerWidth / cols;
        bestCardHeight = cardWidth / aspectRatio;
      }

      return bestCardHeight;
    };

    const sizes = {
      mainDeck: getCardSize(mainDeckContainer, 4, player.mainDeck.length) + "px",
      extraDeck: getCardSize(extraDeckContainer, 2, player.mainDeck.length) + "px",
    };

    setCardsSize(sizes);
  }, [player.mainDeck.length, player.extraDeck.length]);

  const mainDeckCardStyle = { height: cardsSize.mainDeck };
  const extraDeckCardStyle = { height: cardsSize.extraDeck };

  return <div className="h-full p-4 text-white" ref={containerRef}>
    <div>
      <div className="mb-3">
        <label className="text-md font-bold">Choose deck</label>
      </div>
      <Select value={deckId || ""} onValueChange={changeDeck}>
        <SelectTrigger className="w-full bg-white text-gray-800 placeholder:text-gray-500">
          <SelectValue placeholder="Select a deck" />
        </SelectTrigger>
        <SelectContent>
          {deckNames?.map(deckName => (
            <SelectItem key={deckName} value={deckName}>
              {deckName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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