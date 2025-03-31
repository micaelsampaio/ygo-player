import React from "react";
import { Card } from "../types";
import "./CardModal.css";

interface CardModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onAddCard?: (card: Card) => void;
}

const CardModal: React.FC<CardModalProps> = ({
  card,
  isOpen,
  onClose,
  onAddCard,
}) => {
  if (!isOpen) return null;

  return (
    <div className="card-modal-overlay" onClick={onClose}>
      <div className="card-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          ×
        </button>

        <div className="card-modal-content">
          <div className="card-modal-image">
            <img
              src={card.card_images[0].image_url}
              alt={card.name}
              className="card-full-image"
            />
          </div>

          <div className="card-modal-details">
            <h2 className="card-name">{card.name}</h2>

            <div className="card-type">
              {card.type}
              {card.attribute && (
                <span className="card-attribute"> • {card.attribute}</span>
              )}
              {card.race && <span className="card-race"> • {card.race}</span>}
            </div>

            {(card.level || card.level === 0) && (
              <div className="card-level">Level: {card.level}</div>
            )}

            {(card.atk !== undefined || card.def !== undefined) && (
              <div className="card-stats">
                {card.atk !== undefined && <span>ATK: {card.atk}</span>}
                {card.def !== undefined && <span>DEF: {card.def}</span>}
              </div>
            )}

            <div className="card-description">
              <p>{card.desc}</p>
            </div>

            {card.archetype && (
              <div className="card-archetype">Archetype: {card.archetype}</div>
            )}

            {onAddCard && (
              <button
                className="add-card-button"
                onClick={() => onAddCard(card)}
              >
                Add to Deck
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardModal;
