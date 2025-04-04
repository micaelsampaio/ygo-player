import React from "react";
import { DeckAnalyticsType } from "../types";

interface HandCategoriesProps {
  groupedCards: any;
  analytics: DeckAnalyticsType;
  getProbabilityColor: (probability: number) => string;
  calculateFrequencyText: (probability: number, totalCopies: number) => string;
  calculateRoleProbability: (
    analytics: DeckAnalyticsType,
    role: string
  ) => number;
}

const HandCategories: React.FC<HandCategoriesProps> = ({
  groupedCards,
  analytics,
  getProbabilityColor,
  calculateFrequencyText,
  calculateRoleProbability,
}) => {
  const renderCategorySection = (
    role: string,
    title: string,
    isDanger = false
  ) => {
    if (
      !Object.values(groupedCards).some(
        (card: any) => card.roleInfo?.role === role
      )
    ) {
      return null;
    }

    return (
      <div className={`probability-category ${isDanger ? "danger" : ""}`}>
        <h4>{title}</h4>
        <div className="probability-table">
          {/* ...existing table structure... */}
          <div className="table-header">
            <div>Card</div>
            <div>Copies</div>
            <div>{isDanger ? "Draw Risk" : "Probability"}</div>
          </div>
          {Object.values(groupedCards)
            .filter((card: any) => card.roleInfo?.role === role)
            .map((card: any, index) => (
              <div key={index} className="table-row">
                <div>{card.name}</div>
                <div>{card.copies}</div>
                <div
                  className={`probability-cell ${isDanger ? "warning" : ""}`}
                  style={{
                    color: getProbabilityColor(
                      isDanger
                        ? 100 - (card.roleInfo?.probability || 0)
                        : card.roleInfo?.probability || 0
                    ),
                  }}
                >
                  {(card.roleInfo?.probability || 0).toFixed(1)}%
                </div>
              </div>
            ))}
        </div>
        {/* ...global probability section... */}
        <div className={`global-probability ${isDanger ? "warning" : ""}`}>
          <strong>
            {isDanger ? "Global Draw Risk: " : "Global Probability: "}
          </strong>
          {(() => {
            const probability = calculateRoleProbability(analytics, role);
            return (
              <>
                {probability.toFixed(1)}% chance to open with at least 1{" "}
                {isDanger ? "Garnet" : role}
                <div className="frequency-text">
                  (
                  {calculateFrequencyText(
                    probability,
                    Object.values(groupedCards)
                      .filter((card: any) => card.roleInfo?.role === role)
                      .reduce((sum, card) => sum + (card.copies || 0), 0)
                  )}
                  )
                </div>
              </>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="category-probabilities">
      {renderCategorySection("Starter", "Starter Cards")}
      {renderCategorySection("Handtrap", "Hand Traps")}
      {renderCategorySection("Garnets", "Garnets (Undesirable Draws)", true)}
    </div>
  );
};

export default HandCategories;
