import React, { useState, useRef } from "react";
import { Deck, DeckGroup } from "../../types";
import "./DeckActions.css";
import { ydkToJson } from "../../../../utils/ydk-parser";
import { ydkeToJson } from "../../../../utils/ydke-parser";
import { downloadDeck } from "../../../../utils/download-deck";
import {
  downloadDeckAsYdk,
  downloadDeckAsPng,
  exportDeckToClipboard,
} from "../../../../utils/deckExport";
import { YGODeckToImage } from "ygo-core-images-utils";
import { useNavigate } from "react-router-dom";
import { useKaibaNet } from "../../../../hooks/useKaibaNet";
import { Logger } from "../../../../utils/logger";
import { createRoom } from "../../../../utils/roomUtils";

const logger = Logger.createLogger("DeckActions");

// Add a new prop to control whether to show the dropdown immediately
interface DeckActionsProps {
  deck: Deck | null;
  onImportDeck: (deck: Deck) => void;
  onRenameDeck: (name: string) => void;
  onClearDeck: () => void;
  onCopyDeck: (deck: Deck) => void;
  onDeleteDeck: (deck: Deck) => void;
  onCreateCollection: (deck: Deck) => void;
  showDropdownImmediately?: boolean; // New prop
  deckGroups?: DeckGroup[];
  onMoveDeckToGroup?: (groupId: string) => void;
}

const DeckActions: React.FC<DeckActionsProps> = ({
  deck,
  onImportDeck,
  onRenameDeck,
  onClearDeck,
  onCopyDeck,
  onDeleteDeck,
  onCreateCollection,
  showDropdownImmediately = false, // Default to false
  deckGroups = [], // Default to empty array
  onMoveDeckToGroup,
}) => {
  // Initialize isActionsOpen based on the showDropdownImmediately prop
  const [isActionsOpen, setIsActionsOpen] = useState(showDropdownImmediately);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [isMoveGroupMenuOpen, setIsMoveGroupMenuOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    isImporting: boolean;
    progress: number;
    total: number;
  }>({ isImporting: false, progress: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const kaibaNet = useKaibaNet();

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

  // Function to play with the selected deck
  const playWithDeck = async () => {
    try {
      logger.debug("Creating room to play with deck:", deck.name);

      // Set up the duel data structure
      const duelData = {
        players: [
          {
            name: "player1",
            deckId: deck.id,
            mainDeck: [...deck.mainDeck],
            extraDeck: deck.extraDeck,
          },
          {
            name: "player2",
            deckId: undefined,
            // Default opponent deck will be set in the duel
            mainDeck: [],
            extraDeck: [],
          },
        ],
        options: {
          shuffleDecks: true,
        },
      };

      // Use the createRoom utility function
      const navigationState = await createRoom(kaibaNet, duelData);

      // Navigate to the duel page using the state from createRoom
      navigate(`/duel/${navigationState.roomId}`, {
        state: navigationState,
      });

      // Close the dropdown
      setIsActionsOpen(false);
    } catch (error) {
      logger.error("Failed to start duel with deck:", error);
      alert(
        `Failed to start duel: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const exportDeckAsYDK = () => {
    downloadDeckAsYdk(deck.name, deck);
    setIsActionsOpen(false);
  };

  const exportDeckAsYDKE = () => {
    const deckExporter = new YGODeckToImage({
      name: deck.name,
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });
    const ydkeUrl = deckExporter.toYDKE();
    navigator.clipboard.writeText(ydkeUrl);
    alert("YDKE URL copied to clipboard");
    setIsActionsOpen(false);
  };

  const handleExportToClipboard = async () => {
    try {
      await exportDeckToClipboard(deck.name, deck);
      alert("Deck copied to clipboard in YDK format");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      alert("Failed to copy deck to clipboard");
    }
    setIsActionsOpen(false);
  };

  const exportDeckAsImage = () => {
    downloadDeckAsPng(deck.name, deck);
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

  const importFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (clipboardText.startsWith("ydke://")) {
        setImportProgress({
          isImporting: true,
          progress: 0,
          total: 0,
        });

        const deckData = ydkeToJson(clipboardText);
        const importedDeckData = await downloadDeck(deckData, {
          events: {
            onProgess: (args) => {
              setImportProgress({
                isImporting: true,
                progress: args.cardDownloaded,
                total: args.totalCards,
              });
            },
          },
        });

        const importedDeck: Deck = {
          name: "YDKE Imported Deck",
          mainDeck: importedDeckData.mainDeck || [],
          extraDeck: importedDeckData.extraDeck || [],
          sideDeck: importedDeckData.sideDeck || [],
        };

        onImportDeck(importedDeck);
        return;
      }

      if (
        clipboardText.includes("#ydk") ||
        clipboardText.includes("#created by") ||
        clipboardText.includes("#Created by")
      ) {
        // Handle YDK format
        setImportProgress({
          isImporting: true,
          progress: 0,
          total: 0,
        });

        const deckData = ydkToJson(clipboardText);
        const importedDeckData = await downloadDeck(deckData, {
          events: {
            onProgess: (args) => {
              setImportProgress({
                isImporting: true,
                progress: args.cardDownloaded,
                total: args.totalCards,
              });
            },
          },
        });

        const importedDeck: Deck = {
          name: "Clipboard Deck",
          mainDeck: importedDeckData.mainDeck || [],
          extraDeck: importedDeckData.extraDeck || [],
          sideDeck: importedDeckData.sideDeck || [],
        };

        onImportDeck(importedDeck);
      } else {
        // Try parsing as JSON
        const importedDeck = JSON.parse(clipboardText) as Deck;
        onImportDeck(importedDeck);
      }
    } catch (error) {
      console.error("Clipboard import error:", error);
      alert(
        "Failed to import deck from clipboard. Make sure the content is a valid YDK, YDKE, or JSON deck format."
      );
    } finally {
      setImportProgress({
        isImporting: false,
        progress: 0,
        total: 0,
      });
      setIsActionsOpen(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;

        if (file.name.endsWith(".ydk")) {
          try {
            setImportProgress({
              isImporting: true,
              progress: 0,
              total: 0,
            });

            const deckData = ydkToJson(content);

            const importedDeckData = await downloadDeck(deckData, {
              events: {
                onProgess: (args) => {
                  setImportProgress({
                    isImporting: true,
                    progress: args.cardDownloaded,
                    total: args.totalCards,
                  });
                },
              },
            });

            const importedDeck: Deck = {
              name: file.name.replace(".ydk", "") + " (Imported)",
              mainDeck: importedDeckData.mainDeck || [],
              extraDeck: importedDeckData.extraDeck || [],
              sideDeck: importedDeckData.sideDeck || [],
            };

            onImportDeck(importedDeck);
            setImportProgress({
              isImporting: false,
              progress: 0,
              total: 0,
            });
          } catch (error) {
            console.error("YDK import error:", error);
            alert(
              `Failed to import YDK deck: ${error instanceof Error ? error.message : "Unknown error"
              }`
            );
            setImportProgress({
              isImporting: false,
              progress: 0,
              total: 0,
            });
          }
        } else {
          const importedDeck = JSON.parse(content) as Deck;
          onImportDeck(importedDeck);
        }
      } catch (error) {
        console.error("Import error:", error);
        alert(
          `Failed to import deck. Make sure the file is valid: ${error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setImportProgress({
          isImporting: false,
          progress: 0,
          total: 0,
        });
      }
    };

    reader.readAsText(file);

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

  const handleMoveDeckToGroup = (groupId: string) => {
    if (onMoveDeckToGroup) {
      onMoveDeckToGroup(groupId);
    }
    setIsMoveGroupMenuOpen(false);
    setIsActionsOpen(false);
  };

  const getCurrentGroupName = () => {
    if (!deck?.groupId) return "Default";
    const group = deckGroups.find((g) => g.id === deck.groupId);
    return group ? group.name : "Unknown Group";
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
            <div className="group-header">Play</div>
            <button
              onClick={playWithDeck}
              title="Start a duel with this deck"
              className="action-button"
            >
              <span className="action-icon">🎮</span>
              <span className="action-text">Play with Deck</span>
            </button>
          </div>

          <div className="actions-group">
            <div className="group-header">Export</div>
            <button
              onClick={exportDeckAsYDK}
              title="Export deck in YDK format for use in other YGO applications"
              className="action-button"
            >
              <span className="action-icon">💾</span>
              <span className="action-text">Export YDK to file</span>
            </button>

            <button
              onClick={handleExportToClipboard}
              title="Copy deck in YDK format to clipboard"
              className="action-button"
            >
              <span className="action-icon">💾</span>
              <span className="action-text">Export YDK to Clipboard</span>
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
              title="Export deck data as JSON for backup or sharing"
              className="action-button"
            >
              <span className="action-icon">📋</span>
              <span className="action-text">Export Data</span>
            </button>

            <button
              onClick={exportDeckAsYDKE}
              title="Export deck as YDKE URL"
              className="action-button"
            >
              <span className="action-icon">🔗</span>
              <span className="action-text">Export YDKE URL</span>
            </button>
          </div>

          <div className="actions-group">
            <div className="group-header">Manage</div>
            <button
              onClick={importDeck}
              title="Import a deck from file (YDK, YDKE or JSON format)"
              className="action-button"
            >
              <span className="action-icon">📥</span>
              <span className="action-text">Import</span>
            </button>

            <button
              onClick={importFromClipboard}
              title="Import a deck from clipboard (YDK, YDKE, or JSON format)"
              className="action-button"
            >
              <span className="action-icon">📋</span>
              <span className="action-text">Import from Clipboard</span>
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

            {onMoveDeckToGroup && deckGroups.length > 0 && (
              <div className="move-to-group-container">
                <button
                  onClick={() => setIsMoveGroupMenuOpen(!isMoveGroupMenuOpen)}
                  title="Move deck to a different group"
                  className="action-button"
                >
                  <span className="action-icon">📁</span>
                  <span className="action-text">
                    Move to Folder ({getCurrentGroupName()})
                  </span>
                  <span className="group-menu-arrow">
                    {isMoveGroupMenuOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isMoveGroupMenuOpen && (
                  <div className="group-selection-menu">
                    {deckGroups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => handleMoveDeckToGroup(group.id)}
                        className={`group-option ${deck?.groupId === group.id ? "current-group" : ""
                          }`}
                        disabled={deck?.groupId === group.id}
                      >
                        <span className="group-icon">📁</span>
                        <span className="group-name">{group.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                onCreateCollection(deck);
                setIsActionsOpen(false);
              }}
              title="Create a collection from this deck"
              className="action-button"
            >
              <span className="action-icon">📚</span>
              <span className="action-text">Create Collection</span>
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

      {importProgress.isImporting && (
        <div className="import-progress-modal">
          <div className="modal-overlay"></div>
          <div className="modal-content">
            <h3>Importing Deck</h3>
            <p>Downloading card data...</p>
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{
                  width: `${importProgress.total
                    ? (importProgress.progress / importProgress.total) * 100
                    : 0
                    }%`,
                }}
              ></div>
            </div>
            <p>
              {importProgress.progress} / {importProgress.total} cards
            </p>
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
