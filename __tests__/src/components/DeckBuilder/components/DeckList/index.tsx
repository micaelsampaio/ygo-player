import React, { useState } from "react";
import { Deck } from "../types";
import "./DecksList.css";
import DeckActions from "./DeckActions"; // Import the DeckActions component

interface DeckListProps {
  decks: Deck[];
  selectedDeck: Deck | null;
  onSelectDeck: (deck: Deck | null) => void;
  onDeleteDeck: (deck: Deck) => void;
  copyDeck: (deck: Deck) => void;
  onCreateDeck: (name: string) => void;
  onRenameDeck: (deck: Deck, newName: string) => void;
  onClearDeck: (deck: Deck) => void;
  onImportDeck: (deck: Deck) => void;
}

const DeckList: React.FC<DeckListProps> = ({
  decks,
  selectedDeck,
  onSelectDeck,
  onDeleteDeck,
  copyDeck,
  onCreateDeck,
  onRenameDeck,
  onClearDeck,
  onImportDeck,
}) => {
  const [editingDeck, setEditingDeck] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");

  const handleRename = (deck: Deck, newName: string) => {
    if (newName.trim() && newName !== deck.name) {
      onRenameDeck(deck, newName.trim());
    }
    setEditingDeck(null);
    setNewDeckName("");
  };

  const handleKeyPress = (e: React.KeyboardEvent, deck: Deck) => {
    if (e.key === "Enter") {
      handleRename(deck, newDeckName);
    } else if (e.key === "Escape") {
      setEditingDeck(null);
      setNewDeckName("");
    }
  };

  const handleNewDeck = () => {
    const newDeckName = `New Deck ${decks.length + 1}`;
    onCreateDeck(newDeckName);
  };

  // Handler for when a deck's name is changed via DeckActions
  const handleDeckRename = (name: string) => {
    if (selectedDeck) {
      onRenameDeck(selectedDeck, name);
    }
  };

  // Handler for when a deck is cleared via DeckActions
  const handleDeckClear = () => {
    if (selectedDeck) {
      onClearDeck(selectedDeck);
    }
  };

  return (
    <div className="decks-list-container">
      <div className="decks-header">
        <h2>Your Decks</h2>
        <button className="new-deck-button" onClick={handleNewDeck}>
          New Deck
        </button>
      </div>

      {selectedDeck && (
        <div className="selected-deck-panel">
          <div className="selected-deck-info">
            <span className="selected-label">Currently Selected:</span>
            <span className="selected-deck-name">{selectedDeck.name}</span>
            <span className="deck-stats">
              <span className="stat-chip main">
                Main: {selectedDeck.mainDeck.length}
              </span>
              <span className="stat-chip extra">
                Extra: {selectedDeck.extraDeck.length}
              </span>
            </span>
          </div>
          <DeckActions
            deck={selectedDeck}
            onRenameDeck={handleDeckRename}
            onClearDeck={handleDeckClear}
            onImportDeck={onImportDeck}
            onCopyDeck={copyDeck}
            onDeleteDeck={onDeleteDeck}
          />
        </div>
      )}

      <div className="decks-list">
        {decks.length === 0 ? (
          <div className="no-decks">
            <p>No decks yet. Create your first deck!</p>
          </div>
        ) : (
          decks.map((deck) => (
            <div
              key={deck.name}
              className={`deck-item ${
                selectedDeck?.name === deck.name ? "selected" : ""
              }`}
              onClick={() => !editingDeck && onSelectDeck(deck)}
            >
              <div className="deck-main-info">
                {editingDeck === deck.name ? (
                  <input
                    type="text"
                    className="deck-name-input"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    onBlur={() => handleRename(deck, newDeckName)}
                    onKeyDown={(e) => handleKeyPress(e, deck)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <>
                    <span
                      className="deck-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setNewDeckName(deck.name);
                        setEditingDeck(deck.name);
                      }}
                    >
                      {deck.name}
                    </span>
                    <span className="deck-count">
                      Main: {deck.mainDeck.length} | Extra:{" "}
                      {deck.extraDeck.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeckList;
