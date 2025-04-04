import React from "react";

interface OptimalDistributionProps {
  title: string;
  points: Array<{ copies: number; probability: number; isOptimal: boolean }>;
  current: number;
  optimal: number;
  targetPercentage: number;
}

const OptimalDistribution: React.FC<OptimalDistributionProps> = ({
  title,
  points,
  current,
  optimal,
  targetPercentage,
}) => {
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
        <div className="axis-labels x-axis-label">Number of Copies in Deck</div>
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

export default OptimalDistribution;
