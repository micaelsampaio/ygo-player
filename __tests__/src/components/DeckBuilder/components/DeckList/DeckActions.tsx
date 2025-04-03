import React, { useState, useRef } from "react";
import { Deck } from "../types";
import "./DeckActions.css";
import { YGODeckToImage } from "ygo-core-images-utils"; // Import the utility

interface DeckActionsProps {
  deck: Deck | null;
  onImportDeck: (deck: Deck) => void;
  onRenameDeck: (name: string) => void;
  onClearDeck: () => void;
  onCopyDeck: (deck: Deck) => void;
  onDeleteDeck: (deck: Deck) => void;
}

const DeckActions: React.FC<DeckActionsProps> = ({
  deck,
  onImportDeck,
  onRenameDeck,
  onClearDeck,
  onCopyDeck,
  onDeleteDeck,
}) => {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node) &&
        isActionsOpen
      ) {
        setIsActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isActionsOpen]);

  if (!deck) return null;

  const exportDeckAsYDK = () => {
    // Use the YGODeckToImage utility instead of implementing export manually
    const deckExporter = new YGODeckToImage({
      name: deck.name,
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });

    deckExporter.downloadYdk({ fileName: `${deck.name}.ydk` });
    setIsActionsOpen(false);
  };

  const exportDeckAsImage = () => {
    // Use YGODeckToImage to export as an image
    const deckExporter = new YGODeckToImage({
      name: deck.name,
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
      cdnUrl: process.env.REACT_APP_CARD_IMAGE_CDN,
    });

    deckExporter.toImage({
      fileName: `${deck.name}.png`,
      download: true,
    });

    setIsActionsOpen(false);
  };

  const exportDeckAsJSON = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(deck, null, 2)], {
      type: "application/json",
    });
    element.href = URL.createObjectURL(file);
    element.download = `${deck.name}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setIsActionsOpen(false);
  };

  const importDeck = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;

        // Check if it's a YDK file
        if (file.name.endsWith(".ydk")) {
          alert("YDK import not implemented yet");
          // You'd need to implement parsing YDK format
          // and fetching card data by IDs
        } else {
          // Assume JSON
          const importedDeck = JSON.parse(content) as Deck;
          onImportDeck(importedDeck);
        }
      } catch (error) {
        console.error("Import error:", error);
        alert("Failed to import deck. Make sure the file is valid.");
      }
    };

    if (file.name.endsWith(".ydk")) {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }

    // Reset the input
    e.target.value = "";
    setIsActionsOpen(false);
  };

  const startRenaming = () => {
    setNewName(deck.name);
    setIsRenaming(true);
    setIsActionsOpen(false);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onRenameDeck(newName.trim());
      setIsRenaming(false);
    }
  };

  const confirmClearDeck = () => {
    if (
      window.confirm(
        "Are you sure you want to clear this deck? This action will remove all cards but keep the deck itself."
      )
    ) {
      onClearDeck();
      setIsActionsOpen(false);
    }
  };

  const copyThisDeck = () => {
    onCopyDeck(deck);
    setIsActionsOpen(false);
  };

  const deleteThisDeck = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this deck? This cannot be undone."
      )
    ) {
      onDeleteDeck(deck);
      setIsActionsOpen(false);
    }
  };

  return (
    <div className="deck-actions" ref={actionsRef}>
      <button
        className="actions-toggle"
        onClick={() => setIsActionsOpen(!isActionsOpen)}
        title="Click to open deck options"
      >
        <span>Deck Options</span>
        <span className="toggle-icon">{isActionsOpen ? "▲" : "▼"}</span>
      </button>

      {isActionsOpen && (
        <div className="actions-dropdown">
          <div className="actions-group">
            <div className="group-header">Export</div>
            <button
              onClick={exportDeckAsYDK}
              title="Export deck in YDK format for use in other YGO applications"
              className="action-button"
            >
              <span className="action-icon">💾</span>
              <span className="action-text">Export as YDK</span>
            </button>

            <button
              onClick={exportDeckAsImage}
              title="Create a visual image of your deck"
              className="action-button"
            >
              <span className="action-icon">🖼️</span>
              <span className="action-text">Export as Image</span>
            </button>

            <button
              onClick={exportDeckAsJSON}
              title="Export deck as JSON for backup or sharing"
              className="action-button"
            >
              <span className="action-icon">📋</span>
              <span className="action-text">Export as JSON</span>
            </button>
          </div>

          <div className="actions-group">
            <div className="group-header">Manage</div>
            <button
              onClick={importDeck}
              title="Import a deck from YDK or JSON file"
              className="action-button"
            >
              <span className="action-icon">📥</span>
              <span className="action-text">Import Deck</span>
            </button>

            <button
              onClick={copyThisDeck}
              title="Create a copy of this deck"
              className="action-button"
            >
              <span className="action-icon">📋</span>
              <span className="action-text">Copy Deck</span>
            </button>

            <button
              onClick={startRenaming}
              title="Change the name of your deck"
              className="action-button"
            >
              <span className="action-icon">✏️</span>
              <span className="action-text">Rename Deck</span>
            </button>

            <button
              onClick={confirmClearDeck}
              title="Remove all cards from this deck"
              className="action-button danger"
            >
              <span className="action-icon">🗑️</span>
              <span className="action-text">Clear Deck</span>
            </button>

            <button
              onClick={deleteThisDeck}
              title="Delete this deck completely"
              className="action-button danger"
            >
              <span className="action-icon">❌</span>
              <span className="action-text">Delete Deck</span>
            </button>
          </div>
        </div>
      )}

      {isRenaming && (
        <div className="rename-modal">
          <div
            className="modal-overlay"
            onClick={() => setIsRenaming(false)}
          ></div>
          <div className="modal-content">
            <h3>Rename Deck</h3>
            <form onSubmit={submitRename}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Deck name"
                autoFocus
              />
              <div className="form-actions">
                <button type="submit">Save</button>
                <button type="button" onClick={() => setIsRenaming(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.ydk"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default DeckActions;
