import React from "react";
import { DeckAnalyticsType } from "../types";
import "../styles/EnhancedAnalysis.css";
import { Logger } from "../../../../../utils/logger";
import { Card } from "../../../types";

interface EnhancedAnalysisProps {
  analytics: DeckAnalyticsType;
  onCardClick?: (card: Card) => void;
}

// Interface for card structures in effect categories
interface EffectCategoryCard {
  id: number;
  name: string;
  type: string;
  desc: string;
}

const logger = Logger.createLogger("EnhancedAnalysis");

const EnhancedAnalysis: React.FC<EnhancedAnalysisProps> = ({ analytics, onCardClick }) => {
  const {
    archetype,
    strategy,
    mainCombos,
    strengths,
    weaknesses,
    effectCategories,
    confidenceScore,
  } = analytics;

  // Log the received enhanced data for debugging
  React.useEffect(() => {
    logger.debug("EnhancedAnalysis received data:", {
      hasArchetype: !!archetype,
      archetype,
      strategy,
      hasMainCombos: mainCombos && mainCombos.length > 0,
      mainCombosCount: mainCombos?.length || 0,
      hasStrengths: strengths && strengths.length > 0,
      hasWeaknesses: weaknesses && weaknesses.length > 0,
      hasEffectCategories: !!effectCategories,
    });
  }, [
    archetype,
    strategy,
    mainCombos,
    strengths,
    weaknesses,
    effectCategories,
  ]);

  // Function to group duplicate cards and count them - fixed to work with EffectCategoryCard
  const groupDuplicateCards = (cards: EffectCategoryCard[]): { card: EffectCategoryCard; count: number }[] => {
    if (!cards || cards.length === 0) return [];

    const cardMap = new Map<string, { card: EffectCategoryCard; count: number }>();
    
    cards.forEach(card => {
      // Convert id to string to use as key
      const cardId = String(card.id);
      if (cardMap.has(cardId)) {
        // Increment count for duplicate cards
        const existing = cardMap.get(cardId)!;
        existing.count += 1;
      } else {
        // First occurrence of this card
        cardMap.set(cardId, { card, count: 1 });
      }
    });
    
    // Convert map to array and sort by count (descending) then name
    return Array.from(cardMap.values())
      .sort((a, b) => b.count - a.count || a.card.name.localeCompare(b.card.name));
  };

  // Handle card click - convert EffectCategoryCard to Card
  const handleCardClick = (card: EffectCategoryCard) => {
    if (onCardClick) {
      // Create a Card object from EffectCategoryCard
      const cardForPreview: Card = {
        id: card.id,
        name: card.name,
        type: card.type,
        desc: card.desc,
        race: "",
        card_images: [],
        card_prices: [],
      };
      
      onCardClick(cardForPreview);
      logger.debug(`Card clicked: ${card.name} (ID: ${card.id})`);
    }
  };

  // Only render if we have enhanced analytics data
  if (!archetype && !strategy) {
    logger.debug(
      "EnhancedAnalysis: No archetype or strategy found, not rendering"
    );
    return null;
  }

  const confidencePercentage = confidenceScore
    ? Math.round(confidenceScore * 100)
    : 0;

  return (
    <div className="enhanced-analysis">
      <div className="enhanced-header">
        <h3>Advanced Deck Analysis</h3>
        {confidenceScore && (
          <div className="confidence-score">
            <div className="confidence-label">Analysis Confidence:</div>
            <div className="confidence-meter">
              <div
                className="confidence-fill"
                style={{
                  width: `${confidencePercentage}%`,
                  backgroundColor:
                    confidencePercentage > 80
                      ? "#4CAF50"
                      : confidencePercentage > 50
                      ? "#FFC107"
                      : "#F44336",
                }}
              ></div>
            </div>
            <div className="confidence-value">{confidencePercentage}%</div>
          </div>
        )}
      </div>

      <div className="enhanced-insights">
        <div className="insight-section">
          <h4>Deck Identity</h4>
          <div className="insight-row">
            <div className="insight-label">Archetype:</div>
            <div className="insight-value">{archetype || "Unknown"}</div>
          </div>
          <div className="insight-row">
            <div className="insight-label">Strategy:</div>
            <div className="insight-value">{strategy || "Unknown"}</div>
          </div>
        </div>

        {mainCombos && mainCombos.length > 0 && (
          <div className="insight-section">
            <h4>Main Combos</h4>
            <ul className="insight-list">
              {mainCombos.map((combo, index) => (
                <li key={`combo-${index}`} className="combo-item">
                  {combo}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="insight-columns">
          {strengths && strengths.length > 0 && (
            <div className="insight-column">
              <h4>Deck Strengths</h4>
              <ul className="insight-list strengths-list">
                {strengths.map((strength, index) => (
                  <li key={`strength-${index}`}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {weaknesses && weaknesses.length > 0 && (
            <div className="insight-column">
              <h4>Deck Weaknesses</h4>
              <ul className="insight-list weaknesses-list">
                {weaknesses.map((weakness, index) => (
                  <li key={`weakness-${index}`}>{weakness}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {effectCategories && (
          <div className="insight-section effect-categories-section">
            <h4>Card Effect Categories</h4>
            <div className="card-effect-categories">
              {effectCategories.searchCards &&
                effectCategories.searchCards.length > 0 && (
                  <div className="effect-category">
                    <h5>
                      Search Cards{" "}
                      <span className="card-count">
                        {effectCategories.searchCards.length}
                      </span>
                    </h5>
                    <ul className="category-cards">
                      {groupDuplicateCards(effectCategories.searchCards)
                        .slice(0, 5)
                        .map(({ card, count }, index) => (
                          <li
                            key={`search-${index}`}
                            className="card-item"
                            onClick={() => handleCardClick(card)}
                          >
                            <span className="card-name">{card.name}</span>
                            {count > 1 && <span className="card-copies">×{count}</span>}
                          </li>
                        ))}
                      {effectCategories.searchCards.length > 5 && (
                        <li className="more-cards">
                          +{effectCategories.searchCards.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

              {effectCategories.negateCards &&
                effectCategories.negateCards.length > 0 && (
                  <div className="effect-category">
                    <h5>
                      Negation Cards{" "}
                      <span className="card-count">
                        {effectCategories.negateCards.length}
                      </span>
                    </h5>
                    <ul className="category-cards">
                      {groupDuplicateCards(effectCategories.negateCards)
                        .slice(0, 5)
                        .map(({ card, count }, index) => (
                          <li
                            key={`negate-${index}`}
                            className="card-item"
                            onClick={() => handleCardClick(card)}
                          >
                            <span className="card-name">{card.name}</span>
                            {count > 1 && <span className="card-copies">×{count}</span>}
                          </li>
                        ))}
                      {effectCategories.negateCards.length > 5 && (
                        <li className="more-cards">
                          +{effectCategories.negateCards.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

              {effectCategories.removalCards &&
                effectCategories.removalCards.length > 0 && (
                  <div className="effect-category">
                    <h5>
                      Removal Cards{" "}
                      <span className="card-count">
                        {effectCategories.removalCards.length}
                      </span>
                    </h5>
                    <ul className="category-cards">
                      {groupDuplicateCards(effectCategories.removalCards)
                        .slice(0, 5)
                        .map(({ card, count }, index) => (
                          <li
                            key={`removal-${index}`}
                            className="card-item"
                            onClick={() => handleCardClick(card)}
                          >
                            <span className="card-name">{card.name}</span>
                            {count > 1 && <span className="card-copies">×{count}</span>}
                          </li>
                        ))}
                      {effectCategories.removalCards.length > 5 && (
                        <li className="more-cards">
                          +{effectCategories.removalCards.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

              {effectCategories.lockRestrictionCards &&
                effectCategories.lockRestrictionCards.length > 0 && (
                  <div className="effect-category">
                    <h5>
                      Lock/Restriction Cards{" "}
                      <span className="card-count">
                        {effectCategories.lockRestrictionCards.length}
                      </span>
                    </h5>
                    <ul className="category-cards">
                      {groupDuplicateCards(effectCategories.lockRestrictionCards)
                        .slice(0, 5)
                        .map(({ card, count }, index) => (
                          <li
                            key={`lock-${index}`}
                            className="card-item"
                            onClick={() => handleCardClick(card)}
                          >
                            <span className="card-name">{card.name}</span>
                            {count > 1 && <span className="card-copies">×{count}</span>}
                          </li>
                        ))}
                      {effectCategories.lockRestrictionCards.length > 5 && (
                        <li className="more-cards">
                          +{effectCategories.lockRestrictionCards.length - 5}{" "}
                          more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

              {effectCategories.foolishCards &&
                effectCategories.foolishCards.length > 0 && (
                  <div className="effect-category">
                    <h5>
                      Foolish Burial Effects{" "}
                      <span className="card-count">
                        {effectCategories.foolishCards.length}
                      </span>
                    </h5>
                    <ul className="category-cards">
                      {groupDuplicateCards(effectCategories.foolishCards)
                        .slice(0, 5)
                        .map(({ card, count }, index) => (
                          <li
                            key={`foolish-${index}`}
                            className="card-item"
                            onClick={() => handleCardClick(card)}
                          >
                            <span className="card-name">{card.name}</span>
                            {count > 1 && <span className="card-copies">×{count}</span>}
                          </li>
                        ))}
                      {effectCategories.foolishCards.length > 5 && (
                        <li className="more-cards">
                          +{effectCategories.foolishCards.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

              {effectCategories.setterCards &&
                effectCategories.setterCards.length > 0 && (
                  <div className="effect-category">
                    <h5>
                      Setter Cards{" "}
                      <span className="card-count">
                        {effectCategories.setterCards.length}
                      </span>
                    </h5>
                    <ul className="category-cards">
                      {groupDuplicateCards(effectCategories.setterCards)
                        .slice(0, 5)
                        .map(({ card, count }, index) => (
                          <li
                            key={`setter-${index}`}
                            className="card-item"
                            onClick={() => handleCardClick(card)}
                          >
                            <span className="card-name">{card.name}</span>
                            {count > 1 && <span className="card-copies">×{count}</span>}
                          </li>
                        ))}
                      {effectCategories.setterCards.length > 5 && (
                        <li className="more-cards">
                          +{effectCategories.setterCards.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAnalysis;
