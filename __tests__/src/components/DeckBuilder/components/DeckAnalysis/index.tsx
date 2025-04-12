import React, { useState, useMemo, useEffect, useRef } from "react";
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
import AnalyticsModal from "./AnalyticsModal";
import "./DeckAnalytics.css";
import { Logger } from "../../../../utils/logger";
import { exportDeckAnalysisToPdf } from "../../utils/pdfExport";
import {
  calculateDrawProbability,
  calculateRoleProbability,
} from "../../utils/probabilityUtils";

const logger = Logger.createLogger("DeckAnalyticsUI");

const DeckAnalytics: React.FC<DeckAnalyticsProps> = ({ analytics, deck }) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "advanced" | "probability" | "suggestions"
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
  const [processedAnalytics, setProcessedAnalytics] =
    useState<DeckAnalyticsType | null>(null);

  useEffect(() => {
    if (!analytics) {
      setProcessedAnalytics(null);
      return;
    }

    const processAnalytics = () => {
      requestAnimationFrame(() => {
        setProcessedAnalytics(analytics);
      });
    };

    processAnalytics();
  }, [analytics]);

  const deckMetrics = useMemo(() => {
    if (!processedAnalytics) {
      logger.debug("No analytics data available, using defaults");
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

    logger.debug("Processing analytics data for UI");

    if (processedAnalytics.keyCards && processedAnalytics.keyCards.length > 0) {
      logger.info("Key card probabilities:", processedAnalytics.keyCards);
    }

    return {
      powerUtility: processedAnalytics.powerUtilityRatio,
      comboProbability: processedAnalytics.comboProbability,
      resourceGeneration: processedAnalytics.resourceGeneration,
      drawProbabilities: processedAnalytics.drawProbabilities || [],
      cardEfficiencies: processedAnalytics.cardEfficiencies || [],
    };
  }, [processedAnalytics]);

  const exportAnalytics = () => {
    if (!processedAnalytics) return;

    const data = {
      deckName: "Deck Analysis",
      timestamp: new Date().toISOString(),
      metrics: {
        consistency: processedAnalytics.consistencyScore,
        deckSize: processedAnalytics.deckSize,
        cardDistribution: {
          monsters: processedAnalytics.monsterCount,
          spells: processedAnalytics.spellCount,
          traps: processedAnalytics.trapCount,
        },
        keyCards: processedAnalytics.keyCards,
        archetypes: processedAnalytics.potentialArchetypes,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deck-analytics.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  if (!processedAnalytics) {
    return (
      <div className="deck-analytics loading">
        <h2>Analyzing Deck...</h2>
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

  const calculateOptimalDistribution = (
    totalCards: number,
    targetCards: number,
    desiredProbability: number = 0.85
  ) => {
    const results = [];
    for (let i = 0; i <= Math.min(20, totalCards); i++) {
      const probability = calculateDrawProbability(totalCards, i, 5) / 100;
      results.push({
        copies: i,
        probability: probability,
        isOptimal: i === targetCards,
      });
    }
    return results;
  };

  const renderDistributionGraph = (
    points: Array<{ copies: number; probability: number; isOptimal: boolean }>,
    title: string,
    current: number,
    optimal: number,
    targetPercentage: number
  ) => {
    const optimalPoint = points.find((point) => point.copies === optimal);
    const actualProbability = optimalPoint
      ? optimalPoint.probability * 100
      : targetPercentage;

    return (
      <div className="distribution-graph-container">
        <h4>{title}</h4>
        <div className="graph-wrapper">
          {[0, 20, 40, 60, 80, 100].map((value) => (
            <div
              key={value}
              className="grid-line"
              style={{ bottom: `${value}%` }}
            >
              <span className="grid-line-label">{value}%</span>
            </div>
          ))}

          {points.map((point, index) => (
            <div
              key={index}
              className={`graph-bar ${point.isOptimal ? "optimal" : ""}`}
              style={{
                height: `${point.probability * 100}%`,
                backgroundColor: point.isOptimal ? "#4CAF50" : "#2196F3",
              }}
            >
              <div className="bar-tooltip">
                {point.copies} copies = {(point.probability * 100).toFixed(2)}%
                chance
                {point.isOptimal && " (Optimal)"}
              </div>
            </div>
          ))}

          <div className="y-axis" />
          <div className="x-axis" />

          <div className="axis-labels y-axis-label">Draw Probability (%)</div>
          <div className="axis-labels x-axis-label">
            Number of Copies in Deck
          </div>
        </div>
        <div className="graph-labels">
          <span>
            Target: {optimal} copies (≈ {actualProbability.toFixed(2)}% opening)
          </span>
          <span>Current: {current} copies</span>
        </div>
      </div>
    );
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
      <div className="analytics-section">
        <div className="section-header-with-actions">
          <h3>Advanced Analysis</h3>
          <button className="view-more-btn" onClick={openAdvancedModal}>
            View Full Analysis
          </button>
        </div>
        <p className="section-preview">
          View detailed archetype analysis, attribute distribution, and deck
          performance metrics in the full analysis view.
        </p>
      </div>

      <div className="analytics-section">
        <div className="section-header-with-actions">
          <h3>Advanced Probability Analysis</h3>
          <button className="view-more-btn" onClick={openProbabilityModal}>
            View Probabilities
          </button>
        </div>
        <p className="section-preview">
          View detailed draw probabilities, combo chances, and hand simulation
          results in the full probability view.
        </p>
      </div>
    </>
  );

  const renderAdvancedAnalysisContent = () => (
    <div className="full-analysis" id="advanced-analysis-section">
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
              current={processedAnalytics.monsterCount}
              optimal={7}
              targetPercentage={85}
            />
            <OptimalDistribution
              title="Starter Card Density"
              points={starterDist}
              current={Object.values(groupedCards || [])
                .filter((card: any) => card.roleInfo?.role === "Starter")
                .reduce((sum, card: any) => sum + (card.copies || 0), 0)}
              optimal={13}
              targetPercentage={90}
            />
          </div>

          <div className="distribution-explanation">
            <h4>Insights:</h4>
            <ul>
              <li>
                The optimal number of Normal Summons (7) provides ~85% chance to
                open with at least one, while minimizing brick hands.
              </li>
              <li>
                For consistent combo decks, aim for 12-13 starters to achieve
                ~90% chance of opening with engine cards.
              </li>
              <li>
                Consider your deck's reliance on Normal Summon and adjust
                accordingly. Control decks might run fewer, while combo decks
                often max out.
              </li>
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
        onExport={exportAnalytics}
        onExportPdf={exportToPdf}
        deck={deck}
        analytics={processedAnalytics}
      />
      <div className="tab-content">{renderOverviewTab()}</div>

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
