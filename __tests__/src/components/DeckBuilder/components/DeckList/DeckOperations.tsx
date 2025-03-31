import React, { useState } from "react";
import { Deck } from "../../types";
import "./DeckOperations.css";

interface DeckOperationsProps {
  currentDeck: Deck | null;
  onNewDeck: () => void;
  onSaveDeck: () => void;
  onLoadDeck: (deck: Deck) => void;
  onRenameDeck: (newName: string) => void;
  onClearDeck: () => void;
}

const DeckOperations: React.FC<DeckOperationsProps> = ({
  currentDeck,
  onNewDeck,
  onSaveDeck,
  onLoadDeck,
  onRenameDeck,
  onClearDeck,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentDeck?.name || "");

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onRenameDeck(newName.trim());
      setIsRenaming(false);
    }
  };

  return (
    <div className="deck-operations">
      <div className="deck-info">
        {isRenaming ? (
          <form onSubmit={handleRename} className="rename-form">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Deck name..."
              autoFocus
            />
            <button type="submit">Save</button>
            <button type="button" onClick={() => setIsRenaming(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <h3 onClick={() => setIsRenaming(true)}>
            {currentDeck?.name || "Untitled Deck"}
          </h3>
        )}
      </div>

      <div className="deck-actions">
        <button onClick={onNewDeck} className="action-button new">
          New Deck
        </button>
        <button
          onClick={onSaveDeck}
          className="action-button save"
          disabled={!currentDeck}
        >
          Save Deck
        </button>
        <button
          onClick={onClearDeck}
          className="action-button clear"
          disabled={!currentDeck}
        >
          Clear Deck
        </button>
      </div>
    </div>
  );
};

export default DeckOperations;
