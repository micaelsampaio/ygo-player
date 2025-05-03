import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const HTTP = axios.create({
  baseURL: API_URL
})

export class APIService {
  static async getDeckById(deckId: string) {
    const { data } = await HTTP.request({
      url: `/decks/${deckId}`,
      method: "GET",
    });

    return data;
  }

  static async getDeckByIdWithCardsData(deckId: string) {
    const deck = await this.getDeckById(deckId);

    const ids = new Set<number>();
    deck.mainDeck.forEach((id: number) => ids.add(id));
    deck.extraDeck.forEach((id: number) => ids.add(id));
    deck.sideDeck?.forEach((id: number) => ids.add(id));

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
}