// AnalyzerApi.ts - Client for the Yu-Gi-Oh deck analyzer API

import axios from "axios";

// Configure API base URLs
const API_BASE_URL =
  import.meta.env.VITE_ANALYZER_API_URL || "http://localhost:3000/api";

// Configure card data URL to use local data service instead of YGOPRODeck
const CARD_DATA_URL =
  import.meta.env.VITE_CARD_DATA_URL || "http://localhost:8081";

/**
 * API client for the Yu-Gi-Oh deck analyzer
 */
export class AnalyzerApi {
  /**
   * Analyze a deck and return comprehensive analysis data
   */
  static async analyzeDeck(deck: any) {
    try {
      const response = await axios.post(`${API_BASE_URL}/analyze`, { deck });
      return response.data;
    } catch (error) {
      console.error("Error analyzing deck:", error);
      throw error;
    }
  }

  /**
   * Get meta analysis data for the current competitive environment
   */
  static async getMetaAnalysis(
    timeframe: "week" | "month" | "season" = "month"
  ) {
    try {
      const response = await axios.get(`${API_BASE_URL}/meta-analysis`, {
        params: { timeframe },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching meta analysis:", error);
      throw error;
    }
  }

  /**
   * Get card replacement suggestions for a specific deck
   */
  static async getCardReplacements(deck: any, weaknesses: string[]) {
    try {
      const response = await axios.post(`${API_BASE_URL}/card-replacements`, {
        deck,
        weaknesses,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching card replacements:", error);
      throw error;
    }
  }

  /**
   * Get deck evolution advice (how to transform the deck into a different archetype)
   */
  static async getDeckEvolutionPath(deck: any, targetArchetype?: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/deck-evolution`, {
        deck,
        targetArchetype,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching deck evolution path:", error);
      throw error;
    }
  }

  /**
   * Get cards by archetype
   */
  static async getCardsByArchetype(archetype: string) {
    try {
      // Use local card data source instead of the analyzer API
      const response = await axios.get(`${CARD_DATA_URL}/cards.json`);
      const cards = response.data.data || [];

      // Filter by archetype locally
      const filteredCards = cards.filter(
        (card: any) => card.archetype?.toLowerCase() === archetype.toLowerCase()
      );

      return { cards: filteredCards };
    } catch (error) {
      console.error("Error fetching cards by archetype:", error);
      throw error;
    }
  }

  /**
   * Search for cards with specific criteria
   */
  static async searchCards(params: {
    name?: string;
    type?: string;
    attribute?: string;
    level?: number;
    atk?: number;
    def?: number;
    archetype?: string;
    description?: string;
  }) {
    try {
      // Use local card data source instead of the analyzer API
      const response = await axios.get(`${CARD_DATA_URL}/cards.json`);
      const cards = response.data.data || [];

      // Filter the cards based on the search parameters
      const filteredCards = cards.filter((card: any) => {
        let match = true;

        if (
          params.name &&
          !card.name.toLowerCase().includes(params.name.toLowerCase())
        ) {
          match = false;
        }

        if (
          params.type &&
          !card.type.toLowerCase().includes(params.type.toLowerCase())
        ) {
          match = false;
        }

        if (
          params.attribute &&
          card.attribute?.toLowerCase() !== params.attribute.toLowerCase()
        ) {
          match = false;
        }

        if (params.level && card.level !== params.level) {
          match = false;
        }

        if (params.atk && card.atk !== params.atk) {
          match = false;
        }

        if (params.def && card.def !== params.def) {
          match = false;
        }

        if (
          params.archetype &&
          (!card.archetype ||
            !card.archetype
              .toLowerCase()
              .includes(params.archetype.toLowerCase()))
        ) {
          match = false;
        }

        if (
          params.description &&
          !card.desc.toLowerCase().includes(params.description.toLowerCase())
        ) {
          match = false;
        }

        return match;
      });

      return { cards: filteredCards };
    } catch (error) {
      console.error("Error searching cards:", error);
      throw error;
    }
  }

  /**
   * Get similar cards to a specific card
   */
  static async getSimilarCards(cardId: number, limit: number = 10) {
    try {
      // First, get all cards from local source
      const response = await axios.get(`${CARD_DATA_URL}/cards.json`);
      const cards = response.data.data || [];

      // Find the reference card
      const referenceCard = cards.find((card: any) => card.id === cardId);

      if (!referenceCard) {
        throw new Error(`Card with ID ${cardId} not found`);
      }

      // Find similar cards based on type, attribute, level, and atk/def range
      const similarCards = cards
        .filter((card: any) => {
          // Don't include the reference card itself
          if (card.id === cardId) return false;

          // Match by card type (Monster, Spell, Trap)
          const sameType = card.type?.includes(
            referenceCard.type?.split(" ")[0]
          );

          // For monster cards, check additional properties
          if (sameType && referenceCard.type?.includes("Monster")) {
            // Similar level (±1)
            const similarLevel =
              !referenceCard.level ||
              !card.level ||
              Math.abs(card.level - referenceCard.level) <= 1;

            // Similar attribute
            const sameAttribute =
              !referenceCard.attribute ||
              card.attribute === referenceCard.attribute;

            // Similar ATK/DEF (±300)
            const similarAtk =
              !referenceCard.atk ||
              !card.atk ||
              Math.abs(card.atk - referenceCard.atk) <= 300;

            const similarDef =
              !referenceCard.def ||
              !card.def ||
              Math.abs(card.def - referenceCard.def) <= 300;

            return similarLevel && sameAttribute && (similarAtk || similarDef);
          }

          return sameType;
        })
        .slice(0, limit);

      return {
        referenceCard,
        similarCards,
      };
    } catch (error) {
      console.error("Error fetching similar cards:", error);
      throw error;
    }
  }

  /**
   * Get top decks from tournaments
   */
  static async getTopDecks(
    count: number = 10,
    timeframe: "week" | "month" | "season" = "month"
  ) {
    try {
      const response = await axios.get(`${API_BASE_URL}/top-decks`, {
        params: { count, timeframe },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching top decks:", error);
      throw error;
    }
  }
}
