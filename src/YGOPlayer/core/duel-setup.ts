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

/** Where the card data of a server room comes from: what the host injected. */
export interface CardDataSource {
  /** The host's own lookup (preferred). */
  fetchCardsById?: (ids: number[]) => Promise<CardData[]>;
  /** The host's card API base URL: `${apiUrl}/cards?ids=…`. */
  apiUrl?: string;
  /** Sees a failed or impossible download; the duel still loads. */
  onError?: (error: unknown) => void;
}

/** Card data shown for an id whose data could not be downloaded: an unknown card that keeps its id. */
export function createMissingCardData(id: number): CardData {
  return { ...createHiddenCardData(), id };
}

async function downloadCards(ids: number[], source: CardDataSource): Promise<CardData[]> {
  if (source.fetchCardsById) return source.fetchCardsById(ids);
  if (!source.apiUrl) throw new Error(`No card data source: the host gave neither fetchCardsById nor apiUrl, ${ids.length} card(s) unknown`);

  const response = await fetch(`${source.apiUrl.replace(/\/+$/, "")}/cards?ids=${ids.join(",")}`);
  if (!response.ok) throw new Error(`Card data request failed: HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("Card data response is not a list");
  return data as CardData[];
}

/**
 * Downloads `ids` from the host's source into `cardsData`. Nothing is
 * requested when there is nothing to download (a hidden-info room, where
 * every card this client may see so far is already known). It never
 * throws: a failed download is reported to `onError` and the ids it could
 * not get are filled with unknown cards, so the duel still loads.
 */
export async function fetchCardsInto(
  cardsData: Map<number, CardData>,
  ids: number[],
  source: CardDataSource,
): Promise<void> {
  if (ids.length === 0) return;

  try {
    const cardsDataArray = await downloadCards(ids, source);
    cardsDataArray.forEach(c => { if (c && typeof c.id === "number") cardsData.set(c.id, c); });
  } catch (error) {
    try {
      source.onError?.(error);
    } catch {
      // A failing host hook must not break the duel's setup.
    }
  }

  ids.forEach(id => { if (!cardsData.has(id)) cardsData.set(id, createMissingCardData(id)); });
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
