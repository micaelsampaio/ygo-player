import { useState, useCallback } from "react";
import { Deck, DeckAnalytics } from "../types";
import { AnalyzerService } from "../../../services/analyzerService";
// Import the analyzeDeck function directly instead of the hook
import { analyzeDeck as analyzeDecKUtil } from "./useDeckAnalytics";

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

  // Use analyzeDeck directly as a utility function, not a hook
  const enhanceLocalAnalytics = useCallback(
    (deck: Deck, externalAnalysis: any): DeckAnalytics => {
      console.log("🔄 Enhancing local analytics with external data");
      // Calculate basic analytics locally to ensure core metrics are always available
      const localAnalytics = analyzeDecKUtil(deck);

      console.log("✅ Local analytics calculation complete");

      // Check if we received valid enhanced data
      if (!externalAnalysis || !Object.keys(externalAnalysis).length) {
        console.warn("⚠️ No valid external analysis data received");
        return localAnalytics;
      }

      console.log(
        "🏆 Enhanced analysis data available, merging with local analytics"
      );

      // Return merged analytics that preserves ALL local data
      return {
        // Start with ALL fields from local analytics
        ...localAnalytics,

        // Then add enhanced fields from external analysis
        archetype:
          externalAnalysis.archetype || localAnalytics.archetype || "Unknown",
        strategy: externalAnalysis.strategy || "Unknown",
        mainCombos: externalAnalysis.mainCombos || [],
        strengths: externalAnalysis.strengths || [],
        weaknesses: externalAnalysis.weaknesses || [],
        counters: externalAnalysis.counters || [],
        recommendedTechs: externalAnalysis.recommendedTechs || [],
        confidenceScore: externalAnalysis.confidenceScore || 0,
      };
    },
    []
  );

  /**
   * Analyze a deck with the external analyzer service
   */
  const analyzeDeckWithService = useCallback(
    async (deck: Deck) => {
      setIsLoading(true);
      setError(null);

      console.log(
        "🔍 useAnalyzerService.analyzeDeckWithService called with deck:",
        deck.name
      );
      console.log("📤 Sending request to analyzer service...");

      try {
        // First ensure analyzer is initialized with card data
        await analyzerService.initialize();
        console.log("✅ Analyzer service initialized");

        // Then analyze the deck
        console.log("📊 Calling analyzerService.analyzeDeck...");
        const analysis = await analyzerService.analyzeDeck(deck);
        console.log("📈 Received analysis result:", analysis);

        // Merge the external analysis with our local analysis
        return enhanceLocalAnalytics(deck, analysis);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to analyze deck";
        console.error("❌ Error analyzing deck with service:", errorMessage);
        setError(
          err instanceof Error ? err : new Error("Failed to analyze deck")
        );
        return null;
      } finally {
        setIsLoading(false);
        console.log("✓ analyzeDeckWithService completed");
      }
    },
    [enhanceLocalAnalytics, analyzerService]
  );

  /**
   * Get archetype of a deck
   */
  const getDeckArchetype = useCallback(
    async (deck: Deck): Promise<string | null> => {
      console.log("🔍 useAnalyzerService.getDeckArchetype called");
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

  return {
    analyzeDeckWithService,
    getDeckArchetype,
    getDeckCombos,
    quickAnalyzeDeck,
    isLoading,
    error,
  };
}
