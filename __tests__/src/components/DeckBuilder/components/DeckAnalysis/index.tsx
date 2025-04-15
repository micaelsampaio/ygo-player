import React, { useState, useMemo, useEffect, useCallback } from "react";
import { DeckAnalyticsType, DeckAnalyticsProps } from "./types";
import Header from "./components/Header";
import DeckComposition from "./components/DeckComposition";
import KeyCards from "./components/KeyCards";
import DeckStyle from "./components/DeckStyle";
import PerformanceMetrics from "./components/PerformanceMetrics";
import ArchetypeAnalysis from "./components/ArchetypeAnalysis";
import AttributeDistribution from "./components/AttributeDistribution";
import LevelDistribution from "./components/LevelDistribution";
import ImprovementTips from "./components/ImprovementTips";
import EnhancedAnalysis from "./components/EnhancedAnalysis";
import AnalyticsTab from "./components/AnalyticsTab";
import ProbabilityContent from "./components/ProbabilityContent";
import { useDeckAnalytics } from "../../hooks/useDeckAnalytics";
import "./styles/DeckAnalytics.css";
import { Logger } from "../../../../utils/logger";
import { exportDeckAnalysisToPdf } from "../../utils/pdfExport";
import {
  calculateDrawProbability,
  calculateRoleProbability,
} from "../../utils/probabilityUtils";

const logger = Logger.createLogger("DeckAnalyticsUI");

// Add a timeout constant for the enhanced analytics loading
const ENHANCED_ANALYTICS_TIMEOUT = 10000; // 10 seconds timeout

const DeckAnalytics: React.FC<DeckAnalyticsProps> = ({
  analytics,
  deck,
  isVisible,
  isLoading = false,
  isEnhanced: initialEnhancedState = false,
  onToggleEnhanced = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "advanced" | "probability"
  >("overview");

  // Use the useDeckAnalytics hook at the top level of the component
  const { analyzeDeck } = useDeckAnalytics();

  // Use the parent's enhanced state directly
  const [isEnhanced, setIsEnhanced] = useState<boolean>(initialEnhancedState);
  // Track if we're waiting for enhanced analytics to load
  const [isEnhancedLoading, setIsEnhancedLoading] = useState<boolean>(false);

  const [modalContent, setModalContent] = useState<{
    isOpen: boolean;
    title: string;
    content: "advanced" | "probability" | null;
  }>({
    isOpen: false,
    title: "",
    content: null,
  });

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [processedAnalyticsCache, setProcessedAnalyticsCache] =
    useState<any>(null);
  const [deckMetricsCache, setDeckMetricsCache] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Add a new state to track analyzer service availability
  const [analyzerServiceStatus, setAnalyzerServiceStatus] = useState<{
    available: boolean;
    checked: boolean;
    error?: string;
  }>({ available: false, checked: false });

  // Add a timeout ID ref for cleaning up the timeout
  const loadingTimeoutRef = React.useRef<number | null>(null);

  // Only process analytics when the tab is visible and when not already cached
  const processedAnalytics = useMemo(() => {
    // Skip processing if component isn't visible or no analytics data
    if (!isVisible || !analytics) {
      logger.debug("DEBUG: DeckAnalytics - No analytics data or not visible");
      return null;
    }

    // Log incoming data
    logger.debug("DEBUG: DeckAnalytics - Raw analytics received:", {
      monsterCount: analytics.monsterCount,
      spellCount: analytics.spellCount,
      trapCount: analytics.trapCount,
      hasArchetype: !!analytics.archetype,
      archetype: analytics.archetype,
      hasEnhanced: !!analytics.archetype && isEnhanced,
    });

    // Check if we have enhanced data in the cache that needs to be preserved
    if (
      processedAnalyticsCache &&
      isEnhanced &&
      processedAnalyticsCache.archetype &&
      processedAnalyticsCache.mlEnhanced === true
    ) {
      logger.debug(
        "Preserving enhanced data from cache while updating analytics"
      );

      // Merge new analytics with the enhanced data we want to preserve
      // But DON'T update the state here - that's causing the infinite loop
      return {
        ...analytics,
        archetype: processedAnalyticsCache.archetype,
        strategy: processedAnalyticsCache.strategy,
        mainCombos: processedAnalyticsCache.mainCombos || [],
        strengths: processedAnalyticsCache.strengths || [],
        weaknesses: processedAnalyticsCache.weaknesses || [],
        counters: processedAnalyticsCache.counters || [],
        recommendedTechs: processedAnalyticsCache.recommendedTechs || [],
        confidenceScore: processedAnalyticsCache.confidenceScore,
        mlEnhanced: true,
      };
    }

    // Return cached data if available and valid
    if (processedAnalyticsCache) {
      logger.debug(
        "DEBUG: DeckAnalytics - Using cached analytics with monsterCount:",
        processedAnalyticsCache.monsterCount
      );
      logger.debug("Using cached analytics data");

      // If we have cached data with enhanced analytics, explicitly stop loading
      if (isEnhancedLoading && processedAnalyticsCache.archetype) {
        logger.debug("Enhanced data found in cache, stopping loading state");
        setIsEnhancedLoading(false);
      }

      return processedAnalyticsCache;
    }

    logger.debug("Processing analytics data for UI");

    // Check if analytics already has enhanced data
    if (isEnhanced && analytics.archetype) {
      // If we already have enhanced data, make sure we're not in loading state
      setIsEnhancedLoading(false);
      logger.debug("Enhanced data already present in analytics");
    } else {
      setIsEnhancedLoading(false);
    }

    // Important: Don't update state inside useMemo - just return the value
    return analytics;
  }, [
    analytics,
    isVisible,
    processedAnalyticsCache,
    isEnhanced,
    isLoading,
    isEnhancedLoading,
  ]);

  // Only calculate deck metrics when analytics are processed and not already cached
  const deckMetrics = useMemo(() => {
    // Skip calculations if component isn't visible
    if (!isVisible || !processedAnalytics) {
      return {
        powerUtility: {
          deckStyle: "Unknown",
          explanation: "",
          monsterRatio: 0,
          spellRatio: 0,
          trapRatio: 0,
        },
        comboProbability: { probability: 0, explanation: "" },
        resourceGeneration: { score: 0, explanation: "" },
        drawProbabilities: [],
        cardEfficiencies: [],
      };
    }

    // Return cached metrics if available
    if (deckMetricsCache) {
      logger.debug("Using cached deck metrics");
      return deckMetricsCache;
    }

    logger.info("Calculating deck metrics from analytics data");

    if (processedAnalytics.keyCards && processedAnalytics.keyCards.length > 0) {
      logger.info("Key card probabilities:", processedAnalytics.keyCards);
    }

    const newMetrics = {
      powerUtility: processedAnalytics.powerUtilityRatio,
      comboProbability: processedAnalytics.comboProbability,
      resourceGeneration: processedAnalytics.resourceGeneration,
      drawProbabilities: processedAnalytics.drawProbabilities || [],
      cardEfficiencies: processedAnalytics.cardEfficiencies || [],
    };

    // Store the metrics in cache for future use
    setDeckMetricsCache(newMetrics);
    return newMetrics;
  }, [isVisible, processedAnalytics, deckMetricsCache]);

  // Reset caches when deck or analytics change - but preserve enhanced data when needed
  useEffect(() => {
    // Skip if not visible or no analytics
    if (!isVisible || !analytics) return;

    // Skip if cache is the same object as analytics (prevents infinite update)
    if (processedAnalyticsCache === analytics) return;

    // Important: Skip if we're comparing a merged analytics object we created
    // with our exact analytics input object - this breaks the infinite loop
    if (
      processedAnalyticsCache &&
      analytics !== processedAnalyticsCache &&
      isEnhanced &&
      processedAnalyticsCache.mlEnhanced
    ) {
      // Only update if we don't already have enhanced data in the merged analytics
      const needsUpdate =
        !processedAnalyticsCache.archetype ||
        processedAnalyticsCache.monsterCount !== analytics.monsterCount ||
        processedAnalyticsCache.spellCount !== analytics.spellCount ||
        processedAnalyticsCache.trapCount !== analytics.trapCount;

      if (needsUpdate) {
        logger.debug("Analytics changed but preserving enhanced data");

        // Create a merged version with new analytics but preserved enhanced data
        const mergedAnalytics = {
          ...analytics,
          // Keep the enhanced data fields
          archetype: processedAnalyticsCache.archetype,
          strategy: processedAnalyticsCache.strategy,
          mainCombos: processedAnalyticsCache.mainCombos || [],
          strengths: processedAnalyticsCache.strengths || [],
          weaknesses: processedAnalyticsCache.weaknesses || [],
          counters: processedAnalyticsCache.counters || [],
          recommendedTechs: processedAnalyticsCache.recommendedTechs || [],
          confidenceScore: processedAnalyticsCache.confidenceScore,
          mlEnhanced: true,
        };

        // Update cache with merged data
        setProcessedAnalyticsCache(mergedAnalytics);
      }
    } else if (analytics !== processedAnalyticsCache) {
      // Normal behavior - reset caches when analytics object changes
      // and we don't have enhanced data to preserve
      logger.debug("Resetting analytics caches due to data change");
      setProcessedAnalyticsCache(null);
      setDeckMetricsCache(null);
    }

    // Always reset loading state
    setIsEnhancedLoading(false);
  }, [isVisible, analytics, processedAnalyticsCache, isEnhanced]);

  // Initialize calculations once when tab becomes visible and data is available
  useEffect(() => {
    if (isVisible && analytics && !isInitialized) {
      logger.debug("Initializing analytics calculations");
      setIsInitialized(true);
    }
  }, [isVisible, analytics, isInitialized]);

  // Update internal state when prop changes
  useEffect(() => {
    setIsEnhanced(initialEnhancedState);
  }, [initialEnhancedState]);

  // Add a function to directly call the analyze endpoint without health check
  const directlyCallAnalyzeEndpoint = useCallback(async () => {
    if (!deck) {
      logger.debug("❌ No deck to analyze");
      setIsEnhancedLoading(false); // Ensure loading is stopped if there's no deck
      return false;
    }

    try {
      // Get the ANALYZER_API_URL from the environment or use the default
      const ANALYZER_API_URL =
        import.meta.env.VITE_ANALYZER_API_URL || "http://localhost:3002/api";

      logger.debug(
        `📡 Making direct API call to ${ANALYZER_API_URL}/analyze...`
      );

      // Prepare deck payload
      const payload = {
        deck: {
          name: deck.name,
          mainDeck: deck.mainDeck.map((card) => card.id),
          extraDeck: deck.extraDeck.map((card) => card.id),
          sideDeck: deck.sideDeck?.map((card) => card.id) || [],
        },
      };

      logger.debug(
        `Sending deck: ${deck.name} with ${payload.deck.mainDeck.length} main cards`
      );

      // Make the API request
      const response = await fetch(`${ANALYZER_API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(
          `❌ API error: ${response.status} ${response.statusText}`
        );
        // Update service status to show it's not available
        setAnalyzerServiceStatus({
          available: false,
          checked: true,
          error: `API error: ${response.status} ${response.statusText}`,
        });

        setIsEnhancedLoading(false); // Always ensure loading is stopped
        return false;
      }

      logger.debug(`✅ Direct API call to /analyze successful`);
      const data = await response.json();
      logger.debug(`📋 Received analysis data:`, data);

      // Calculate basic analytics locally to ensure core metrics are always available
      const localAnalytics = analyzeDeck(deck);

      // Log the state of the received data to debug
      logger.debug("Enhanced data properties from API:", {
        hasArchetype: !!data.archetype,
        archetype: data.archetype,
        strategy: data.strategy,
        hasMainCombos: !!(data.mainCombos && data.mainCombos.length > 0),
      });

      // Create a new object first with the local analytics
      const enhancedAnalytics = {
        ...localAnalytics,

        // Explicitly assign all enhanced fields
        archetype: data.archetype || null,
        strategy: data.strategy || null,
        mainCombos: data.mainCombos || [],
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        counters: data.counters || [],
        recommendedTechs: data.recommendedTechs || [],
        confidenceScore: data.confidenceScore || 0,

        // Preserve local analytics metrics that shouldn't be overwritten
        monsterCount: localAnalytics.monsterCount,
        spellCount: localAnalytics.spellCount,
        trapCount: localAnalytics.trapCount,
        typeDistribution: localAnalytics.typeDistribution,
        attributeDistribution: localAnalytics.attributeDistribution,
        levelDistribution: localAnalytics.levelDistribution,
        potentialArchetypes: localAnalytics.potentialArchetypes,
      };

      // Add a special flag to track enhanced data
      enhancedAnalytics.mlEnhanced = true;

      // Log what the merged data looks like
      logger.debug("Enhanced analytics after merging:", {
        hasArchetype: !!enhancedAnalytics.archetype,
        archetype: enhancedAnalytics.archetype,
        strategy: enhancedAnalytics.strategy,
        hasMainCombos: !!(
          enhancedAnalytics.mainCombos &&
          enhancedAnalytics.mainCombos.length > 0
        ),
      });

      // Update processed analytics cache directly with the enhanced data
      // This is a critical step that ensures the enhanced data is available immediately
      setProcessedAnalyticsCache(null); // First clear the cache

      // Then set the new data immediately (no setTimeout) to ensure the data is available
      setProcessedAnalyticsCache(enhancedAnalytics);

      // Update service status as available
      setAnalyzerServiceStatus({
        available: true,
        checked: true,
      });

      // Immediately cancel loading state since we have the data now
      setIsEnhancedLoading(false);

      logger.debug("✨ Analytics updated with enhanced data");

      return true;
    } catch (error) {
      console.error("❌ Error making direct API call:", error);

      // Update service status to show it's not available
      setAnalyzerServiceStatus({
        available: false,
        checked: true,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error calling /analyze",
      });

      // Explicitly stop loading on error
      setIsEnhancedLoading(false);

      return false;
    }
  }, [deck, analyzeDeck]);

  // Probability calculations - only perform these when needed for specific views
  const calculateOptimalDistribution = useCallback(
    (
      totalCards: number,
      targetCards: number,
      desiredProbability: number = 0.85
    ) => {
      logger.debug(`Calculating optimal distribution for ${targetCards} cards`);
      // Scale target cards based on deck size
      const scaledTarget = Math.round((targetCards / 40) * totalCards);
      const results = [];
      for (let i = 0; i <= Math.min(20, totalCards); i++) {
        const probability = calculateDrawProbability(totalCards, i, 5) / 100;
        results.push({
          copies: i,
          probability: probability,
          isOptimal: i === scaledTarget,
        });
      }
      return results;
    },
    [calculateDrawProbability]
  );

  // Toggle enhanced mode handler - notify parent
  const handleToggleEnhanced = useCallback(async () => {
    // If already in loading state, don't allow multiple toggles
    if (isEnhancedLoading) return;

    const newState = !isEnhanced;

    // Update loading state if turning on enhanced analysis
    if (newState) {
      setIsEnhancedLoading(true);
      logger.debug(
        "🚀 Enhanced analysis requested - making direct API call to /analyze endpoint"
      );

      try {
        // Make a direct API call to the /analyze endpoint
        const success = await directlyCallAnalyzeEndpoint();

        if (!success) {
          console.error("❌ Failed to get enhanced analysis data");
          setIsEnhancedLoading(false);
          return;
        }

        // Now we need to make sure the component knows about the new data
        // Update our local state - this is critical!
        setIsEnhanced(newState);

        // Update the parent component state
        logger.debug(
          `🚀 Calling parent's onToggleEnhanced to fetch enhanced analytics with state: ${newState}`
        );
        onToggleEnhanced(newState);

        logger.debug(
          "✅ Successfully received and applied enhanced analysis data"
        );
      } catch (error) {
        console.error("❌ Error in handleToggleEnhanced:", error);
        setIsEnhancedLoading(false);
      } finally {
        // The loading state is set to false in directlyCallAnalyzeEndpoint
        // but we'll set it here again as a safeguard
        setIsEnhancedLoading(false);
      }
    } else {
      // If turning off enhanced analysis
      logger.debug("⚠️ Enhanced analysis turned OFF");

      // Update our local state
      setIsEnhanced(newState);

      // Notify parent component to update its state
      logger.debug(
        `🚀 Calling parent's onToggleEnhanced with state: ${newState}`
      );
      onToggleEnhanced(newState);
    }

    // Only clear cache when turning enhanced mode OFF
    if (!newState) {
      setProcessedAnalyticsCache(null);
      setDeckMetricsCache(null);
    }

    // Show advanced tab when enabling enhanced analysis to make it obvious
    if (newState) {
      setActiveTab("advanced");
    }

    logger.debug(`Enhanced analysis toggled to: ${newState ? "ON" : "OFF"}`);
  }, [
    isEnhanced,
    isEnhancedLoading,
    onToggleEnhanced,
    setActiveTab,
    directlyCallAnalyzeEndpoint,
  ]);

  const exportToPdf = () => {
    if (!processedAnalytics || !deck) return;

    // Pass the render functions to avoid opening modals
    exportDeckAnalysisToPdf(
      deck,
      processedAnalytics,
      {
        includeAdvancedAnalysis: true,
        includeProbabilityAnalysis: true,
        customFileName: `${deck.name}_deck_analysis.pdf`,
      },
      {
        renderAdvancedAnalysisContent: renderAdvancedAnalysisContent,
        renderProbabilityContent: renderProbabilityContent,
      }
    );
  };

  // Add a debug effect to track enhanced data changes
  useEffect(() => {
    if (isEnhanced && !isEnhancedLoading && processedAnalytics) {
      // This will show up in React DevTools
      logger.debug("Enhanced data state updated:", {
        hasArchetype: !!processedAnalytics?.archetype,
        archetype: processedAnalytics?.archetype,
        strategy: processedAnalytics?.strategy,
        hasMainCombos: !!(processedAnalytics?.mainCombos?.length > 0),
      });
    }
  }, [isEnhanced, isEnhancedLoading, processedAnalytics]);

  // New effect to handle preserving enhanced data in cache when needed
  useEffect(() => {
    if (
      isEnhanced &&
      processedAnalytics &&
      processedAnalytics.archetype &&
      !processedAnalytics.mlEnhanced
    ) {
      // If we have enhanced data that isn't marked as mlEnhanced, update the cache to mark it
      logger.debug("Updating cache with enhanced data flag");

      const enhancedData = {
        ...processedAnalytics,
        mlEnhanced: true,
      };

      setProcessedAnalyticsCache(enhancedData);
    }
  }, [isEnhanced, processedAnalytics]);

  // Update UI to show the enhanced analytics section is loading
  const isAnalyticsLoading = isLoading || isEnhancedLoading;

  if (!isVisible) {
    // Return null or an empty placeholder when not visible to prevent rendering
    return null;
  }

  if (isAnalyticsLoading && !processedAnalytics) {
    return (
      <div className="deck-analytics loading">
        <h2>Analyzing Deck...</h2>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!processedAnalytics) {
    return (
      <div className="deck-analytics loading">
        <h2>No analytics available</h2>
      </div>
    );
  }

  const getConsistencyColor = (score: number) => {
    if (score >= 85) return "#4CAF50";
    if (score >= 70) return "#FFC107";
    return "#F44336";
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 60) return "#4CAF50";
    if (probability >= 30) return "#FFC107";
    return "#F44336";
  };

  const closeModal = () => {
    setModalContent((prev) => ({ ...prev, isOpen: false }));
  };

  const calculateFrequencyText = (
    probability: number,
    totalCopies: number
  ): string => {
    const basicFrequency =
      probability >= 100
        ? "Guaranteed to open at least 1"
        : `Opening at least 1 in every ${Math.max(
            1,
            Math.round(100 / probability)
          )} games`;

    if (probability < 20) {
      return `${basicFrequency} (Most likely to open with 0 copies, ${(
        100 - probability
      ).toFixed(1)}% chance to not draw any)`;
    }

    const singleCardProb = probability / totalCopies;
    const mostLikely = Math.round((singleCardProb * 5) / 100);

    return `${basicFrequency} (Most likely to open with ${mostLikely} ${
      mostLikely === 1 ? "copy" : "copies"
    })`;
  };

  const renderOverviewTab = () => (
    <>
      <div id="basic-analysis-section">
        <DeckComposition analytics={processedAnalytics} />
        <DeckStyle powerUtility={deckMetrics.powerUtility} />
        <KeyCards
          keyCards={processedAnalytics.keyCards}
          onHoverCard={setHoveredCard}
        />
      </div>
    </>
  );

  const renderAdvancedAnalysisContent = () => {
    // Log what data is available when rendering advanced analysis
    if (isEnhanced && processedAnalytics) {
      logger.debug("Rendering advanced analysis content with:", {
        hasArchetype: !!processedAnalytics.archetype,
        archetype: processedAnalytics.archetype,
        hasStrengths: !!(
          processedAnalytics.strengths &&
          processedAnalytics.strengths.length > 0
        ),
        hasWeaknesses: !!(
          processedAnalytics.weaknesses &&
          processedAnalytics.weaknesses.length > 0
        ),
      });
    }

    return (
      <div className="full-analysis" id="advanced-analysis-section">
        {/* Show enhanced analysis only in the advanced tab */}
        {isEnhanced && processedAnalytics && processedAnalytics.archetype && (
          <section className="analysis-section enhanced-section">
            <EnhancedAnalysis analytics={processedAnalytics} />
          </section>
        )}

        <section className="analysis-section">
          <h3>Deck Archetype Analysis</h3>
          <ArchetypeAnalysis
            archetypes={processedAnalytics.potentialArchetypes}
          />
        </section>

        <section className="analysis-section">
          <h3>Attribute Distribution</h3>
          <AttributeDistribution
            distribution={processedAnalytics.attributeDistribution}
          />
        </section>

        <section className="analysis-section">
          <h3>Monster Level Distribution</h3>
          <LevelDistribution
            distribution={processedAnalytics.levelDistribution}
            monsterCount={processedAnalytics.monsterCount}
          />
        </section>

        <section className="analysis-section">
          <h3>Performance Metrics</h3>
          <PerformanceMetrics
            analytics={processedAnalytics}
            deckMetrics={deckMetrics}
            getConsistencyColor={getConsistencyColor}
            getProbabilityColor={getProbabilityColor}
          />
        </section>

        <section className="analysis-section tips-section">
          <h3>Improvement Tips</h3>
          <ImprovementTips analytics={processedAnalytics} />
        </section>
      </div>
    );
  };

  const renderProbabilityContent = () => {
    return (
      <ProbabilityContent
        processedAnalytics={processedAnalytics}
        calculateOptimalDistribution={calculateOptimalDistribution}
        getProbabilityColor={getProbabilityColor}
        calculateFrequencyText={calculateFrequencyText}
        calculateRoleProbability={calculateRoleProbability}
      />
    );
  };

  return (
    <div className="deck-analytics">
      <Header
        onExport={() => {}}
        onExportPdf={exportToPdf}
        deck={deck}
        analytics={processedAnalytics}
        isEnhanced={isEnhanced}
        onToggleEnhanced={handleToggleEnhanced}
        isLoading={isEnhancedLoading}
      />
      {/* Show notice about enhanced analysis only if it's enabled, not loading, data available but no archetype found */}
      {isEnhanced &&
        !isEnhancedLoading &&
        processedAnalytics &&
        (!processedAnalytics.archetype ||
          processedAnalytics.archetype === "") && (
          <div className="enhanced-notice">
            <div className="notice-content warning">
              <span className="notice-icon">⚠️</span>
              <span>
                Enhanced analysis data is not available for this deck.
              </span>
            </div>
          </div>
        )}

      <div className="analytics-navigation">
        <button
          className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`nav-tab ${activeTab === "advanced" ? "active" : ""}`}
          onClick={() => setActiveTab("advanced")}
        >
          Advanced
        </button>
        <button
          className={`nav-tab ${activeTab === "probability" ? "active" : ""}`}
          onClick={() => setActiveTab("probability")}
        >
          Probability
        </button>
      </div>

      {/* Show loading state inside tab content when enhanced loading is in progress */}
      {isEnhancedLoading && (
        <div className="enhanced-loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading enhanced analysis data...</p>
        </div>
      )}

      <div className="tab-content">
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "advanced" && renderAdvancedAnalysisContent()}
        {activeTab === "probability" && renderProbabilityContent()}
      </div>

      <AnalyticsTab
        isOpen={modalContent.isOpen && modalContent.content === "advanced"}
        onClose={closeModal}
        title="Advanced Deck Analysis"
      >
        {renderAdvancedAnalysisContent()}
      </AnalyticsTab>

      <AnalyticsTab
        isOpen={modalContent.isOpen && modalContent.content === "probability"}
        onClose={closeModal}
        title="Probability Analysis"
      >
        {renderProbabilityContent()}
      </AnalyticsTab>
    </div>
  );
};

export default DeckAnalytics;
