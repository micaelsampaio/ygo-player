import React, { useState, useEffect } from "react";
import { Deck, DeckGroup } from "../../types";
import "./DecksList.css";
import { createCollectionFromDeck } from "../../../Collections/contex";
import { useNavigate } from "react-router-dom";
// Import the shared DeckActions component instead of the local one
import DeckActions from "../../../../components/shared/DeckActions";
import DeckGroups from "./DeckGroups";

interface DeckListProps {
  decks: Deck[];
  selectedDeck: Deck | null;
  onSelectDeck: (deck: Deck | null) => void;
  onDeleteDeck: (deck: Deck) => void;
  copyDeck: (deck: Deck) => void;
  onCreateDeck: (name: string, groupId?: string) => void;
  onRenameDeck: (deck: Deck, newName: string) => void;
  onClearDeck: (deck: Deck) => void;
  onImportDeck: (deck: Deck) => void;
  onCreateCollection: (deck: Deck) => void;
  onSyncDecks?: () => void;
  deckGroups: DeckGroup[];
  selectedGroup: DeckGroup | null;
  onSelectGroup: (group: DeckGroup) => void;
  onCreateGroup: (name: string, description?: string) => DeckGroup | null;
  onUpdateGroup: (groupId: string, updates: Partial<DeckGroup>) => void;
  onDeleteGroup: (groupId: string) => boolean;
  onMoveDeckToGroup: (deckId: string, groupId: string) => boolean;
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
  deckGroups,
  selectedGroup,
  onSelectGroup,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onMoveDeckToGroup,
}) => {
  const navigate = useNavigate();
  const [editingDeck, setEditingDeck] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [activeDeckOptions, setActiveDeckOptions] = useState<string | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"all" | "groups">("all");
  const [filteredDecks, setFilteredDecks] = useState<Deck[]>(decks);
  const [groupStats, setGroupStats] = useState<
    Record<string, { count: number; decks: Deck[] }>
  >({});

  useEffect(() => {
    const stats: Record<string, { count: number; decks: Deck[] }> = {};

    deckGroups.forEach((group) => {
      stats[group.id] = { count: 0, decks: [] };
    });

    decks.forEach((deck) => {
      const groupId = deck.groupId || "default";
      if (!stats[groupId]) {
        stats[groupId] = { count: 0, decks: [] };
      }
      stats[groupId].count += 1;
      stats[groupId].decks.push(deck);
    });

    setGroupStats(stats);
  }, [decks, deckGroups]);

  useEffect(() => {
    if (viewMode === "all" || !selectedGroup) {
      setFilteredDecks(decks);
    } else {
      const groupDecks = decks.filter(
        (deck) =>
          deck.groupId === selectedGroup.id ||
          (selectedGroup.id === "default" && !deck.groupId)
      );
      setFilteredDecks(groupDecks);
    }
  }, [decks, selectedGroup, viewMode]);

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
    onCreateDeck(newDeckName, selectedGroup?.id);
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
      const storageKey = deck.id ? `deck_${deck.id}` : `deck_${deck.name}`;
      localStorage.removeItem(storageKey);
      onDeleteDeck(deck);
    }
  };

  const handleContextMenu = (deck: Deck, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (activeDeckOptions === deck.name) {
      setActiveDeckOptions(null);
    } else {
      setActiveDeckOptions(deck.name);
      onSelectDeck(deck);
    }

    const optionsMenu = document.getElementById(`deck-options-${deck.name}`);
    if (optionsMenu) {
      optionsMenu.style.position = "absolute";
      optionsMenu.style.top = `${
        event.clientY - event.currentTarget.getBoundingClientRect().top
      }px`;
      optionsMenu.style.left = `${
        event.clientX - event.currentTarget.getBoundingClientRect().left
      }px`;
      const menuWidth = 250;
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

  const sortedDecks = [...filteredDecks].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".deck-options-popup")) {
        setActiveDeckOptions(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMoveDeckToGroup = (deck: Deck, groupId: string) => {
    if (deck.id) {
      onMoveDeckToGroup(deck.id, groupId);
      setActiveDeckOptions(null);
    } else {
      console.error("Deck has no ID, cannot move to group");
    }
  };

  return (
    <div className="decks-list-container">
      <div className="decks-header">
        <h2>Your Decks</h2>
        {/* Removed the deck-header-actions div that contained the New Deck and Sync Decks buttons */}
      </div>

      <div className="view-mode-toggle">
        <button
          className={`view-mode-button ${viewMode === "all" ? "active" : ""}`}
          onClick={() => setViewMode("all")}
        >
          All Decks
        </button>
        <button
          className={`view-mode-button ${
            viewMode === "groups" ? "active" : ""
          }`}
          onClick={() => setViewMode("groups")}
        >
          By Folder
        </button>
      </div>

      {viewMode === "groups" && (
        <DeckGroups
          deckGroups={deckGroups}
          selectedGroup={selectedGroup}
          onSelectGroup={onSelectGroup}
          onCreateGroup={onCreateGroup}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={onDeleteGroup}
          groupStats={groupStats}
        />
      )}

      <div className="decks-list">
        {sortedDecks.length === 0 ? (
          <div className="no-decks">
            {viewMode === "groups" && selectedGroup ? (
              <p>
                No decks in this folder. Create a new deck or move existing
                decks here.
              </p>
            ) : (
              <p>No decks yet. Create your first deck!</p>
            )}
          </div>
        ) : (
          sortedDecks.map((deck) => (
            <div
              key={deck.id || deck.name}
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

              {/* Add clickable menu icon */}
              <div
                className="deck-menu-icon"
                onClick={(e) => {
                  e.stopPropagation();

                  // Get the position of the icon that was clicked
                  const rect = (
                    e.currentTarget as HTMLDivElement
                  ).getBoundingClientRect();

                  // Set the active deck and show options menu
                  setActiveDeckOptions(deck.name);
                  onSelectDeck(deck);

                  // Position the menu next to the icon
                  const optionsMenu = document.getElementById(
                    `deck-options-${deck.name}`
                  );
                  if (optionsMenu) {
                    optionsMenu.style.position = "absolute";
                    optionsMenu.style.top = `${0}px`;
                    optionsMenu.style.left = `${-220}px`; // Align to the left of the icon
                  }
                }}
                title="Deck options"
              ></div>

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
                    showDropdownImmediately={true}
                    deckGroups={deckGroups}
                    onMoveDeckToGroup={(groupId) =>
                      handleMoveDeckToGroup(deck, groupId)
                    }
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
