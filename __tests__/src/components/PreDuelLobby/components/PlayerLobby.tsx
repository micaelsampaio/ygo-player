import { useCallback } from "react";
import { getCardImageUrl } from "../../../utils/cardImages";
import { usePreDuelLobbyContext } from "./context"
import { Card } from "ygo-core";
import { PRE_GAME_ACTIONS_TYPES } from "../actions";

export function PlayerLobby({ player: playerIndex }: { player: number }) {
  const { deckNames, players, action, setAction, setPlayerDeck } = usePreDuelLobbyContext();
  const player = players[playerIndex];
  const { deckId } = player;

  const changeDeck = useCallback((deckId: string) => {
    setPlayerDeck(playerIndex, deckId);
  }, [playerIndex]);

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

  return <div className="h-full p-2 text-white">
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Select an option</label>
      <select className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" value={deckId} onChange={e => changeDeck(e.target.value)}>
        <option selected>Choose your deck</option>
        {deckNames.map(deckName => <option key={deckName}>{deckName}</option>)}
      </select>
    </div>
    <div className="text-sm font-bold mt-3 mb-1">
      Main deck
    </div>
    <div className="h-2/5 bg-black/30 w-full flex flex-wrap">
      {player.mainDeck.map(card => <img src={`${getCardImageUrl(card.id, "small")}`} className={`h-10 border-1 border-solid ${action?.data.selectedCard === card ? "border-yellow-300" : "border-transparent"}`} onClick={() => onCardClick(card)} />)}
    </div>
    <div className="text-sm font-bold mt-3 mb-1">
      Extra deck
    </div>
    <div className="h-3/12 bg-black/30 w-full flex flex-wrap">
      {player.extraDeck.map(card => <img src={`${getCardImageUrl(card.id, "small")}`} className={`h-10 border-1 border-solid ${action?.data.selectedCard === card ? "border-yellow-300" : "border-transparent"}`} onClick={() => onCardClick(card)} />)}
    </div>
  </div>

}