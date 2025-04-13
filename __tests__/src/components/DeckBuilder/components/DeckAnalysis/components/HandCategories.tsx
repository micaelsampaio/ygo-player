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
  // Helper function to check if a card has a specific role
  const cardHasRole = (card: any, role: string) => {
    return card.roleInfo?.roles?.includes(role);
  };

  const renderCategorySection = (
    role: string,
    title: string,
    isDanger = false
  ) => {
    // Check if there are any cards with this role
    if (
      !Object.values(groupedCards).some((card: any) => cardHasRole(card, role))
    ) {
      return null;
    }

    // Calculate total copies for this role
    const totalCopies = Object.values(groupedCards)
      .filter((card: any) => cardHasRole(card, role))
      .reduce((sum, card: any) => sum + (card.copies || 0), 0);

    // Calculate probability for this role
    const probability = calculateRoleProbability(analytics, role);

    // Calculate how many games until you draw one (e.g., "1 in 4 games")
    const drawFrequency = Math.max(1, Math.round(100 / probability));

    // Calculate most likely number to open with - fixed logic
    let mostLikelyAmount = 0;
    // If probability is below 40%, it's more likely to open with 0 copies
    if (probability < 40) {
      mostLikelyAmount = 0;
    } else if (totalCopies <= 3) {
      // For 3 or fewer copies, most likely to open with 1 if probability is decent
      mostLikelyAmount = 1;
    } else if (probability >= 80) {
      // For high probability with many copies, might open with 2
      mostLikelyAmount = 2;
    } else {
      // Default to 1 for moderate probabilities
      mostLikelyAmount = 1;
    }

    // Generate improved frequency text
    let frequencyText = "";
    if (probability >= 100) {
      frequencyText = "Guaranteed to open with at least 1";
    } else if (probability > 0) {
      if (mostLikelyAmount === 0) {
        frequencyText = `Opening at least 1 in every ${drawFrequency} games (Most likely to open with 0 copies, ${(
          100 - probability
        ).toFixed(1)}% chance to not draw any)`;
      } else {
        frequencyText = `Opening at least 1 in every ${drawFrequency} games (Most likely to open with ${mostLikelyAmount} ${
          mostLikelyAmount === 1 ? "copy" : "copies"
        })`;
      }
    } else {
      frequencyText = "Will not open with any copies";
    }

    return (
      <div className={`probability-category ${isDanger ? "danger" : ""}`}>
        <h4>{title}</h4>
        <div className="probability-table">
          <div className="table-header">
            <div>Card</div>
            <div>Copies</div>
            <div>{isDanger ? "Draw Risk" : "Probability"}</div>
          </div>
          {Object.values(groupedCards)
            .filter((card: any) => cardHasRole(card, role))
            .sort(
              (a: any, b: any) =>
                isDanger
                  ? (a.roleInfo?.probability || 0) -
                    (b.roleInfo?.probability || 0) // Sort garnets by ascending probability (less likely first)
                  : (b.roleInfo?.probability || 0) -
                    (a.roleInfo?.probability || 0) // Sort others by descending probability (most likely first)
            )
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
        <div className={`global-probability ${isDanger ? "warning" : ""}`}>
          <strong>
            {isDanger ? "Global Draw Risk: " : "Global Probability: "}
          </strong>
          {probability.toFixed(1)}% chance to open with at least 1{" "}
          {isDanger ? "Garnet" : role}
          <div className="frequency-text">({frequencyText})</div>
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
