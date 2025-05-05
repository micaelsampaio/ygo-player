import React, { useState, useEffect } from "react";
import { Card } from "../../types";
import "./CardModal.css";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../../../utils/cardImages";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface Group {
  id: string;
  name: string;
}

interface CardModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onAddCard?: (card: Card) => void;
  onToggleFavorite?: (card: Card) => void;
  onAddToCollection?: (card: Card, groupId?: string) => void;
  groups?: Group[];
}

const CardModal: React.FC<CardModalProps> = ({
  card,
  isOpen,
  onClose,
  onAddCard,
  onToggleFavorite,
  onAddToCollection,
  groups,
}) => {
  const [hasImageFallback, setHasImageFallback] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleToggleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleFavorite?.(card);
  };

  const handleViewFullDetails = (event: React.MouseEvent) => {
    event.preventDefault();
    onClose();
    // Update the path to the correct format: /cards/database/card/<id>
    navigate(`/cards/database/card/${card.id}`);
  };

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
        <button
          className={`favorite-button ${card.isFavorite ? "active" : ""}`}
          onClick={handleToggleFavorite}
          title={card.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {card.isFavorite ? "★" : "☆"}
        </button>

        <div className="card-modal-content">
          <div className="card-modal-image">
            <img
              src={
                hasImageFallback
                  ? CARD_BACK_IMAGE
                  : getCardImageUrl(card.id, "normal")
              }
              alt={card.name}
              className={`card-full-image ${
                hasImageFallback ? "card-image-fallback" : ""
              }`}
              onError={(e) => {
                if (!hasImageFallback) {
                  setHasImageFallback(true);
                }
              }}
            />
            <div className="view-details-button-container">
              <button
                className="view-details-button"
                onClick={handleViewFullDetails}
              >
                <ExternalLink size={14} />
                View Full Details
              </button>
            </div>
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

            <div className="card-actions">
              {onAddCard && (
                <button
                  className="add-card-button"
                  onClick={() => onAddCard(card)}
                >
                  Add to Deck
                </button>
              )}

              {onAddToCollection && (
                <div className="add-to-group-container">
                  {groups && groups.length > 0 ? (
                    <select
                      className="group-select"
                      onChange={(e) => onAddToCollection(card, e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select a Group
                      </option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      className="add-to-group-button"
                      onClick={() => onAddToCollection(card)}
                    >
                      Add to Collection
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardModal;
