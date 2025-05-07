import axios from "axios";
import { CacheService } from "./cache-service";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const HTTP = axios.create({
  baseURL: API_URL
});

HTTP.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
      };
    }

    const cardIds = Array.from(ids);
    const allCards = await this.getCardsDataById(cardIds);

    const cardMap = new Map<number, any>(
      allCards.map((card: any) => [card.id, card])
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
    const cacheHits: Record<number, any> = {};
    const cacheMisses: number[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const cached = await CacheService.getCardById(id);
        if (cached) {
          cacheHits[id] = cached;
        } else {
          cacheMisses.push(id);
        }
      })
    );

    let fetchedCards: any[] = [];
    if (cacheMisses.length > 0) {
      const { data } = await HTTP.request({
        url: `/cards?ids=${cacheMisses.join(",")}`,
        method: "GET",
      });

      fetchedCards = data;

      await Promise.all(
        fetchedCards.map((card) => CacheService.saveCardById(card.id, card))
      );
    }

    return [...Object.values(cacheHits), ...fetchedCards];
  }

  static async getReplaysFromDeckId(id: string, signal?: any) {
    const { data } = await HTTP.request({
      url: `/replays/deck/${id}`,
      method: "GET",
      signal
    });

    return data;
  }

  static async saveReplay(replayData: any) {
    const { data } = await HTTP.request({
      url: '/replays',
      method: "POST",
      data: replayData
    });

    return data;
  }
}