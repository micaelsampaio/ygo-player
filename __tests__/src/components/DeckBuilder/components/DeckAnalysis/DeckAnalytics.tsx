import React from "react";
import { Deck, Card } from "../../types";
import { BasicAnalysis } from "./components/BasicAnalysis";
import EnhancedAnalysis from "./components/EnhancedAnalysis";
import "./DeckAnalytics.css";

interface DeckAnalyticsProps {
  analytics: any;
  deck: Deck | null;
  isVisible: boolean;
  isLoading: boolean;
  isEnhanced: boolean;
  onToggleEnhanced: (state: boolean) => void;
  onCardSelect?: (card: Card) => void; // Add card selection handler
}

const DeckAnalytics: React.FC<DeckAnalyticsProps> = ({
  analytics,
  deck,
  isVisible,
  isLoading,
  isEnhanced,
  onToggleEnhanced,
  onCardSelect,
}) => {
  // Early return if no deck or analytics aren't visible
  if (!deck || !isVisible) {
    return null;
  }

  return (
    <div className="deck-analytics-container">
      <div className="analytics-header">
        <h3>Deck Analytics</h3>
        <div className="enhanced-switch">
          <input
            type="checkbox"
            id="enhanced-analysis"
            className="toggle-switch"
            checked={isEnhanced}
            onChange={(e) => onToggleEnhanced(e.target.checked)}
          />
          <label htmlFor="enhanced-analysis">Advanced Analysis</label>
        </div>
      </div>

      {isLoading ? (
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Analyzing your deck...</p>
        </div>
      ) : (
        <>
          <BasicAnalysis analytics={analytics} deck={deck} />
          {isEnhanced && analytics.enhanced && (
            <EnhancedAnalysis 
              analytics={analytics.enhanced} 
              onCardClick={onCardSelect} // Pass the card click handler
            />
          )}
        </>
      )}
    </div>
  );
};

export default DeckAnalytics;