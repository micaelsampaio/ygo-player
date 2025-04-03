import React, { useState } from "react";
import { Deck } from "../types";
import "./DecksList.css";

interface DeckListProps {
  decks: Deck[];
  selectedDeck: Deck | null;
  onSelectDeck: (deck: Deck | null) => void;
  onDeleteDeck: (deck: Deck) => void;
  copyDeck: (deck: Deck) => void;
  onCreateDeck: (name: string) => void;
}

const DeckList: React.FC<DeckListProps> = ({
  decks,
  selectedDeck,
  onSelectDeck,
  onDeleteDeck,
  copyDeck,
  onCreateDeck,
}) => {
  const [editingDeck, setEditingDeck] = useState<string | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");

  const handleRename = (deck: Deck, newName: string) => {
    if (newName.trim() && newName !== deck.name) {
      const updatedDeck = { ...deck, name: newName.trim() };
      onSelectDeck(updatedDeck);
    }
    setEditingDeck(null);
    setNewDeckName("");
  };

  const handleDelete = (deck: Deck) => {
    onDeleteDeck(deck);
    setDeletingDeck(null);
  };

  const handleCopy = (deck: Deck) => {
    copyDeck(deck);
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

  return (
    <div className="decks-list-container">
      <div className="decks-header">
        <h2>Your Decks</h2>
        <button className="new-deck-button" onClick={handleNewDeck}>
          New Deck
        </button>
      </div>

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

              {deletingDeck === deck.name ? (
                <div
                  className="delete-confirm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="confirm-action delete"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(deck);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="confirm-action cancel"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeletingDeck(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="deck-actions">
                  <button
                    className="copy-deck"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCopy(deck);
                    }}
                  >
                    📋
                  </button>
                  <button
                    className="delete-deck"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeletingDeck(deck.name);
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeckList;
