import React, { useState, useRef } from "react";
import { Deck } from "../types";
import "./DeckActions.css";

interface DeckActionsProps {
  deck: Deck | null;
  onImportDeck: (deck: Deck) => void;
  onRenameDeck: (name: string) => void;
  onClearDeck: () => void;
}

const DeckActions: React.FC<DeckActionsProps> = ({
  deck,
  onImportDeck,
  onRenameDeck,
  onClearDeck,
}) => {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!deck) return null;

  const exportDeckAsYDK = () => {
    let content = "#created by Yu-Gi-Oh Deck Builder\n";
    content += "#main\n";

    deck.mainDeck.forEach((card) => {
      content += `${card.id}\n`;
    });

    content += "#extra\n";
    deck.extraDeck.forEach((card) => {
      content += `${card.id}\n`;
    });

    content += "!side\n";

    // Create download link
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${deck.name}.ydk`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

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
        "Are you sure you want to clear this deck? This cannot be undone."
      )
    ) {
      onClearDeck();
      setIsActionsOpen(false);
    }
  };

  return (
    <div className="deck-actions">
      <button
        className="actions-toggle"
        onClick={() => setIsActionsOpen(!isActionsOpen)}
      >
        Deck Options
      </button>

      {isActionsOpen && (
        <div className="actions-dropdown">
          <button onClick={exportDeckAsYDK}>Export as YDK</button>
          <button onClick={exportDeckAsJSON}>Export as JSON</button>
          <button onClick={importDeck}>Import Deck</button>
          <button onClick={startRenaming}>Rename Deck</button>
          <button onClick={confirmClearDeck} className="danger">
            Clear Deck
          </button>
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
