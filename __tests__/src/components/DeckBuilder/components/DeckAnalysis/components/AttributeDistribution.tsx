import React from "react";

const attributeColors: Record<string, string> = {
  DARK: "#673AB7",
  LIGHT: "#FFC107",
  WATER: "#2196F3",
  FIRE: "#F44336",
  EARTH: "#795548",
  WIND: "#4CAF50",
  DIVINE: "#FF9800",
};

interface AttributeDistributionProps {
  distribution: Record<string, number>;
}

const AttributeDistribution: React.FC<AttributeDistributionProps> = ({
  distribution,
}) => (
  <div className="attribute-bubbles">
    {Object.entries(distribution).map(([attribute, count], index) => (
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
    ))}
  </div>
);

export default AttributeDistribution;
