import React from "react";
import { Card } from "../types";
import { determineCardArchetypes, getCardPlayStyle } from "../utils";
import { getCardImageUrl } from "../../../utils/cardImages";

interface CardPreviewProps {
  card: Card;
  onClose: () => void;
  onAddCard: (card: Card) => void;
}

const CardPreview: React.FC<CardPreviewProps> = ({
  card,
  onClose,
  onAddCard,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{card.name}</h2>
          <button
            className="modal-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="card-preview-container">
            <div className="preview-image-large">
              <img
                src={getCardImageUrl(card)}
                alt={card.name}
                className="preview-image"
              />
            </div>

            <div className="preview-details-large">
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{card.type}</span>
              </div>

              {card.attribute && (
                <div className="detail-row">
                  <span className="detail-label">Attribute:</span>
                  <span className="detail-value">{card.attribute}</span>
                </div>
              )}

              {card.race && (
                <div className="detail-row">
                  <span className="detail-label">Race:</span>
                  <span className="detail-value">{card.race}</span>
                </div>
              )}

              {card.level && (
                <div className="detail-row">
                  <span className="detail-label">Level/Rank:</span>
                  <span className="detail-value">{card.level}</span>
                </div>
              )}

              {card.atk !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">ATK/DEF:</span>
                  <span className="detail-value">
                    {card.atk} / {card.def}
                  </span>
                </div>
              )}

              <div className="card-text-container">
                <h4>Card Text</h4>
                <p className="card-text">{card.desc}</p>
              </div>

              <div className="card-rulings">
                <h4>Card Analysis</h4>
                <div className="ruling-text">
                  <p>This card works well in:</p>
                  <ul>
                    {determineCardArchetypes(card).map((archetype, index) => (
                      <li key={index}>{archetype} decks</li>
                    ))}
                  </ul>

                  {getCardPlayStyle(card) && (
                    <p className="card-playstyle">{getCardPlayStyle(card)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="add-to-deck-btn-large"
            onClick={() => {
              onAddCard(card);
              onClose();
            }}
          >
            Add to Deck
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardPreview;
