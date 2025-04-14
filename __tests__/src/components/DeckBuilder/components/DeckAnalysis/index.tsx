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
import "./DeckAnalytics.css";
import { Logger } from "../../../../utils/logger";
import { exportDeckAnalysisToPdf } from "../../utils/pdfExport";
import {
  calculateDrawProbability,
  calculateRoleProbability,
} from "../../utils/probabilityUtils";

const logger = Logger.createLogger("DeckAnalyticsUI");

const DeckAnalytics: React.FC<DeckAnalyticsProps> = ({
  analytics,
  deck,
  isVisible,
  isLoading = false,
  isEnhanced = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "advanced" | "probability"
  >("overview");

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

  // Only process analytics when the tab is visible and when not already cached
  const processedAnalytics = useMemo(() => {
    // Skip processing if component isn't visible or no analytics data
    if (!isVisible || !analytics) return null;

    // Return cached data if available and valid
    if (processedAnalyticsCache) {
      logger.debug("Using cached analytics data");
      return processedAnalyticsCache;
    }

    logger.debug("Processing analytics data for UI");
    // Store the processed data in cache for future use
    setProcessedAnalyticsCache(analytics);
    return analytics;
  }, [analytics, isVisible, processedAnalyticsCache]);

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
    }
  }, [isVisible, analytics, processedAnalyticsCache]);

  // Initialize calculations once when tab becomes visible and data is available
  useEffect(() => {
    if (isVisible && analytics && !isInitialized) {
      logger.debug("Initializing analytics calculations");
      setIsInitialized(true);
    }
  }, [isVisible, analytics, isInitialized]);

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
    []
  );

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

  if (!isVisible) {
    // Return null or an empty placeholder when not visible to prevent rendering
    return null;
  }

  if (isLoading) {
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

  const openAdvancedModal = () => {
    setModalContent({
      isOpen: true,
      title: "Advanced Deck Analysis",
      content: "advanced",
    });
  };

  const openProbabilityModal = () => {
    setModalContent({
      isOpen: true,
      title: "Detailed Probability Analysis",
      content: "probability",
    });
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
        {/* Show enhanced analysis if available */}
        {isEnhanced && processedAnalytics.archetype && (
          <EnhancedAnalysis analytics={processedAnalytics} />
        )}

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
      {/* If enhanced analysis is available, show it at the top of the advanced view as well */}
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
    // Only calculate probability distributions when needed for this view
    const groupedCards = processedAnalytics?.mainDeck;
    const deckSize = processedAnalytics?.deckSize || 40;

    const normalSummonDist = calculateOptimalDistribution(deckSize, 7);
    const starterDist = calculateOptimalDistribution(deckSize, 13);

    return (
      <div
        className="full-probability-analysis"
        id="probability-analysis-section"
      >
        <section className="analysis-section">
          <h3>Probability Formula</h3>
          <ProbabilityFormula />
        </section>

        <section className="analysis-section">
          <h3>Optimal Card Distribution Analysis</h3>
          <div className="distribution-graphs">
            <OptimalDistribution
              title="Normal Summon Density"
              points={normalSummonDist}
              current={Object.values(groupedCards || [])
                .filter((card: any) =>
                  card.roleInfo?.roles?.includes("NormalSummon")
                )
                .reduce((sum, card: any) => sum + (card.copies || 0), 0)}
              optimal={Math.round((7 / 40) * deckSize)}
              targetPercentage={85}
            />
            <OptimalDistribution
              title="Starter Card Density"
              points={starterDist}
              current={Object.values(groupedCards || [])
                .filter((card: any) =>
                  card.roleInfo?.roles?.includes("Starter")
                )
                .reduce((sum, card: any) => sum + (card.copies || 0), 0)}
              optimal={Math.round((13 / 40) * deckSize)}
              targetPercentage={90}
            />
          </div>

          <div className="distribution-explanation">
            <h4>Insights:</h4>
            <ul>
              {/* Normal Summon Insight */}
              <li>
                The optimal number of Normal Summons (
                {Math.round((7 / 40) * deckSize)}) provides ~
                {normalSummonDist.find(
                  (p) => p.copies === Math.round((7 / 40) * deckSize)
                )?.probability
                  ? (
                      normalSummonDist.find(
                        (p) => p.copies === Math.round((7 / 40) * deckSize)
                      )!.probability * 100
                    ).toFixed(2)
                  : "61.84"}
                % chance to open with at least one in a {deckSize}-card deck,
                while minimizing brick hands.
              </li>

              {/* Starter Cards Insight */}
              <li>
                For consistent combo decks, aim for{" "}
                {Math.round((13 / 40) * deckSize)}-
                {Math.round((14 / 40) * deckSize)} starters to achieve ~
                {starterDist.find(
                  (p) => p.copies === Math.round((13 / 40) * deckSize)
                )?.probability
                  ? (
                      starterDist.find(
                        (p) => p.copies === Math.round((13 / 40) * deckSize)
                      )!.probability * 100
                    ).toFixed(2)
                  : "88.45"}
                % chance of opening with at least one starter card.
              </li>

              {/* Current deck stats */}
              <li>
                Your {deckSize}-card deck currently has{" "}
                {(() => {
                  const normalSummons = Object.values(groupedCards || [])
                    .filter((card: any) =>
                      card.roleInfo?.roles?.includes("NormalSummon")
                    )
                    .reduce((sum, card: any) => sum + (card.copies || 0), 0);
                  const starters = Object.values(groupedCards || [])
                    .filter((card: any) =>
                      card.roleInfo?.roles?.includes("Starter")
                    )
                    .reduce((sum, card: any) => sum + (card.copies || 0), 0);
                  const monsterCount = processedAnalytics.monsterCount;
                  const deckPercentage = Math.round(
                    (monsterCount / deckSize) * 100
                  );

                  return (
                    <>
                      <span>
                        {monsterCount} monsters ({deckPercentage}%),{" "}
                      </span>
                      <span>
                        {normalSummons}{" "}
                        <span
                          style={{
                            color:
                              normalSummons > Math.round((9 / 40) * deckSize)
                                ? "#FF9800"
                                : "inherit",
                            fontWeight:
                              normalSummons > Math.round((9 / 40) * deckSize)
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {normalSummons > Math.round((9 / 40) * deckSize)
                            ? "(high) "
                            : ""}
                        </span>
                        normal summons, and{" "}
                      </span>
                      <span>
                        {starters}{" "}
                        <span
                          style={{
                            color:
                              starters > Math.round((16 / 40) * deckSize)
                                ? "#FF9800"
                                : "inherit",
                            fontWeight:
                              starters > Math.round((16 / 40) * deckSize)
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {starters > Math.round((16 / 40) * deckSize)
                            ? "(high) "
                            : ""}
                        </span>
                        starter cards.
                      </span>
                    </>
                  );
                })()}
              </li>

              {/* Warning for high ratios */}
              {(() => {
                const normalSummons = Object.values(groupedCards || [])
                  .filter((card: any) =>
                    card.roleInfo?.roles?.includes("NormalSummon")
                  )
                  .reduce((sum, card: any) => sum + (card.copies || 0), 0);

                const starters = Object.values(groupedCards || [])
                  .filter((card: any) =>
                    card.roleInfo?.roles?.includes("Starter")
                  )
                  .reduce((sum, card: any) => sum + (card.copies || 0), 0);

                const hasHighRatios =
                  normalSummons > Math.round((9 / 40) * deckSize) ||
                  starters > Math.round((16 / 40) * deckSize);

                if (hasHighRatios) {
                  return (
                    <li style={{ color: "#d32f2f" }}>
                      <strong>Warning:</strong> The high density values shown in
                      <span style={{ color: "#FF9800" }}> orange</span> indicate
                      you may be overconsistent, which can lead to drawing
                      duplicate cards that cannot be properly utilized
                      (especially with normal summons or without discard
                      mechanics).
                    </li>
                  );
                }
                return null;
              })()}
            </ul>
          </div>
        </section>

        <section className="analysis-section">
          <h3>Opening Hand Categories</h3>
          <HandCategories
            groupedCards={groupedCards}
            analytics={processedAnalytics}
            getProbabilityColor={getProbabilityColor}
            calculateFrequencyText={calculateFrequencyText}
            calculateRoleProbability={calculateRoleProbability}
          />
        </section>
      </div>
    );
  };

  return (
    <div className="deck-analytics">
      <Header
        onExport={() => {}} // Remove export data functionality
        onExportPdf={exportToPdf}
        deck={deck}
        analytics={processedAnalytics}
        isEnhanced={isEnhanced}
      />

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
