import React, { useState, useMemo, useEffect } from "react";
import AnalyticsModal from "./AnalyticsModal";
import "./DeckAnalytics.css";
import { Logger } from "../../../../utils/logger";

const logger = Logger.createLogger("DeckAnalyticsUI");

export type DeckAnalyticsType = {
  typeDistribution: Record<string, number>;
  attributeDistribution: Record<string, number>;
  levelDistribution: Record<string, number>;
  keyCards: Array<{ name: string; copies: number; openingProbability: number }>;
  deckSize: number;
  consistencyScore: number;
  extraDeckSize: number;
  potentialArchetypes: Array<{ name: string; count: number }>;
  monsterCount: number;
  spellCount: number;
  trapCount: number;
  drawProbabilities: Array<{
    scenario: string;
    cards: string[];
    copies: number;
    probability: number;
  }>;
  cardEfficiencies: Array<CardEfficiency>;
  powerUtilityRatio: {
    deckStyle: string;
    explanation: string;
    monsterRatio: number;
    spellRatio: number;
    trapRatio: number;
  };
  comboProbability: {
    probability: number;
    explanation: string;
  };
  resourceGeneration: {
    score: number;
    explanation: string;
  };
  mainDeck?: Array<{
    id: string;
    name: string;
    roleInfo?: {
      role: string;
      probability?: number;
    };
  }>;
};

interface CardEfficiency {
  card: { name: string; copies: number; openingProbability: number };
  metrics: {
    overallScore: number;
    consistency: number;
    versatility: number;
    economy: number;
  };
}

interface DeckAnalyticsProps {
  analytics: DeckAnalyticsType | null;
}

const DeckAnalytics: React.FC<DeckAnalyticsProps> = ({ analytics }) => {
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

  const calculateGlobalProbability = (cards: any[]) => {
    // Placeholder function for calculating global probability
    return cards.reduce(
      (acc, card) => acc + (card.roleInfo?.probability || 0),
      0
    );
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

    // For very low probabilities (under 20%), highlight the chance of not drawing
    if (probability < 20) {
      return `${basicFrequency} (Most likely to open with 0 copies, ${(
        100 - probability
      ).toFixed(1)}% chance to not draw any)`;
    }

    // Calculate the most likely number to open with (only for higher probabilities)
    const singleCardProb = probability / totalCopies;
    const mostLikely = Math.round((singleCardProb * 5) / 100);

    return `${basicFrequency} (Most likely to open with ${mostLikely} ${
      mostLikely === 1 ? "copy" : "copies"
    })`;
  };

  const renderOverviewTab = () => (
    <>
      <div className="analytics-section">
        <div className="section-header-with-actions">
          <h3>Deck Composition</h3>
        </div>
        <div className="composition-stats">
          <div className="stat-item">
            <span>Monsters</span>
            <span className="stat-value">
              {processedAnalytics.monsterCount} cards
            </span>
          </div>
          <div className="stat-item">
            <span>Spells</span>
            <span className="stat-value">
              {processedAnalytics.spellCount} cards
            </span>
          </div>
          <div className="stat-item">
            <span>Traps</span>
            <span className="stat-value">
              {processedAnalytics.trapCount} cards
            </span>
          </div>
          <div className="stat-item">
            <span>Main Deck</span>
            <span className="stat-value">
              {processedAnalytics.deckSize} cards
            </span>
          </div>
          <div className="stat-item">
            <span>Extra Deck</span>
            <span className="stat-value">
              {processedAnalytics.extraDeckSize}/15 cards
            </span>
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <h3>Key Cards</h3>
        <div className="key-cards">
          {processedAnalytics.keyCards.slice(0, 3).map((card, index) => {
            const probability = card.openingProbability;

            return (
              <div
                key={index}
                className="key-card-item"
                onMouseEnter={() => setHoveredCard(card.name)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="key-card-header">
                  <div className="key-card-name">{card.name}</div>
                  <div className="key-card-copies">{card.copies}x</div>
                </div>
                <div className="key-card-probability">
                  <div className="probability-bar-container">
                    <div
                      className="probability-bar"
                      style={{
                        width: `${probability}%`,
                        backgroundColor: getProbabilityColor(probability),
                      }}
                    ></div>
                  </div>
                  <div className="probability-percentage">
                    {probability.toFixed(1)}%
                  </div>
                </div>
                <div className="probability-label">
                  Chance to open with this card
                </div>
              </div>
            );
          })}
          {processedAnalytics.keyCards.length > 3 && (
            <div className="more-cards-note">
              + {processedAnalytics.keyCards.length - 3} more key cards
            </div>
          )}
        </div>
      </div>

      <div className="analytics-section">
        <h3>Deck Style</h3>
        <div className="deck-style-analysis">
          <div className="deck-style-header">
            This appears to be a{" "}
            <strong>{deckMetrics.powerUtility.deckStyle}</strong> deck.
          </div>
          <p>{deckMetrics.powerUtility.explanation}</p>

          <div className="deck-ratio-visualization">
            <div className="ratio-bars">
              <div className="ratio-bar-container">
                <div className="ratio-label">Monsters</div>
                <div className="ratio-bar-wrapper">
                  <div
                    className="ratio-bar monster-ratio"
                    style={{
                      width: `${deckMetrics.powerUtility.monsterRatio * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="ratio-value">
                  {(deckMetrics.powerUtility.monsterRatio * 100).toFixed(0)}%
                </div>
              </div>

              <div className="ratio-bar-container">
                <div className="ratio-label">Spells</div>
                <div className="ratio-bar-wrapper">
                  <div
                    className="ratio-bar spell-ratio"
                    style={{
                      width: `${deckMetrics.powerUtility.spellRatio * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="ratio-value">
                  {(deckMetrics.powerUtility.spellRatio * 100).toFixed(0)}%
                </div>
              </div>

              <div className="ratio-bar-container">
                <div className="ratio-label">Traps</div>
                <div className="ratio-bar-wrapper">
                  <div
                    className="ratio-bar trap-ratio"
                    style={{
                      width: `${deckMetrics.powerUtility.trapRatio * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="ratio-value">
                  {(deckMetrics.powerUtility.trapRatio * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>
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
          <h3>Probability Analysis</h3>
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
    <div className="full-analysis">
      <section className="analysis-section">
        <h3>Deck Archetype Analysis</h3>
        <div className="archetype-tags">
          {processedAnalytics.potentialArchetypes.map((archetype, index) => (
            <div key={index} className="archetype-tag">
              {archetype.name}
              <span className="archetype-count">{archetype.count}</span>
            </div>
          ))}
        </div>
        {processedAnalytics.potentialArchetypes.length === 0 && (
          <p>
            No clear archetype detected. This appears to be a custom strategy or
            mixed deck.
          </p>
        )}
      </section>

      <section className="analysis-section">
        <h3>Attribute Distribution</h3>
        <div className="attribute-bubbles">
          {Object.entries(processedAnalytics.attributeDistribution).map(
            ([attribute, count], index) => {
              const attributeColors: Record<string, string> = {
                DARK: "#673AB7",
                LIGHT: "#FFC107",
                WATER: "#2196F3",
                FIRE: "#F44336",
                EARTH: "#795548",
                WIND: "#4CAF50",
                DIVINE: "#FF9800",
              };

              return (
                <div
                  key={index}
                  className="attribute-bubble"
                  style={{
                    backgroundColor: attributeColors[attribute] || "#9E9E9E",
                  }}
                >
                  <div className="attribute-name">{attribute}</div>
                  <div className="attribute-count">{count}</div>
                </div>
              );
            }
          )}
        </div>
      </section>

      <section className="analysis-section">
        <h3>Monster Level Distribution</h3>
        <div className="distribution-chart">
          {Object.entries(processedAnalytics.levelDistribution)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([level, count], index) => (
              <div key={index} className="distribution-bar-container">
                <div className="distribution-label">
                  <span>Level {level}</span>
                  <span>
                    {count} card{count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="distribution-bar-wrapper">
                  <div
                    className="distribution-bar"
                    style={{
                      width: `${
                        (count / processedAnalytics.monsterCount) * 100
                      }%`,
                      backgroundColor: "#FF9800",
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="analysis-section">
        <h3>Performance Metrics</h3>
        <div className="performance-metrics">
          <div
            className="metric-card"
            title="Based on card ratios and deck size"
          >
            <div className="metric-name">Consistency Rating</div>
            <div className="metric-value-container">
              <div className="metric-gauge">
                <div
                  className="gauge-fill"
                  style={{
                    width: `${processedAnalytics.consistencyScore}%`,
                    backgroundColor: getConsistencyColor(
                      processedAnalytics.consistencyScore
                    ),
                  }}
                ></div>
              </div>
              <div className="metric-value">
                {processedAnalytics.consistencyScore.toFixed(0)}/100
              </div>
            </div>
            <div className="metric-explanation">
              Measures how reliably the deck can execute its game plan
            </div>
          </div>

          <div
            className="metric-card"
            title="Probability of opening with key cards"
          >
            <div className="metric-name">Combo Execution</div>
            <div className="metric-value-container">
              <div className="metric-gauge">
                <div
                  className="gauge-fill"
                  style={{
                    width: `${deckMetrics.comboProbability.probability}%`,
                    backgroundColor: getProbabilityColor(
                      deckMetrics.comboProbability.probability
                    ),
                  }}
                ></div>
              </div>
              <div className="metric-value">
                {deckMetrics.comboProbability.probability.toFixed(0)}%
              </div>
            </div>
            <div className="metric-explanation">
              {deckMetrics.comboProbability.explanation}
            </div>
          </div>

          <div
            className="metric-card"
            title="Based on spell count and draw potential"
          >
            <div className="metric-name">Resource Generation</div>
            <div className="metric-value-container">
              <div className="metric-gauge">
                <div
                  className="gauge-fill"
                  style={{
                    width: `${deckMetrics.resourceGeneration.score * 10}%`,
                    backgroundColor:
                      deckMetrics.resourceGeneration.score >= 7
                        ? "#4CAF50"
                        : deckMetrics.resourceGeneration.score >= 5
                        ? "#FFC107"
                        : "#F44336",
                  }}
                ></div>
              </div>
              <div className="metric-value">
                {deckMetrics.resourceGeneration.score.toFixed(1)}/10
              </div>
            </div>
            <div className="metric-explanation">
              {deckMetrics.resourceGeneration.explanation}
            </div>
          </div>
        </div>
      </section>

      <section className="analysis-section tips-section">
        <h3>Improvement Tips</h3>
        <ul className="tips-list">
          {processedAnalytics.monsterCount < 14 && (
            <li>
              Consider adding more monster cards for better field presence.
            </li>
          )}
          {processedAnalytics.spellCount < 10 && (
            <li>
              Adding more spell cards could improve your resource generation.
            </li>
          )}
          {processedAnalytics.trapCount < 5 && (
            <li>
              Including trap cards would provide better disruption options.
            </li>
          )}
          {processedAnalytics.consistencyScore < 70 && (
            <li>
              Increase consistency by adding more copies of your key cards.
            </li>
          )}
          {!Object.entries(processedAnalytics.attributeDistribution).some(
            ([_, count]) => count > 7
          ) && (
            <li>
              Consider focusing on a dominant attribute to leverage
              attribute-specific support cards.
            </li>
          )}
        </ul>
      </section>
    </div>
  );

  const renderProbabilityContent = () => {
    // Group cards only by name, keeping role info
    const groupedCards = processedAnalytics?.mainDeck;

    const calculateRoleProbability = (role: string) => {
      const roleCards = Object.values(groupedCards).filter(
        (card: any) => card.roleInfo?.role === role
      );
      return calculateGlobalProbability(roleCards);
    };

    return (
      <div className="full-probability-analysis">
        <section className="analysis-section">
          <h3>Probability Formula</h3>
          <div className="formula-container">
            <div className="formula">
              P(success) = 1 - C(40-k, n) / C(40, n)
            </div>
            <div className="formula-key">
              <ul>
                <li>
                  <strong>k</strong>: Number of copies of a card
                </li>
                <li>
                  <strong>n</strong>: Number of cards drawn (usually 5 for
                  opening hand)
                </li>
                <li>
                  <strong>C(a,b)</strong>: Combinations of a choose b
                </li>
              </ul>
            </div>
            <p>
              Using hypergeometric distribution to calculate exact probabilities
              in a 40-card deck:
            </p>
            <ul className="probability-examples">
              <li>
                <strong>3 copies</strong>: 33.76% chance to open with at least 1
              </li>
              <li>
                <strong>2 copies</strong>: 23.71% chance to open with at least 1
              </li>
              <li>
                <strong>1 copy</strong>: 12.50% chance to open with it
              </li>
            </ul>
          </div>
        </section>

        <section className="analysis-section">
          <h3>Opening Hand Categories</h3>
          <div className="category-probabilities">
            {Object.values(groupedCards).some(
              (card: any) => card.roleInfo?.role === "Starter"
            ) && (
              <div className="probability-category">
                <h4>Starter Cards</h4>
                <div className="probability-table">
                  <div className="table-header">
                    <div>Card</div>
                    <div>Copies</div>
                    <div>Probability</div>
                  </div>
                  {Object.values(groupedCards)
                    .filter((card: any) => card.roleInfo?.role === "Starter")
                    .map((card: any, index) => (
                      <div key={index} className="table-row">
                        <div>{card.name}</div>
                        <div>{card.copies}</div>
                        <div
                          className="probability-cell"
                          style={{
                            color: getProbabilityColor(
                              card.roleInfo?.probability || 0
                            ),
                          }}
                        >
                          {(card.roleInfo?.probability || 0).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                </div>
                <div className="global-probability">
                  <strong>Global Probability: </strong>
                  {(() => {
                    const probability = calculateRoleProbability("Starter");
                    return (
                      <>
                        {probability.toFixed(1)}% chance to open with at least 1
                        Starter
                        <div className="frequency-text">
                          (
                          {calculateFrequencyText(
                            probability,
                            Object.values(groupedCards)
                              .filter(
                                (card: any) => card.roleInfo?.role === "Starter"
                              )
                              .reduce(
                                (sum, card) => sum + (card.copies || 0),
                                0
                              )
                          )}
                          )
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {Object.values(groupedCards).some(
              (card: any) => card.roleInfo?.role === "Handtrap"
            ) && (
              <div className="probability-category">
                <h4>Hand Traps</h4>
                <div className="probability-table">
                  <div className="table-header">
                    <div>Card</div>
                    <div>Copies</div>
                    <div>Probability</div>
                  </div>
                  {Object.values(groupedCards)
                    .filter((card: any) => card.roleInfo?.role === "Handtrap")
                    .map((card: any, index) => (
                      <div key={index} className="table-row">
                        <div>{card.name}</div>
                        <div>{card.copies}</div>
                        <div
                          className="probability-cell"
                          style={{
                            color: getProbabilityColor(
                              card.roleInfo?.probability || 0
                            ),
                          }}
                        >
                          {(card.roleInfo?.probability || 0).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                </div>
                <div className="global-probability">
                  <strong>Global Probability: </strong>
                  {(() => {
                    const probability = calculateRoleProbability("Handtrap");
                    return (
                      <>
                        {probability.toFixed(1)}% chance to open with at least 1
                        Hand Trap
                        <div className="frequency-text">
                          (
                          {calculateFrequencyText(
                            probability,
                            Object.values(groupedCards)
                              .filter(
                                (card: any) =>
                                  card.roleInfo?.role === "Handtrap"
                              )
                              .reduce(
                                (sum, card) => sum + (card.copies || 0),
                                0
                              )
                          )}
                          )
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {Object.values(groupedCards).some(
              (card: any) => card.roleInfo?.role === "Garnets"
            ) && (
              <div className="probability-category danger">
                <h4>Garnets (Undesirable Draws)</h4>
                <div className="probability-table">
                  <div className="table-header">
                    <div>Card</div>
                    <div>Copies</div>
                    <div>Draw Risk</div>
                  </div>
                  {Object.values(groupedCards)
                    .filter((card: any) => card.roleInfo?.role === "Garnets")
                    .map((card: any, index) => (
                      <div key={index} className="table-row">
                        <div>{card.name}</div>
                        <div>{card.copies}</div>
                        <div
                          className="probability-cell warning"
                          style={{
                            color: getProbabilityColor(
                              100 - (card.roleInfo?.probability || 0)
                            ),
                          }}
                        >
                          {(card.roleInfo?.probability || 0).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                </div>
                <div className="global-probability warning">
                  <strong>Global Draw Risk: </strong>
                  {(() => {
                    const probability = calculateRoleProbability("Garnets");
                    return (
                      <>
                        {probability.toFixed(1)}% chance to open with at least 1
                        Garnet
                        <div className="frequency-text">
                          (
                          {calculateFrequencyText(
                            probability,
                            Object.values(groupedCards)
                              .filter(
                                (card: any) => card.roleInfo?.role === "Garnets"
                              )
                              .reduce(
                                (sum, card) => sum + (card.copies || 0),
                                0
                              )
                          )}
                          )
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="analysis-section">
          <h3>Opening Hand Probabilities</h3>
          {deckMetrics.drawProbabilities &&
          deckMetrics.drawProbabilities.length > 0 ? (
            <div className="probability-table">
              <div className="table-header">
                <div>Scenario</div>
                <div>Cards</div>
                <div>Probability</div>
              </div>
              {deckMetrics.drawProbabilities.map((item, index) => (
                <div key={index} className="table-row">
                  <div>{item.scenario || "Unknown scenario"}</div>
                  <div>
                    {item.copies !== undefined ? item.copies : 0} copies
                  </div>
                  <div
                    className="probability-cell"
                    style={{
                      color: getProbabilityColor(item.probability || 0),
                    }}
                  >
                    {(item.probability !== undefined
                      ? item.probability
                      : 0
                    ).toFixed(1)}
                    %
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No probability data available for this deck.</p>
          )}
        </section>

        <section className="analysis-section">
          <h3>Key Card Efficiency</h3>
          <div className="efficiency-explanation">
            Card efficiency measures how effectively each card contributes to
            your strategy based on multiple factors.
          </div>

          {deckMetrics.cardEfficiencies &&
          deckMetrics.cardEfficiencies.length > 0 ? (
            <div className="efficiency-cards">
              {deckMetrics.cardEfficiencies.map((item, index) => (
                <div key={index} className="efficiency-card">
                  <div className="efficiency-card-header">
                    <div className="card-name">
                      {item.card?.name || "Unknown card"} ({item.card?.copies}x)
                    </div>
                    <div
                      className="efficiency-score"
                      title="Overall efficiency score based on consistency, versatility, and economy"
                    >
                      Score:{" "}
                      {(item.metrics?.overallScore !== undefined
                        ? item.metrics.overallScore
                        : 0
                      ).toFixed(1)}
                      /10
                    </div>
                  </div>
                  <div className="efficiency-metrics">
                    <div className="metric">
                      <div
                        className="metric-label"
                        title="Drawing and accessing the card in your opening hand and throughout the duel"
                      >
                        Consistency
                      </div>
                      <div className="metric-bar-container">
                        <div
                          className="metric-bar"
                          style={{
                            width: `${item.metrics?.consistency || 0}%`,
                            backgroundColor: "#2196F3",
                          }}
                        >
                          <span className="metric-percentage">
                            {(item.metrics?.consistency || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="metric">
                      <div
                        className="metric-label"
                        title="Usefulness in different situations and stages of the game"
                      >
                        Versatility
                      </div>
                      <div className="metric-bar-container">
                        <div
                          className="metric-bar"
                          style={{
                            width: `${item.metrics?.versatility || 0}%`,
                            backgroundColor: "#4CAF50",
                          }}
                        >
                          <span className="metric-percentage">
                            {(item.metrics?.versatility || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="metric">
                      <div
                        className="metric-label"
                        title="How efficiently the card uses deck space relative to its impact"
                      >
                        Economy
                      </div>
                      <div className="metric-bar-container">
                        <div
                          className="metric-bar"
                          style={{
                            width: `${item.metrics?.economy || 0}%`,
                            backgroundColor: "#FF9800",
                          }}
                        >
                          <span className="metric-percentage">
                            {(item.metrics?.economy || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No card efficiency data available for this deck.</p>
          )}
        </section>

        <section className="analysis-section">
          <h3>Consistency Simulation</h3>
          <p>
            The consistency score is based on 1000 simulated opening hands,
            measuring how often your deck can establish a playable game state on
            the first turn.
          </p>
          <div className="consistency-score-display">
            <div
              className="score-circle"
              style={{
                background: `conic-gradient(${getConsistencyColor(
                  processedAnalytics.consistencyScore
                )} ${processedAnalytics.consistencyScore * 3.6}deg, #f0f0f0 ${
                  processedAnalytics.consistencyScore * 3.6
                }deg)`,
              }}
            >
              <div className="score-inner">
                <span>{processedAnalytics.consistencyScore.toFixed(0)}</span>
                <small>/100</small>
              </div>
            </div>
          </div>
          <div className="consistency-tip">
            {processedAnalytics.consistencyScore >= 85
              ? "Excellent consistency! This deck should perform reliably in tournament play."
              : processedAnalytics.consistencyScore >= 70
              ? "Good consistency. This deck will perform well in most games."
              : "Consider improving consistency by adding more copies of key cards."}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="deck-analytics">
      <div className="deck-analytics-header">
        <div className="header-title-section">
          <h2>Deck Analysis</h2>
          <button
            className="export-btn"
            onClick={exportAnalytics}
            title="Export analysis data"
          >
            📊 Export
          </button>
        </div>
      </div>

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
