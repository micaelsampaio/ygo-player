import React, { useState } from "react";
import { Deck } from "../../types";
import "./DecksList.css";
import { createCollectionFromDeck } from "../../../Collections/contex";
import { useNavigate } from "react-router-dom";
import DeckActions from "./DeckActions";

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
  onCreateCollection: (deck: Deck) => void;
  onSyncDecks?: () => void; // New prop for sync functionality
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
  onCreateCollection,
  onSyncDecks,
}) => {
  const navigate = useNavigate();
  const [editingDeck, setEditingDeck] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [activeDeckOptions, setActiveDeckOptions] = useState<string | null>(
    null
  );

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

  const handleDeckRename = (name: string) => {
    if (selectedDeck) {
      onRenameDeck(selectedDeck, name);
    }
    setActiveDeckOptions(null);
  };

  const handleDeckClear = () => {
    if (selectedDeck) {
      onClearDeck(selectedDeck);
    }
    setActiveDeckOptions(null);
  };

  const handleCreateCollection = (deck: Deck) => {
    const collectionId = createCollectionFromDeck(deck);
    navigate(`/collections?select=${collectionId}`);
    setActiveDeckOptions(null);
  };

  const handleDeleteDeck = (deck: Deck) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${deck.name}"? This action cannot be undone.`
      )
    ) {
      // First ensure we have the correct key for localStorage
      const storageKey = `deck_${deck.name}`;

      // Remove from localStorage directly to ensure it's gone
      localStorage.removeItem(storageKey);

      // Then call the parent component's delete function
      onDeleteDeck(deck);
    }
  };

  const handleContextMenu = (deck: Deck, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent the default context menu
    event.stopPropagation();

    // Toggle options visibility
    if (activeDeckOptions === deck.name) {
      setActiveDeckOptions(null);
    } else {
      setActiveDeckOptions(deck.name);
      onSelectDeck(deck);
    }

    // Position the options menu at the cursor position
    const optionsMenu = document.getElementById(`deck-options-${deck.name}`);
    if (optionsMenu) {
      // Calculate position to show near the cursor
      optionsMenu.style.position = "absolute";
      optionsMenu.style.top = `${
        event.clientY - event.currentTarget.getBoundingClientRect().top
      }px`;
      optionsMenu.style.left = `${
        event.clientX - event.currentTarget.getBoundingClientRect().left
      }px`;
      // Make sure menu doesn't go off the right edge
      const menuWidth = 250; // Approximate width
      const containerWidth = event.currentTarget.getBoundingClientRect().width;
      const cursorX =
        event.clientX - event.currentTarget.getBoundingClientRect().left;
      if (cursorX + menuWidth > containerWidth) {
        optionsMenu.style.left = `${containerWidth - menuWidth}px`;
      }
    }
  };

  const getDateLabel = (deck: Deck) => {
    const dates = [
      { label: "Last Modified", date: deck.lastModified },
      { label: "Created", date: deck.createdAt },
      { label: "Imported", date: deck.importedAt },
      { label: "Copied", date: deck.copiedAt },
    ].filter((entry) => entry.date);

    if (dates.length === 0) return "";

    const latestDate = dates.reduce((latest, current) =>
      new Date(current.date!) > new Date(latest.date!) ? current : latest
    );

    return `${latestDate.label}: ${new Date(
      latestDate.date!
    ).toLocaleDateString()}`;
  };

  // Always sort decks by name
  const sortedDecks = [...decks].sort((a, b) => a.name.localeCompare(b.name));

  // Close deck options when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".deck-options-popup")) {
        setActiveDeckOptions(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="decks-list-container">
      <div className="decks-header">
        <h2>Your Decks</h2>
        <div className="deck-header-actions">
          <button className="new-deck-button" onClick={handleNewDeck}>
            New Deck
          </button>
          {onSyncDecks && (
            <button className="sync-decks-button" onClick={onSyncDecks}>
              Sync Decks
            </button>
          )}
        </div>
      </div>

      <div className="decks-list">
        {sortedDecks.length === 0 ? (
          <div className="no-decks">
            <p>No decks yet. Create your first deck!</p>
          </div>
        ) : (
          sortedDecks.map((deck) => (
            <div
              key={deck.name}
              className={`deck-item ${
                selectedDeck?.name === deck.name ? "selected" : ""
              }`}
              onClick={() => !editingDeck && onSelectDeck(deck)}
              onContextMenu={(e) => handleContextMenu(deck, e)}
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
                    <span className="deck-name">{deck.name}</span>
                    <div className="deck-details">
                      <span className="deck-count">
                        Main: {deck.mainDeck.length} | Extra:{" "}
                        {deck.extraDeck.length}
                      </span>
                      {(deck.lastModified ||
                        deck.createdAt ||
                        deck.importedAt ||
                        deck.copiedAt) && (
                        <span className="deck-date">{getDateLabel(deck)}</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {activeDeckOptions === deck.name && (
                <div
                  id={`deck-options-${deck.name}`}
                  className="deck-options-popup"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DeckActions
                    deck={deck}
                    onRenameDeck={(name) => {
                      onRenameDeck(deck, name);
                      setActiveDeckOptions(null);
                    }}
                    onClearDeck={() => {
                      onClearDeck(deck);
                      setActiveDeckOptions(null);
                    }}
                    onImportDeck={(d) => {
                      onImportDeck(d);
                      setActiveDeckOptions(null);
                    }}
                    onCopyDeck={() => {
                      copyDeck(deck);
                      setActiveDeckOptions(null);
                    }}
                    onDeleteDeck={() => {
                      handleDeleteDeck(deck);
                      setActiveDeckOptions(null);
                    }}
                    onCreateCollection={() => {
                      handleCreateCollection(deck);
                      setActiveDeckOptions(null);
                    }}
                    showDropdownImmediately={true} // Add this prop
                  />
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
