import React, { useMemo } from "react";
import { DeckAnalyticsType } from "../types";
import "./DeckComposition.css";

interface DeckCompositionProps {
  analytics: DeckAnalyticsType;
}

const DeckComposition: React.FC<DeckCompositionProps> = ({ analytics }) => {
  // Calculate playsets (cards with 3 copies)
  const playsetInfo = useMemo(() => {
    if (!analytics.keyCards) return { count: 0, percentage: 0 };

    const playsetCards = analytics.keyCards.filter((card) => card.copies === 3);
    const playsetCount = playsetCards.length;
    const uniqueCardsCount = analytics.keyCards.length;

    return {
      count: playsetCount,
      percentage:
        uniqueCardsCount > 0
          ? Math.round((playsetCount / uniqueCardsCount) * 100)
          : 0,
    };
  }, [analytics.keyCards]);

  return (
    <div className="analytics-section">
      <div className="section-header-with-actions">
        <h3>Deck Composition</h3>
      </div>
      <div className="composition-stats">
        <div className="stat-item">
          <span>Monsters</span>
          <span className="stat-value">{analytics.monsterCount} cards</span>
        </div>
        <div className="stat-item">
          <span>Spells</span>
          <span className="stat-value">{analytics.spellCount} cards</span>
        </div>
        <div className="stat-item">
          <span>Traps</span>
          <span className="stat-value">{analytics.trapCount} cards</span>
        </div>
        <div className="stat-item">
          <span>Main Deck</span>
          <span className="stat-value">{analytics.deckSize} cards</span>
        </div>
        <div className="stat-item">
          <span>Extra Deck</span>
          <span className="stat-value">{analytics.extraDeckSize}/15 cards</span>
        </div>
        <div className="stat-item playset-stat">
          <span>Playsets (3x)</span>
          <span className="stat-value">
            {playsetInfo.count} <small>({playsetInfo.percentage}%)</small>
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeckComposition;
