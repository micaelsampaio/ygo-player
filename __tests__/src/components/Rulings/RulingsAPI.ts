import axios from "axios";
import { Logger } from "../../utils/logger";

const logger = Logger.createLogger("RulingsAPI");
// Use the existing environment variable for the API URL
const API_URL = import.meta.env.VITE_ANALYZER_API_URL;

export interface Ruling {
  id: string;
  question: string;
  answer: string;
  relatedCards: Array<{ id: number; name: string }>;
  source: string;
  sourceUrl?: string; // Added source URL field for references
  date: string;
  category: string;
  keywords: string[];
  votes: number;
}

export interface RulingCategory {
  name: string;
  description: string;
  count: number;
}

export class RulingsAPI {
  /**
   * Search for rulings matching the provided query
   */
  static async searchRulings(query: string): Promise<Ruling[]> {
    try {
      const response = await axios.get(`${API_URL}/rulings/search`, {
        params: { query },
      });
      return response.data.rulings;
    } catch (error) {
      logger.error("Error searching rulings:", error);
      throw new Error("Failed to search rulings");
    }
  }

  /**
   * Get rulings for a specific card
   */
  static async getCardRulings(cardId: number): Promise<Ruling[]> {
    try {
      const response = await axios.get(`${API_URL}/rulings/card/${cardId}`);
      return response.data.rulings;
    } catch (error) {
      logger.error(`Error getting rulings for card ${cardId}:`, error);
      throw new Error("Failed to get card rulings");
    }
  }

  /**
   * Get rulings by category
   */
  static async getRulingsByCategory(category: string): Promise<Ruling[]> {
    try {
      const response = await axios.get(
        `${API_URL}/rulings/category/${category}`
      );
      return response.data.rulings;
    } catch (error) {
      logger.error(`Error getting rulings for category ${category}:`, error);
      throw new Error("Failed to get category rulings");
    }
  }

  /**
   * Get all ruling categories
   */
  static async getCategories(): Promise<RulingCategory[]> {
    try {
      const response = await axios.get(`${API_URL}/rulings/categories`);
      return response.data.categories;
    } catch (error) {
      logger.error("Error getting ruling categories:", error);
      throw new Error("Failed to get ruling categories");
    }
  }

  /**
   * Submit a vote for a ruling
   */
  static async voteRuling(rulingId: string, isHelpful: boolean): Promise<void> {
    try {
      await axios.post(`${API_URL}/rulings/${rulingId}/vote`, { isHelpful });
      logger.info(
        `Vote submitted for ruling ${rulingId}: ${
          isHelpful ? "helpful" : "not helpful"
        }`
      );
    } catch (error) {
      logger.error(`Error voting for ruling ${rulingId}:`, error);
      throw new Error("Failed to submit vote");
    }
  }

  /**
   * Generate mock rulings for fallback when API is unavailable
   */
  static getMockRulings(): Ruling[] {
    return [
      {
        id: "1",
        question:
          'How does Missing the Timing work with "When... you can" effects?',
        answer:
          '"When... you can" effects are optional and must activate immediately after their trigger condition. If that condition is fulfilled in the middle of a chain or as part of a cost, the effect misses the timing and cannot be activated.',
        relatedCards: [{ id: 14558127, name: "Ash Blossom & Joyous Spring" }],
        source: "Official Rulebook",
        sourceUrl: "https://www.yugioh-card.com/en/rulebook/",
        date: "2023-05-10",
        category: "missing-timing",
        keywords: ["missing timing", "when effects", "optional effects"],
        votes: 120,
      },
      {
        id: "2",
        question:
          "Can I activate multiple copies of Called by the Grave on the same turn?",
        answer:
          'Yes, Called by the Grave does not have a "once per turn" restriction, so you can activate multiple copies in the same turn. Each copy can target a different monster in your opponent\'s GY.',
        relatedCards: [{ id: 24224830, name: "Called by the Grave" }],
        source: "Card Ruling Database",
        sourceUrl: "https://db.ygorganization.com/card/24224830",
        date: "2023-08-15",
        category: "effect-activation",
        keywords: ["once per turn", "called by the grave", "hand trap"],
        votes: 87,
      },
      {
        id: "3",
        question:
          "What's the difference between negating an activation and negating an effect?",
        answer:
          "Negating an activation means the card or effect is not considered to have activated at all - it doesn't go on the chain and any costs are refunded. Negating an effect means the activation still occurred but the effects don't resolve properly. Costs remain paid even if the effect is negated.",
        relatedCards: [],
        source: "Judge Program",
        sourceUrl: "https://yugiohblog.konami.com/articles/?p=4514",
        date: "2023-03-22",
        category: "chain-resolution",
        keywords: ["negate activation", "negate effect", "chain resolution"],
        votes: 203,
      },
      {
        id: "4",
        question:
          "Can monsters be Tribute Summoned in face-up Defense Position?",
        answer:
          "No. Normal Summons and Tribute Summons can only place monsters in face-up Attack Position or face-down Defense Position. To place a monster in face-up Defense Position, you need a card effect that allows it.",
        relatedCards: [],
        source: "Official Rulebook",
        sourceUrl: "https://www.yugioh-card.com/en/rulebook/",
        date: "2022-11-05",
        category: "summon",
        keywords: ["tribute summon", "defense position", "normal summon"],
        votes: 65,
      },
      {
        id: "5",
        question:
          "How does damage calculation work when a monster attacks a face-down monster?",
        answer:
          "When a monster attacks a face-down Defense Position monster, the face-down monster is flipped face-up during the Flip Step of the Damage Step, before damage calculation. Effects that trigger on flip are not activated until after damage calculation.",
        relatedCards: [],
        source: "Judge Program",
        sourceUrl: "https://yugiohblog.konami.com/articles/?p=2947",
        date: "2023-01-17",
        category: "damage-calculation",
        keywords: ["damage step", "flip effects", "attack", "face-down"],
        votes: 91,
      },
    ];
  }
}
