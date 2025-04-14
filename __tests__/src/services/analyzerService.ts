import { Deck } from "../components/DeckBuilder/types";

// Configuration for analyzer service
const ANALYZER_API_URL =
  import.meta.env.VITE_ANALYZER_API_URL || "http://localhost:3002/api";
const CARD_DATA_URL =
  import.meta.env.VITE_CARD_DATA_URL || "http://localhost:8081";

/**
 * Service for interacting with the YGO Analyzer API
 * This provides advanced deck analysis capabilities including:
 * - Archetype detection
 * - Strategy analysis
 * - Combo identification
 * - Strengths and weaknesses detection
 */
export class AnalyzerService {
  private static instance: AnalyzerService;
  private cardData: any[] | null = null;
  private isInitializing: boolean = false;

  /**
   * Get the singleton instance of the AnalyzerService
   */
  public static getInstance(): AnalyzerService {
    if (!AnalyzerService.instance) {
      AnalyzerService.instance = new AnalyzerService();
    }
    return AnalyzerService.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Initialize the analyzer with card data
   * This needs to be called before any analysis functions
   */
  public async initialize(): Promise<void> {
    if (this.cardData) {
      return; // Already initialized
    }

    if (this.isInitializing) {
      // Wait for initialization to complete if already in progress
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    try {
      this.isInitializing = true;
      console.log("Initializing analyzer service with card data...");

      // Get card data from the local service
      const response = await fetch(`${CARD_DATA_URL}/cards.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch card data: ${response.statusText}`);
      }

      const data = await response.json();
      this.cardData = data;
      console.log(
        `Analyzer service initialized with ${this.cardData.length} cards`
      );
    } catch (error) {
      console.error("Error initializing analyzer:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Analyze a deck to get comprehensive insights
   */
  public async analyzeDeck(deck: Deck): Promise<any> {
    await this.initialize();

    try {
      const response = await fetch(`${ANALYZER_API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deck: this.prepareDeckForAnalysis(deck) }),
      });

      if (!response.ok) {
        throw new Error(`Analyzer API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error analyzing deck:", error);
      throw error;
    }
  }

  /**
   * Get the archetype of a deck
   */
  public async getDeckArchetype(deck: Deck): Promise<string> {
    await this.initialize();

    try {
      const response = await fetch(`${ANALYZER_API_URL}/archetype`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deck: this.prepareDeckForAnalysis(deck) }),
      });

      if (!response.ok) {
        throw new Error(`Analyzer API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.archetype || "Unknown";
    } catch (error) {
      console.error("Error getting deck archetype:", error);
      return "Unknown";
    }
  }

  /**
   * Get potential combos in a deck
   */
  public async getDeckCombos(deck: Deck): Promise<string[]> {
    await this.initialize();

    try {
      const response = await fetch(`${ANALYZER_API_URL}/combos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deck: this.prepareDeckForAnalysis(deck) }),
      });

      if (!response.ok) {
        throw new Error(`Analyzer API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.combos || [];
    } catch (error) {
      console.error("Error getting deck combos:", error);
      return [];
    }
  }

  /**
   * Quickly analyze a deck for basic insights
   */
  public async quickAnalyzeDeck(deck: Deck): Promise<any> {
    await this.initialize();

    try {
      const response = await fetch(`${ANALYZER_API_URL}/quick-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deck: this.prepareDeckForAnalysis(deck) }),
      });

      if (!response.ok) {
        throw new Error(`Analyzer API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error performing quick analysis:", error);
      throw error;
    }
  }

  /**
   * Prepare the deck object for sending to the analyzer API
   */
  private prepareDeckForAnalysis(deck: Deck): any {
    return {
      name: deck.name,
      mainDeck: deck.mainDeck.map((card) => card.id),
      extraDeck: deck.extraDeck.map((card) => card.id),
      sideDeck: deck.sideDeck?.map((card) => card.id) || [],
    };
  }
}
