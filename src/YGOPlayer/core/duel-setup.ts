import { YGOClientType, HIDDEN_CARD_ID, createHiddenCardData } from "ygo-core";
import type { CardData, YGOServerGameStateData } from "ygo-core";

/**
 * The pure steps of YGODuel.createYGO: who the local player is, which cards
 * to download and the players' decks as card data.
 */

/** The local player's index (-1 for a spectator) and the other player's. */
export function resolveLocalPlayer(
  gameState: Pick<YGOServerGameStateData, "players">,
  username: string | undefined,
  clientType: YGOClientType,
): { playerIndex: number; otherPlayerIndex: number } {
  let playerIndex = gameState.players.findIndex(c => c.name === username);

  if (clientType === YGOClientType.PLAYER && playerIndex === -1) {
    playerIndex = 0;
  }

  const otherPlayerIndex = playerIndex >= 0 ? 1 - playerIndex : 1;
  return { playerIndex, otherPlayerIndex };
}

/** The side drawn at the bottom: the duel's playerPOV option, else the local player, else player 0. */
export function resolvePlayerPOV(playerPOVOption: unknown, playerIndex: number): number {
  return Number(playerPOVOption) >= 0 ? Number(playerPOVOption) : playerIndex >= 0 ? playerIndex : 0;
}

/**
 * The card ids to download, and the card data already known.
 *
 * Hidden information: the server sends the cards this client may not see
 * as HIDDEN_CARD_ID placeholders, and the data of the opponent's cards
 * revealed so far (hiddenInfo.cards) — later reveals come with each command.
 */
export function collectCardIds(gameState: Pick<YGOServerGameStateData, "players" | "hiddenInfo">): {
  ids: number[];
  revealedCards: CardData[];
  cardsData: Map<number, CardData>;
} {
  const ids = new Set<number>();
  gameState.players.forEach((player) => {
    player.mainDeck.forEach(id => ids.add(id));
    player.extraDeck.forEach(id => ids.add(id));
    player.sideDeck?.forEach(id => ids.add(id));
  });

  ids.delete(HIDDEN_CARD_ID);
  const revealedCards = gameState.hiddenInfo?.cards ?? [];
  revealedCards.forEach(card => ids.delete(card.id));

  const cardsData = new Map<number, CardData>();
  cardsData.set(HIDDEN_CARD_ID, createHiddenCardData());
  revealedCards.forEach(card => cardsData.set(card.id, card));

  return { ids: Array.from(ids), revealedCards, cardsData };
}

/** Downloads `ids` (through the host's fetchCardsById when given) into `cardsData`. */
export async function fetchCardsInto(
  cardsData: Map<number, CardData>,
  ids: number[],
  fetchCardsById: ((ids: number[]) => Promise<CardData[]>) | undefined,
): Promise<void> {
  if (fetchCardsById) {
    const cardsDataArray = await fetchCardsById(ids);
    cardsDataArray.map(c => cardsData.set(c.id, c));
  } else {
    const cardsResponse = await fetch(`https://api.ygo101.com/cards?ids=${ids.join(",")}`);
    const cardsDataArray = await cardsResponse.json() as CardData[];
    cardsDataArray.map(c => cardsData.set(c.id, c));
  }
}

/** The players' decks with every id replaced by its card data. */
export function buildCorePlayers(gameState: Pick<YGOServerGameStateData, "players">, cardsData: Map<number, CardData>) {
  return gameState.players.map((player) => {
    return {
      name: player.name,
      mainDeck: player.mainDeck.map(id => cardsData.get(id)!),
      extraDeck: player.extraDeck.map(id => cardsData.get(id)!),
      sideDeck: player.sideDeck?.map(id => cardsData.get(id)!) || [],
    };
  });
}
