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

  // Function to highlight keywords in card description
  const highlightKeywords = (text: string) => {
    // First, escape any existing HTML to prevent issues
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const escapedText = escapeHtml(text);

    // Process quoted card names first
    let processedText = escapedText.replace(/"([^"]+)"/g, (match, cardName) => {
      return `<span class="keyword-card-name">${match}</span>`;
    });

    // Define categories of keywords to highlight
    const keywordPatterns = [
      // Usage restrictions - simplified pattern
      {
        pattern: /\b(You can only use.*once per turn)\b/g,
        className: "keyword-restriction",
      },
      // Add specific patterns for common restrictions
      {
        pattern: /\b(Once per turn[,:])\b/g,
        className: "keyword-restriction",
      },
      {
        pattern:
          /\b(You can only (use|activate) (this|each|the) effect (once|1 time) per turn)\b/g,
        className: "keyword-restriction",
      },
      // Summon types
      {
        pattern:
          /\b(Normal Summon|Special Summon|Tribute Summon|Flip Summon|Synchro Summon|Xyz Summon|Link Summon|Fusion Summon|Ritual Summon)\b/g,
        className: "keyword-summon",
      },
      // Effect limitations and timings
      {
        pattern:
          /\b(Once per turn|once per duel|once per Chain|during (your|either) Main Phase)\b/g,
        className: "keyword-limitation",
      },
      {
        pattern:
          /\b(Quick Effect|Ignition Effect|Trigger Effect|Continuous Effect)\b/g,
        className: "keyword-effect-type",
      },
      // Game actions
      {
        pattern:
          /\b(destroy|negate|banish|control|damage|discard|draw|shuffle|search|add|target|attack)\b/gi,
        className: "keyword-action",
      },
      // Game phases
      {
        pattern:
          /\b(Standby Phase|Main Phase|Battle Phase|End Phase|Draw Phase|Damage Step)\b/g,
        className: "keyword-phase",
      },
      // Card zones and locations
      {
        pattern: /\b(hand|deck|GY|Graveyard|field|banished|Extra Deck)\b/g,
        className: "keyword-location",
      },
      // Card properties
      {
        pattern: /\b(ATK|DEF|Level|Rank|Link Rating)\b/g,
        className: "keyword-stat",
      },
      {
        pattern: /\b(EARTH|WATER|FIRE|WIND|LIGHT|DARK|DIVINE)\b/g,
        className: "keyword-attribute",
      },
    ];

    // Apply patterns in order, but make sure we don't apply them inside already processed spans
    keywordPatterns.forEach(({ pattern, className }) => {
      const parts = processedText.split(/(<span[^>]*>.*?<\/span>)/g);

      // Process only the text parts (not the already created spans)
      for (let i = 0; i < parts.length; i += 2) {
        if (i < parts.length) {
          parts[i] = parts[i].replace(pattern, (match) => {
            return `<span class="${className}">${match}</span>`;
          });
        }
      }

      // Rejoin the parts
      processedText = parts.join("");
    });

    return { __html: processedText };
  };

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

            <div
              className="card-description"
              dangerouslySetInnerHTML={highlightKeywords(card.desc)}
            ></div>

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
