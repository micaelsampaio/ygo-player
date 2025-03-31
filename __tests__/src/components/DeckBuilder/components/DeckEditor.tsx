import React, { useState, useMemo } from "react";
import { Card, Deck } from "../types";
import { getCardImageUrl } from "../../../utils/cardImages";
import "./DeckEditor.css";

type SortOption = "name" | "cardType" | "monsterType" | "level" | "atk" | "def";

interface DeckEditorProps {
  deck: Deck | null;
  onCardSelect: (card: Card) => void;
  onCardRemove: (card: Card, index: number, isExtraDeck: boolean) => void;
  onRenameDeck: (newName: string) => void; // This prop is for renaming
  onClearDeck: () => void;
}

const DeckEditor: React.FC<DeckEditorProps> = ({
  deck,
  onCardSelect,
  onCardRemove,
  onRenameDeck,
  onClearDeck,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>("cardType"); // Changed default sort
  const [isEditingName, setIsEditingName] = useState(false); // Controls edit mode
  const [editedName, setEditedName] = useState(deck?.name || ""); // Stores the edited name

  const handleNameSubmit = () => {
    if (editedName.trim() && editedName !== deck?.name) {
      onRenameDeck(editedName.trim()); // Calls the parent's rename function
    }
    setIsEditingName(false);
  };

  const sortCards = (cards: Card[]) => {
    return [...cards]
      .map((card, originalIndex) => ({ card, originalIndex }))
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.card.name.localeCompare(b.card.name);
          case "cardType":
            const getMainType = (type: string) => {
              if (type.includes("Monster")) return "1-Monster";
              if (type.includes("Spell")) return "2-Spell";
              if (type.includes("Trap")) return "3-Trap";
              return type;
            };
            // First compare by main type
            const typeComparison = getMainType(a.card.type).localeCompare(
              getMainType(b.card.type)
            );
            // If same type, sort by name to keep playsets together
            return typeComparison === 0
              ? a.card.name.localeCompare(b.card.name)
              : typeComparison;
          case "monsterType":
            if (!a.card.race && !b.card.race) return 0;
            if (!a.card.race) return 1;
            if (!b.card.race) return -1;
            return a.card.race.localeCompare(b.card.race);
          case "level":
            return (b.card.level || 0) - (a.card.level || 0);
          case "atk":
            return (b.card.atk || 0) - (a.card.atk || 0);
          case "def":
            return (b.card.def || 0) - (a.card.def || 0);
          default:
            return 0;
        }
      });
  };

  const sortedMainDeck = useMemo(
    () => (deck ? sortCards(deck.mainDeck) : []),
    [deck?.mainDeck, sortBy]
  );

  const sortedExtraDeck = useMemo(
    () => (deck ? sortCards(deck.extraDeck) : []),
    [deck?.extraDeck, sortBy]
  );

  if (!deck) {
    return (
      <div className="deck-editor empty-state">
        <p>Select a deck to start editing</p>
      </div>
    );
  }

  return (
    <div className="deck-editor">
      <div className="deck-editor-header">
        {isEditingName ? (
          <div className="deck-name-edit">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
                if (e.key === "Escape") {
                  setIsEditingName(false);
                  setEditedName(deck?.name || "");
                }
              }}
              autoFocus
            />
          </div>
        ) : (
          <h2
            className="deck-name"
            onClick={() => {
              if (deck) {
                setIsEditingName(true);
                setEditedName(deck.name);
              }
            }}
          >
            {deck?.name || "No Deck Selected"}
            {deck && <span className="edit-hint">✎</span>}
          </h2>
        )}
      </div>

      <div className="current-deck">
        <div className="deck-controls">
          <h4>Main Deck ({deck.mainDeck.length})</h4>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="cardType">Card Type (Monster/Spell/Trap)</option>
            <option value="monsterType">Monster Type</option>
            <option value="name">Name</option>
            <option value="level">Level</option>
            <option value="atk">ATK</option>
            <option value="def">DEF</option>
          </select>
        </div>

        <div className="card-grid">
          {sortedMainDeck.map(({ card, originalIndex }) => (
            <div
              className="deck-card-container"
              key={`${card.id}-${originalIndex}`}
            >
              <img
                src={getCardImageUrl(card, "small")}
                alt={card.name}
                className="deck-card"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `${
                    import.meta.env.VITE_YGO_CDN_URL
                  }/images/cards/card_back.jpg`;
                }}
                onClick={() => onCardSelect(card)}
              />
              <button
                className="remove-card"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardRemove(card, originalIndex, false);
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <h4>Extra Deck ({deck.extraDeck.length})</h4>
        <div className="card-grid">
          {sortedExtraDeck.map(({ card, originalIndex }) => (
            <div
              className="deck-card-container"
              key={`${card.id}-${originalIndex}`}
            >
              <img
                src={getCardImageUrl(card, "small")}
                alt={card.name}
                className="deck-card"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `${
                    import.meta.env.VITE_YGO_CDN_URL
                  }/images/cards/card_back.jpg`;
                }}
                onClick={() => onCardSelect(card)}
              />
              <button
                className="remove-card"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardRemove(card, originalIndex, true);
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeckEditor;
