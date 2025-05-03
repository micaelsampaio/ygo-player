import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const HTTP = axios.create({
  baseURL: API_URL
})

export const EMPTY_ID = "000000000000000000000000";

export class APIService {
  static async getDeckById(deckId: string) {
    const { data } = await HTTP.request({
      url: `/decks/${deckId}`,
      method: "GET",
    });

    return data;
  }

  static isValidId(id: string) {
    return typeof id === "string" && id !== EMPTY_ID
  }

  static async getDeckByIdWithCardsData(deckId: string) {
    const deck = await this.getDeckById(deckId);
    const deckWithCardsData = await this.getDeckFromDeckWithCardIds(deck);
    return deckWithCardsData;
  }

  static async getDeckFromDeckWithCardIds(deck: any) {
    const ids = new Set<number>();
    deck.mainDeck?.forEach((id: number) => ids.add(id));
    deck.extraDeck?.forEach((id: number) => ids.add(id));
    deck.sideDeck?.forEach((id: number) => ids.add(id));

    if (ids.size === 0) {
      return {
        ...deck,
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
      }
    }

    const cardArray = await this.getCardsDataById(Array.from(ids));

    const cardMap = new Map<number, any>(
      cardArray.map((card: any) => [card.id, card])
    );

    const mainDeck = deck.mainDeck.map((id: number) => cardMap.get(id));
    const extraDeck = deck.extraDeck.map((id: number) => cardMap.get(id));
    const sideDeck = deck.sideDeck?.map((id: number) => cardMap.get(id)) || [];

    return {
      ...deck,
      mainDeck,
      extraDeck,
      sideDeck,
    };
  }

  static async getCardsDataById(ids: number[]) {
    const { data } = await HTTP.request({
      url: `/cards?ids=${ids.join(",")}`,
      method: "GET",
    });

    return data;
  }

  static async loadReplaysFromDeckId(id: string, signal?: any) {
    const { data } = await HTTP.request({
      url: `/replays/deck/${id}`,
      method: "GET",
      signal
    });

    return data;
  }
}