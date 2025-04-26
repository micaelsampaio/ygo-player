import React from "react";
import { DeckAnalyticsType } from "../types";
import "../styles/EnhancedAnalysis.css";
import { Logger } from "../../../../../utils/logger";

interface EnhancedAnalysisProps {
  analytics: DeckAnalyticsType;
}

const logger = Logger.createLogger("EnhancedAnalysis");

const EnhancedAnalysis: React.FC<EnhancedAnalysisProps> = ({ analytics }) => {
  const {
    archetype,
    strategy,
    mainCombos,
    strengths,
    weaknesses,
    counters,
    recommendedTechs,
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
    });
  }, [archetype, strategy, mainCombos, strengths, weaknesses]);

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
      </div>
    </div>
  );
};

export default EnhancedAnalysis;
