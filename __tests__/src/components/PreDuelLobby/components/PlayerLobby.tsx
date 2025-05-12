import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { getCardImageUrl } from "../../../utils/cardImages";
import { usePreDuelLobbyContext } from "./context"
import { Card } from "ygo-core";
import { PRE_GAME_ACTIONS_TYPES } from "../actions";
import { Button } from "../../UI";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "../../../lib/components/ui/select";
import { getCardSize } from "@/utils/utils";

export function PlayerLobby({ player: playerIndex }: { player: number }) {
  const { decks, players, action, startDuel, setAction, setPlayerDeck } = usePreDuelLobbyContext();
  const player = players[playerIndex];
  const { deckId } = player;
  const [cardsSize, setCardsSize] = useState({ mainDeck: { width: "0px", height: "0px" }, extraDeck: { width: "0px", height: "0px" } });
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

    const mainDeckSize = getCardSize(mainDeckContainer, Math.max(10, player.mainDeck.length));
    const extraDeckSize = getCardSize(extraDeckContainer, Math.max(10, player.extraDeck.length));

    const sizes = {
      mainDeck: { width: mainDeckSize.width + "px", height: mainDeckSize.height + "px" },
      extraDeck: { width: extraDeckSize.width + "px", height: extraDeckSize.height + "px" },
    };

    setCardsSize(sizes);
  }, [player.mainDeck.length, player.extraDeck.length]);

  const mainDeckCardStyle = cardsSize.mainDeck;
  const extraDeckCardStyle = cardsSize.extraDeck;

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
          {decks?.map((deck: any) => {
            if (Array.isArray(deck.decks)) {
              return (
                <div key={deck.id || deck.name} className="px-2 py-1">
                  <div className="text-xs text-gray-500 uppercase mb-1">{deck.name}</div>
                  {deck.decks.map((subdeck: any) => (
                    <SelectItem key={subdeck.id} value={subdeck.id}>
                      {subdeck.name}
                    </SelectItem>
                  ))}
                </div>
              );
            }

            return (
              <SelectItem key={deck.id} value={deck.id}>
                {deck.name}
              </SelectItem>
            );
          })}
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