import React from "react";
import { DeckAnalyticsType } from "../types";

interface KeyCardsProps {
  keyCards: DeckAnalyticsType["keyCards"];
  onHoverCard: (cardName: string | null) => void;
}

const getProbabilityColor = (probability: number) => {
  if (probability >= 60) return "#4CAF50";
  if (probability >= 30) return "#FFC107";
  return "#F44336";
};

const KeyCards: React.FC<KeyCardsProps> = ({ keyCards, onHoverCard }) => {
  return (
    <div className="analytics-section">
      <h3>Key Cards</h3>
      <div className="key-cards">
        {keyCards.slice(0, 3).map((card, index) => {
          const probability = card.openingProbability;

          return (
            <div
              key={index}
              className="key-card-item"
              onMouseEnter={() => onHoverCard(card.name)}
              onMouseLeave={() => onHoverCard(null)}
            >
              <div className="key-card-header">
                <div className="key-card-name">{card.name}</div>
                <div className="key-card-copies">{card.copies}x</div>
              </div>
              <div className="key-card-probability">
                <div className="probability-bar-container">
                  <div
                    className="probability-bar"
                    style={{
                      width: `${probability}%`,
                      backgroundColor: getProbabilityColor(probability),
                    }}
                  />
                </div>
                <div className="probability-percentage">
                  {probability.toFixed(1)}%
                </div>
              </div>
              <div className="probability-label">
                Chance to open with this card
              </div>
            </div>
          );
        })}
        {keyCards.length > 3 && (
          <div className="more-cards-note">
            + {keyCards.length - 3} more key cards
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyCards;
