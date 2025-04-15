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
import ProbabilityFormula from "./components/ProbabilityFormula";
import OptimalDistribution from "./components/OptimalDistribution";
import HandCategories from "./components/HandCategories";
import EnhancedAnalysis from "./components/EnhancedAnalysis";
import AnalyticsModal from "./AnalyticsModal";
import ProbabilityContent from "./components/ProbabilityContent";
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
      console.log("DEBUG: DeckAnalytics - No analytics data or not visible");
      return null;
    }

    console.log("DEBUG: DeckAnalytics - Raw analytics received:", {
      monsterCount: analytics.monsterCount,
      spellCount: analytics.spellCount,
      trapCount: analytics.trapCount,
      hasEnhanced: !!analytics.archetype && isEnhanced,
    });

    // Return cached data if available and valid
    if (processedAnalyticsCache) {
      console.log(
        "DEBUG: DeckAnalytics - Using cached analytics with monsterCount:",
        processedAnalyticsCache.monsterCount
      );
      logger.debug("Using cached analytics data");
      return processedAnalyticsCache;
    }

    logger.debug("Processing analytics data for UI");
    // Store the processed data in cache for future use
    setProcessedAnalyticsCache(analytics);

    // If enhanced analysis was requested but not available in the data, show loading state
    if (isEnhanced && !analytics.archetype && !isLoading) {
      setIsEnhancedLoading(true);
    } else {
      setIsEnhancedLoading(false);
    }

    return analytics;
  }, [analytics, isVisible, processedAnalyticsCache, isEnhanced, isLoading]);

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

  // Reset caches when deck or analytics change
  useEffect(() => {
    if (isVisible && analytics && analytics !== processedAnalyticsCache) {
      logger.debug("Resetting analytics caches due to data change");
      setProcessedAnalyticsCache(null);
      setDeckMetricsCache(null);
      setIsEnhancedLoading(false);
    }
  }, [isVisible, analytics, processedAnalyticsCache]);

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
      console.log("❌ No deck to analyze");
      return false;
    }

    try {
      // Get the ANALYZER_API_URL from the environment or use the default
      const ANALYZER_API_URL =
        import.meta.env.VITE_ANALYZER_API_URL || "http://localhost:3002/api";

      console.log(
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

      console.log(
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
        return false;
      }

      console.log(`✅ Direct API call to /analyze successful`);
      const data = await response.json();
      console.log(`📋 Received analysis data:`, data);

      // Calculate basic analytics locally to ensure core metrics are always available
      const { analyzeDeck } =
        require("../../hooks/useDeckAnalytics").useDeckAnalytics();
      const localAnalytics = analyzeDeck(deck);

      // Merge the API data with local analytics without checking contents
      const enhancedAnalytics = {
        ...localAnalytics,
        // Just add all fields from the API response
        ...data,
        // Ensure these critical fields from local analytics are preserved
        monsterCount: localAnalytics.monsterCount,
        spellCount: localAnalytics.spellCount,
        trapCount: localAnalytics.trapCount,
        typeDistribution: localAnalytics.typeDistribution,
        attributeDistribution: localAnalytics.attributeDistribution,
        levelDistribution: localAnalytics.levelDistribution,
        potentialArchetypes: localAnalytics.potentialArchetypes,
      };

      // Update processed analytics cache directly
      setProcessedAnalyticsCache(enhancedAnalytics);

      // Update service status as available
      setAnalyzerServiceStatus({
        available: true,
        checked: true,
      });

      console.log("✨ Analytics updated with enhanced data");
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

      return false;
    }
  }, [deck]);

  // Add a timeout to automatically cancel loading state after a certain period
  useEffect(() => {
    if (isEnhancedLoading) {
      console.log("⏱️ Setting up loading timeout");
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }

      // Set a new timeout
      loadingTimeoutRef.current = window.setTimeout(() => {
        console.log("⏰ Enhanced analytics loading timed out");
        setIsEnhancedLoading(false);
        // Only set error status if we're still waiting for enhanced data
        if (isEnhanced && !analyzerServiceStatus.available) {
          setAnalyzerServiceStatus({
            available: false,
            checked: true,
            error:
              "Loading timed out - the analyzer service may be unavailable or experiencing issues",
          });
        }
      }, ENHANCED_ANALYTICS_TIMEOUT);

      return () => {
        // Clean up timeout when component unmounts or loading state changes
        if (loadingTimeoutRef.current) {
          console.log("🧹 Clearing loading timeout");
          window.clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    }
  }, [isEnhancedLoading, isEnhanced, analyzerServiceStatus.available]);

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
      // Clear any existing timeout to prevent false timeout messages
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      setIsEnhancedLoading(true);
      console.log(
        "🚀 Enhanced analysis requested - making direct API call to /analyze endpoint"
      );

      // Make a direct API call to the /analyze endpoint
      const success = await directlyCallAnalyzeEndpoint();

      // Ensure loading state is turned off regardless of API call success/failure
      setIsEnhancedLoading(false);

      if (!success) {
        console.error("❌ Failed to get enhanced analysis data");
        // Don't set enhanced mode if the API call failed
        return;
      }

      // Explicitly set analyzer service as available since we got a successful response
      setAnalyzerServiceStatus({
        available: true,
        checked: true,
      });

      console.log("✅ Successfully received enhanced analysis data");
    } else {
      // If turning off enhanced analysis, clear loading state
      setIsEnhancedLoading(false);
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      console.log("⚠️ Enhanced analysis turned OFF");
    }

    // Clear caches to ensure we get fresh data
    setProcessedAnalyticsCache(null);
    setDeckMetricsCache(null);

    // Update our local state
    setIsEnhanced(newState);

    // Show advanced tab when enabling enhanced analysis to make it obvious
    if (newState) {
      setActiveTab("advanced");
    }

    // Notify parent component to update its state and fetch appropriate analytics
    console.log(
      `🚀 Calling parent's onToggleEnhanced to fetch enhanced analytics with state: ${newState}`
    );
    onToggleEnhanced(newState);

    console.log(`Enhanced analysis toggled to: ${newState ? "ON" : "OFF"}`);
    if (newState) {
      console.log(
        "Analyzer API URL:",
        import.meta.env.VITE_ANALYZER_API_URL || "http://localhost:3002/api"
      );
    }
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

  const renderAdvancedAnalysisContent = () => (
    <div className="full-analysis" id="advanced-analysis-section">
      {/* Show enhanced analysis only in the advanced tab */}
      {isEnhanced && processedAnalytics.archetype && (
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
      {/* Show notice about enhanced analysis if it's enabled but no enhanced data is available */}
      {isEnhanced &&
        !processedAnalytics.archetype &&
        !isEnhancedLoading &&
        analyzerServiceStatus.available && (
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

      <AnalyticsModal
        isOpen={modalContent.isOpen && modalContent.content === "advanced"}
        onClose={closeModal}
        title="Advanced Deck Analysis"
      >
        {renderAdvancedAnalysisContent()}
      </AnalyticsModal>

      <AnalyticsModal
        isOpen={modalContent.isOpen && modalContent.content === "probability"}
        onClose={closeModal}
        title="Probability Analysis"
      >
        {renderProbabilityContent()}
      </AnalyticsModal>
    </div>
  );
};

export default DeckAnalytics;
