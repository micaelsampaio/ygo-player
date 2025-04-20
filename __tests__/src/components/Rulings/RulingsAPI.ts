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
      const response = await fetch(
        `${API_URL}/rulings/search?query=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data.rulings;
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
      const response = await fetch(`${API_URL}/rulings/card/${cardId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data.rulings;
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
      const response = await fetch(`${API_URL}/rulings/category/${category}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data.rulings;
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
      const response = await fetch(`${API_URL}/rulings/categories`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data.categories;
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
      const response = await fetch(`${API_URL}/rulings/${rulingId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isHelpful }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
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
      {
        id: "6",
        question:
          "Can I chain multiple Quick-Play Spell Cards in the same chain?",
        answer:
          "Yes, you can chain as many Quick-Play Spell Cards as you want, as long as they meet their activation requirements. This includes chaining multiple copies of the same Quick-Play Spell Card if it doesn't have any once-per-turn restrictions.",
        relatedCards: [],
        source: "Official Rulebook",
        sourceUrl: "https://www.yugioh-card.com/en/rulebook/",
        date: "2023-02-22",
        category: "chain-resolution",
        keywords: ["quick-play", "spell card", "chain", "activation"],
        votes: 152,
      },
      {
        id: "7",
        question:
          "How do 'If this card is sent to the GY' effects work with cards like Macro Cosmos?",
        answer:
          "If a card with an effect that triggers 'If this card is sent to the GY' would be sent to the GY while Macro Cosmos is applying, the monster is banished instead and its effect cannot activate because the condition of being sent to the GY was not met.",
        relatedCards: [
          { id: 30241314, name: "Macro Cosmos" },
          { id: 40044918, name: "Elemental HERO Stratos" },
        ],
        source: "Card Ruling Database",
        sourceUrl: "https://db.ygorganization.com/card/30241314",
        date: "2023-01-05",
        category: "card-interactions",
        keywords: ["graveyard", "banish", "trigger effect", "macro cosmos"],
        votes: 175,
      },
      // Card Text Problem-Solving Card Text (PSCT) rulings
      {
        id: "8",
        question:
          "What is Problem-Solving Card Text (PSCT) and why is it important?",
        answer:
          "Problem-Solving Card Text (PSCT) is a standardized way of writing card text introduced in 2011 to make card effects clearer and more consistent. It uses specific punctuation and phrasing to indicate timing, costs, and effects. Understanding PSCT helps players correctly interpret card effects and resolve them properly during gameplay.",
        relatedCards: [],
        source: "Official Konami Article",
        sourceUrl:
          "https://www.yugioh-card.com/en/play/problem-solving-card-text/",
        date: "2023-04-12",
        category: "card-text-psct",
        keywords: ["psct", "card text", "interpretation", "punctuation"],
        votes: 245,
      },
      {
        id: "9",
        question:
          "What's the difference between a colon (:) and a semicolon (;) in card text?",
        answer:
          "In Problem-Solving Card Text, a colon (:) indicates an activation condition followed by an effect. When you see a colon, the effect activates and creates a chain link. A semicolon (;) separates an activation condition and cost from an effect. Text before the semicolon happens when you activate the effect, and text after it happens when the effect resolves. Both colon and semicolon indicate that an effect starts a chain.",
        relatedCards: [
          { id: 24224830, name: "Called by the Grave" },
          { id: 59438930, name: "Pot of Desires" },
        ],
        source: "PSCT Guide",
        sourceUrl: "https://yugiohblog.konami.com/articles/?p=4514",
        date: "2023-05-23",
        category: "card-text-psct",
        keywords: [
          "psct",
          "punctuation",
          "colon",
          "semicolon",
          "activation",
          "cost",
        ],
        votes: 312,
      },
      {
        id: "10",
        question: "What does 'and if you do' mean in card text?",
        answer:
          "'And if you do' means both actions happen simultaneously—they're considered to be happening at the same time. If one action can't happen, the other still does. For example, with \"Destroy that monster, and if you do, draw 1 card\", you'll draw a card even if the monster becomes unable to be destroyed due to an effect like Indestructible armor.",
        relatedCards: [
          { id: 44095762, name: "Mirror Force" },
          { id: 10045474, name: "Infinite Impermanence" },
        ],
        source: "Card Ruling Database",
        sourceUrl: "https://db.ygorganization.com/",
        date: "2023-06-14",
        category: "card-text-psct",
        keywords: [
          "psct",
          "and if you do",
          "simultaneous effects",
          "conjunction",
        ],
        votes: 198,
      },
      {
        id: "11",
        question:
          "What's the difference between 'then' and 'also' in card text?",
        answer:
          "'Then' indicates that the second action happens after the first and only if the first action was successful. If the first action doesn't happen completely, the second won't happen at all. 'Also' means the second effect happens regardless of whether the first one was successful or not. Both actions are part of the same effect resolution.",
        relatedCards: [],
        source: "Official Rulebook Appendix",
        sourceUrl: "https://www.yugioh-card.com/en/rulebook/",
        date: "2023-03-17",
        category: "card-text-psct",
        keywords: ["psct", "then", "also", "sequential effects", "conjunction"],
        votes: 173,
      },
      {
        id: "12",
        question: "What does 'after this effect resolves' mean in card text?",
        answer:
          "'After this effect resolves' means the specified action happens immediately after the current chain link has completely resolved, but before moving on to resolve the next chain link (if any). This is not part of the effect itself but a separate action that doesn't start a chain. For example, 'After this effect resolves, you can Special Summon 1 monster from your hand' means you first resolve the entire effect, then decide if you want to Special Summon.",
        relatedCards: [
          { id: 24094653, name: "Polymerization" },
          { id: 6172122, name: "Red-Eyes Fusion" },
        ],
        source: "PSCT Guide",
        sourceUrl: "https://yugiohblog.konami.com/articles/?p=4514",
        date: "2023-07-05",
        category: "card-text-psct",
        keywords: [
          "psct",
          "after this effect resolves",
          "chain resolution",
          "timing",
        ],
        votes: 205,
      },
      {
        id: "13",
        question: "What does '(Quick Effect)' mean in monster effect text?",
        answer:
          "'(Quick Effect)' indicates that a monster effect can be activated during either player's turn, at any point when a fast effect can be activated (similar to Quick-Play Spells or Trap Cards). Quick Effects can be chained to other effects and can be activated in response to another action. For example, 'During either player's turn (Quick Effect): You can discard this card; negate the activation of a Spell Card' means you can activate this effect during either player's turn, even during a chain.",
        relatedCards: [
          { id: 59438930, name: "Ash Blossom & Joyous Spring" },
          { id: 14558127, name: "Ghost Ogre & Snow Rabbit" },
        ],
        source: "PSCT Guide",
        sourceUrl: "https://yugiohblog.konami.com/articles/?p=4514",
        date: "2023-02-18",
        category: "card-text-psct",
        keywords: [
          "psct",
          "quick effect",
          "fast effect",
          "monster effect",
          "chain",
        ],
        votes: 267,
      },
      {
        id: "14",
        question:
          "What's the difference between 'target' and effects that don't use the word 'target'?",
        answer:
          "When a card effect uses the word 'target', it means you must select the target(s) at activation time, before the effect resolves. Cards that protect against targeting ('cannot be targeted') will prevent these effects. Effects that don't use the word 'target' select what they affect at resolution time, bypassing 'cannot be targeted' protections. For example, 'Target 1 monster; destroy it' requires selecting the target at activation, while 'Destroy 1 monster on the field' chooses at resolution.",
        relatedCards: [
          { id: 44095762, name: "Mirror Force" },
          { id: 40044918, name: "Elemental HERO Stratos" },
        ],
        source: "Official Rulebook",
        sourceUrl: "https://www.yugioh-card.com/en/rulebook/",
        date: "2023-04-29",
        category: "card-text-psct",
        keywords: [
          "psct",
          "target",
          "targeting",
          "protection",
          "effect resolution",
        ],
        votes: 341,
      },
    ];
  }
}
