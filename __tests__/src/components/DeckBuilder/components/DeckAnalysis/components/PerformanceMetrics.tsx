import React from "react";
import { DeckAnalyticsType } from "../types";

interface PerformanceMetricsProps {
  analytics: DeckAnalyticsType;
  deckMetrics?: {
    comboProbability?: { probability: number; explanation: string };
    resourceGeneration?: { score: number; explanation: string };
  };
  getConsistencyColor: (score: number) => string;
  getProbabilityColor: (probability: number) => string;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  analytics,
  deckMetrics = {},
  getConsistencyColor,
  getProbabilityColor,
}) => (
  <div className="performance-metrics">
    <div className="metric-card" title="Based on card ratios and deck size">
      <div className="metric-name">Consistency Rating</div>
      <div className="metric-value-container">
        <div className="metric-gauge">
          <div
            className="gauge-fill"
            style={{
              width: `${analytics.consistencyScore}%`,
              backgroundColor: getConsistencyColor(analytics.consistencyScore),
            }}
          />
        </div>
        <div className="metric-value">
          {analytics.consistencyScore.toFixed(0)}/100
        </div>
      </div>
      <div className="metric-explanation">
        Measures how reliably the deck can execute its game plan
      </div>
    </div>

    <div className="metric-card" title="Probability of opening with key cards">
      <div className="metric-name">Combo Execution</div>
      <div className="metric-value-container">
        <div className="metric-gauge">
          <div
            className="gauge-fill"
            style={{
              width: `${deckMetrics.comboProbability?.probability || 0}%`,
              backgroundColor: getProbabilityColor(
                deckMetrics.comboProbability?.probability || 0
              ),
            }}
          />
        </div>
        <div className="metric-value">
          {(deckMetrics.comboProbability?.probability || 0).toFixed(0)}%
        </div>
      </div>
      <div className="metric-explanation">
        {deckMetrics.comboProbability?.explanation ||
          "Combo data not available"}
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
              width: `${(deckMetrics.resourceGeneration?.score || 0) * 10}%`,
              backgroundColor:
                (deckMetrics.resourceGeneration?.score || 0) >= 7
                  ? "#4CAF50"
                  : (deckMetrics.resourceGeneration?.score || 0) >= 5
                  ? "#FFC107"
                  : "#F44336",
            }}
          />
        </div>
        <div className="metric-value">
          {(deckMetrics.resourceGeneration?.score || 0).toFixed(1)}/10
        </div>
      </div>
      <div className="metric-explanation">
        {deckMetrics.resourceGeneration?.explanation ||
          "Resource data not available"}
      </div>
    </div>
  </div>
);

export default PerformanceMetrics;
