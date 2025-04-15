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
  const currentPoint = points.find((point) => point.copies === current);

  const actualProbability = optimalPoint
    ? optimalPoint.probability * 100
    : targetPercentage;

  const currentProbability = currentPoint ? currentPoint.probability * 100 : 0;

  const isBelowTarget = current < optimal;
  const isAboveTarget = current > optimal;

  // Calculate the maximum probability for proper scaling
  const maxProbability = Math.max(...points.map((p) => p.probability));
  const scaleFactor = maxProbability > 0 ? 100 / (maxProbability * 100) : 1;

  return (
    <div className="optimal-card-distribution">
      <h4 className="graph-title">{title}</h4>
      <div
        className="graph-wrapper"
        style={{
          position: "relative",
          height: "250px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: "30px",
          marginBottom: "10px",
          paddingBottom: "5px",
          borderBottom: "2px solid #ccc",
          gap: "2px",
        }}
      >
        {/* Horizontal grid lines for probability scale */}
        {[0, 20, 40, 60, 80, 100].map((value) => (
          <div
            key={value}
            className="grid-line"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: `${value}%`,
              borderBottom:
                value === 0 ? "2px solid #ccc" : "1px dashed #e0e0e0",
              zIndex: 1,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "-42px",
                fontSize: "12px",
                color: "#666",
              }}
            >
              {100 - value}%
            </span>
          </div>
        ))}

        {/* Bar graph with dynamic heights */}
        {points.map((point, index) => {
          const isCurrentPoint = point.copies === current;
          const isOptimalPoint = point.copies === optimal;
          const heightPercentage = Math.min(
            point.probability * 100 * scaleFactor,
            100
          );

          return (
            <div
              key={index}
              className={`graph-bar ${isOptimalPoint ? "optimal" : ""} ${
                isCurrentPoint ? "current" : ""
              } ${point.isOptimal ? "target" : ""}`}
              style={{
                height: `${heightPercentage}%`,
                backgroundColor: isCurrentPoint
                  ? "#ff5722"
                  : isOptimalPoint
                  ? "#3f51b5"
                  : "#2196F3",
                position: "relative",
                flex: "1",
                minWidth: "15px",
                maxWidth: "30px",
                margin: "0 2px",
                borderRadius: "2px 2px 0 0",
                transition: "height 0.3s ease",
              }}
              onMouseOver={(e) => {
                const tooltip = e.currentTarget.querySelector(".bar-tooltip");
                if (tooltip) (tooltip as HTMLElement).style.opacity = "1";
              }}
              onMouseOut={(e) => {
                const tooltip = e.currentTarget.querySelector(".bar-tooltip");
                if (tooltip) (tooltip as HTMLElement).style.opacity = "0";
              }}
            >
              {/* Show indicators for important points */}
              {isCurrentPoint && (
                <div className="current-indicator" style={{ left: "50%" }}>
                  Current ({point.copies})
                </div>
              )}
              {isOptimalPoint && !isCurrentPoint && (
                <div className="target-indicator" style={{ left: "50%" }}>
                  Target ({point.copies})
                </div>
              )}

              {/* Tooltip for bar hover */}
              <div
                className="bar-tooltip"
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "rgba(0,0,0,0.8)",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  opacity: 0,
                  transition: "opacity 0.2s",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                }}
              >
                {point.copies} copies: {(point.probability * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels - showing only some numbers to avoid crowding */}
      <div className="graph-axis">
        {points
          .filter(
            (_, i) =>
              i % Math.ceil(points.length / 7) === 0 || i === points.length - 1
          )
          .map((point) => (
            <div key={point.copies}>{point.copies}</div>
          ))}
      </div>

      {/* Result summary and legend */}
      <div className="graph-legend">
        <div className="legend-item">
          <div className="legend-color legend-target"></div>
          <span>
            Target: {optimal} copies ({actualProbability.toFixed(1)}%)
          </span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-current"></div>
          <span>
            Current: {current} copies ({currentProbability.toFixed(1)}%)
          </span>
        </div>
        {current !== optimal && (
          <div
            className="legend-item"
            style={{
              color: isBelowTarget
                ? "#d32f2f"
                : isAboveTarget
                ? "#ff8f00"
                : "inherit",
            }}
          >
            <span>
              {isBelowTarget
                ? "⬇ Below optimal"
                : isAboveTarget
                ? "⬆ Above optimal"
                : "At optimal"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimalDistribution;
