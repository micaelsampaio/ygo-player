import React from "react";
import { DeckAnalyticsType } from "../types";

interface DeckCompositionProps {
  analytics: DeckAnalyticsType;
}

const DeckComposition: React.FC<DeckCompositionProps> = ({ analytics }) => {
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
      </div>
    </div>
  );
};

export default DeckComposition;
