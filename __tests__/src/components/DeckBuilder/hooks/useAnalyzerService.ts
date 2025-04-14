import { useState, useCallback } from "react";
import { Deck, DeckAnalytics } from "../types";
import { AnalyzerService } from "../../../services/analyzerService";

/**
 * Hook to interact with the YGO Analyzer Service
 * This provides advanced deck analysis functionality including:
 * - Archetype detection
 * - Strategy analysis
 * - Combo identification
 * - Strengths and weaknesses detection
 */
export function useAnalyzerService() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get the analyzer service instance
  const analyzerService = AnalyzerService.getInstance();

  /**
   * Analyze a deck with the external analyzer service
   */
  const analyzeDeckWithService = useCallback(async (deck: Deck) => {
    setIsLoading(true);
    setError(null);

    try {
      // First ensure analyzer is initialized with card data
      await analyzerService.initialize();

      // Then analyze the deck
      const analysis = await analyzerService.analyzeDeck(deck);

      // Merge the external analysis with our local analysis
      return enhanceLocalAnalytics(deck, analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to analyze deck")
      );
      console.error("Error analyzing deck with service:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get archetype of a deck
   */
  const getDeckArchetype = useCallback(
    async (deck: Deck): Promise<string | null> => {
      try {
        await analyzerService.initialize();
        return await analyzerService.getDeckArchetype(deck);
      } catch (err) {
        console.error("Error getting deck archetype:", err);
        return null;
      }
    },
    []
  );

  /**
   * Get potential combos in a deck
   */
  const getDeckCombos = useCallback(async (deck: Deck): Promise<string[]> => {
    try {
      await analyzerService.initialize();
      return await analyzerService.getDeckCombos(deck);
    } catch (err) {
      console.error("Error getting deck combos:", err);
      return [];
    }
  }, []);

  /**
   * Perform a quick analysis to get basic insights
   */
  const quickAnalyzeDeck = useCallback(async (deck: Deck) => {
    setIsLoading(true);

    try {
      await analyzerService.initialize();
      return await analyzerService.quickAnalyzeDeck(deck);
    } catch (err) {
      console.error("Error with quick analysis:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Combines the local analytics data with the external analysis
   */
  const enhanceLocalAnalytics = (
    deck: Deck,
    externalAnalysis: any
  ): DeckAnalytics => {
    // This would be your existing analytics data
    // We'll add the additional insights from the external analyzer

    // TODO: Implement proper merging with your existing analytics
    return {
      // Base data from external analysis
      archetype: externalAnalysis.archetype || "Unknown",
      strategy: externalAnalysis.strategy || "Unknown",
      mainCombos: externalAnalysis.mainCombos || [],
      strengths: externalAnalysis.strengths || [],
      weaknesses: externalAnalysis.weaknesses || [],
      counters: externalAnalysis.counters || [],
      recommendedTechs: externalAnalysis.recommendedTechs || [],
      confidenceScore: externalAnalysis.confidenceScore || 0,

      // We still maintain the local analytics fields
      typeDistribution: {},
      attributeDistribution: {},
      levelDistribution: {},
      keyCards: [],
      deckSize: deck.mainDeck.length,
      consistencyScore: 0,
      extraDeckSize: deck.extraDeck.length,
      potentialArchetypes: [],
      monsterCount: 0,
      spellCount: 0,
      trapCount: 0,
      mainDeck: [],
    };
  };

  return {
    analyzeDeckWithService,
    getDeckArchetype,
    getDeckCombos,
    quickAnalyzeDeck,
    isLoading,
    error,
  };
}
