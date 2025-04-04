import React from "react";

interface LevelDistributionProps {
  distribution: Record<string, number>;
  monsterCount: number;
}

const LevelDistribution: React.FC<LevelDistributionProps> = ({
  distribution,
  monsterCount,
}) => (
  <div className="distribution-chart">
    {Object.entries(distribution)
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
                width: `${(count / monsterCount) * 100}%`,
                backgroundColor: "#FF9800",
              }}
            />
          </div>
        </div>
      ))}
  </div>
);

export default LevelDistribution;
