import React, { useState } from "react";
import { Deck } from "../../types";
import {
  syncDecksWithFolder,
  processFiles,
} from "../../../../utils/deckFileSystem";
import { v4 as uuidv4 } from "uuid";
import "./DeckSyncModal.css";

interface DeckSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  selectedDeckGroupId?: string;
  updateDeck: (deck: Deck) => void;
}

interface SyncProgress {
  isProcessing: boolean;
  status: string;
  imported: number;
  exported: number;
  errors: string[];
}

const DeckSyncModal: React.FC<DeckSyncModalProps> = ({
  isOpen,
  onClose,
  decks,
  selectedDeckGroupId = "default",
  updateDeck,
}) => {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isProcessing: false,
    status: "",
    imported: 0,
    exported: 0,
    errors: [],
  });

  // Folder selection handler
  const handleFolderSelect = () => {
    // Try to use directory picker API if supported
    const input = document.createElement("input");
    input.type = "file";

    // Check if the browser supports directory selection
    // @ts-ignore - webkitdirectory is non-standard
    const isDirectorySelectSupported =
      "webkitdirectory" in input || "directory" in input;

    if (isDirectorySelectSupported) {
      // Directory selection is supported
      // @ts-ignore - webkitdirectory is non-standard
      input.webkitdirectory = true;
      // @ts-ignore - directory is non-standard
      input.directory = true;

      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          // Filter only for deck files (.json and .ydk)
          const deckFiles: File[] = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const extension = file.name
              .slice(file.name.lastIndexOf("."))
              .toLowerCase();
            if (extension === ".json" || extension === ".ydk") {
              deckFiles.push(file);
            }
          }

          const folderPathInput = document.getElementById(
            "deck-sync-folder-path"
          ) as HTMLInputElement;

          if (folderPathInput) {
            // Get the folder name from the first file's path
            // @ts-ignore - webkitRelativePath is non-standard
            const folderPath =
              files[0].webkitRelativePath.split("/")[0] || "Selected folder";
            folderPathInput.value = `${folderPath} (${deckFiles.length} deck files)`;

            // Store the selected files in a dataset attribute to use later
            const syncButton = document.querySelector(
              ".deck-sync-modal .sync-button"
            ) as HTMLElement;
            if (syncButton) {
              syncButton.dataset.selectedFiles = JSON.stringify(
                Array.from(deckFiles).map((file) => ({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  lastModified: file.lastModified,
                }))
              );

              // Store the actual files in a global variable since we can't store them in dataset
              window.selectedDeckFiles = deckFiles;
            }
          }

          if (deckFiles.length === 0) {
            alert(
              "No deck files (.json or .ydk) found in the selected folder."
            );
          }
        }
      };
    } else {
      // Fallback to multiple file selection
      input.multiple = true;
      input.accept = ".json,.ydk";

      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const folderPathInput = document.getElementById(
            "deck-sync-folder-path"
          ) as HTMLInputElement;

          // Convert FileList to array
          const fileArray: File[] = [];
          for (let i = 0; i < files.length; i++) {
            fileArray.push(files[i]);
          }

          if (folderPathInput) {
            folderPathInput.value = `${files.length} deck file(s) selected`;

            // Store the selected files in a dataset attribute to use later
            const syncButton = document.querySelector(
              ".deck-sync-modal .sync-button"
            ) as HTMLElement;
            if (syncButton) {
              syncButton.dataset.selectedFiles = JSON.stringify(
                Array.from(fileArray).map((file) => ({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  lastModified: file.lastModified,
                }))
              );

              // Store the actual files in a global variable since we can't store them in dataset
              window.selectedDeckFiles = fileArray;
            }
          }
        }
      };
    }

    input.click();
  };

  // Process multiple deck files
  const processSelectedFiles = async (files: File[]) => {
    try {
      // Use the processFiles utility function from deckFileSystem
      const { imported, errors } = await processFiles(files, setSyncProgress);

      // Update decks with imported data
      if (imported.length > 0) {
        imported.forEach((deck) => {
          // Add custom import suffix while preserving the original name
          const importedDeckName = deck.name.endsWith(" (Imported)")
            ? deck.name
            : deck.name + " (Imported)";

          // Ensure the imported deck has a UUID
          const deckId = deck.id || crypto.randomUUID();

          const importedDeck = {
            ...deck,
            id: deckId,
            name: importedDeckName,
            importedAt: new Date().toISOString(),
            groupId: selectedDeckGroupId,
          };

          // Use the proper deck ID for the storage key
          const storageKey = `deck_${deckId}`;

          // Store with key based on ID
          localStorage.setItem(storageKey, JSON.stringify(importedDeck));
        });
      }

      // Display summary
      if (errors.length === 0) {
        alert(`Successfully imported ${imported.length} deck(s)!`);
      } else {
        alert(
          `Imported ${imported.length} deck(s) with ${errors.length} errors. Check the sync modal for details.`
        );
      }
    } catch (error) {
      console.error("Error processing files:", error);
      setSyncProgress({
        isProcessing: false,
        status: "Failed",
        imported: 0,
        exported: 0,
        errors: [
          `Error processing files: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
      });

      alert(
        `Error processing files: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Handle sync with folder functionality
  const handleSyncWithFolder = async (
    folderPath: string,
    direction: "import" | "export" | "both",
    format: "ydk" | "json"
  ) => {
    if (!folderPath) {
      alert("Please select a folder first");
      return;
    }

    setSyncProgress({
      isProcessing: true,
      status: "Processing...",
      imported: 0,
      exported: 0,
      errors: [],
    });

    try {
      // Call the utility function to sync decks
      const result = await syncDecksWithFolder(
        decks,
        folderPath,
        direction,
        format
      );

      // Import any new decks
      if (result.imported.length > 0) {
        result.imported.forEach((deck) => {
          // Add custom import suffix while preserving the original name
          const importedDeckName = deck.name.endsWith(" (Imported)")
            ? deck.name
            : deck.name + " (Imported)";

          // Generate a unique ID for the deck
          const deckId = deck.id || crypto.randomUUID();

          const importedDeck = {
            ...deck,
            id: deckId,
            name: importedDeckName,
            importedAt: new Date().toISOString(),
            groupId: selectedDeckGroupId,
          };

          // Use the consistent deck_${deckId} format for storage key
          const storageKey = `deck_${deckId}`;

          // Store with key based on ID
          localStorage.setItem(storageKey, JSON.stringify(importedDeck));
        });
      }

      // Show results
      setSyncProgress({
        isProcessing: false,
        status: "Completed",
        imported: result.imported.length,
        exported: result.exported.length,
        errors: result.errors,
      });

      // Display a summary alert
      if (result.errors.length === 0) {
        alert(
          `Sync completed successfully!\n` +
            `- Imported: ${result.imported.length} decks\n` +
            `- Exported: ${result.exported.length} decks`
        );
      } else {
        alert(
          `Sync completed with ${result.errors.length} errors.\n` +
            `- Imported: ${result.imported.length} decks\n` +
            `- Exported: ${result.exported.length} decks\n` +
            `Check the sync modal for error details.`
        );
      }
    } catch (error) {
      console.error("Sync error:", error);
      setSyncProgress({
        isProcessing: false,
        status: "Failed",
        imported: 0,
        exported: 0,
        errors: [
          `Error during sync: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
      });
      alert(
        `Error during sync: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // If the modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="deck-sync-modal-overlay">
      <div className="deck-sync-modal">
        <div className="deck-sync-modal-header">
          <h2>Sync Decks with Folder</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="deck-sync-modal-content">
          <div className="folder-selection">
            <label>Folder Path:</label>
            <div className="folder-input">
              <input
                id="deck-sync-folder-path"
                type="text"
                placeholder="Select a folder..."
                readOnly
              />
              <button onClick={handleFolderSelect}>Browse...</button>
            </div>
          </div>

          <div className="sync-options">
            <div className="option-group">
              <label>Sync Direction:</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="sync-direction"
                    value="import"
                    defaultChecked={true}
                  />
                  Import Decks
                </label>
                <label>
                  <input
                    type="radio"
                    name="sync-direction"
                    value="export"
                    defaultChecked={false}
                  />
                  Export Decks
                </label>
              </div>
            </div>
          </div>

          {syncProgress.status && (
            <div className="sync-results">
              <h3>Sync Results</h3>

              <div className="results-section">
                <h4>Status: {syncProgress.status}</h4>
                <p>Imported: {syncProgress.imported} decks</p>
                <p>Exported: {syncProgress.exported} decks</p>
              </div>

              {syncProgress.errors.length > 0 && (
                <div className="results-section errors">
                  <h4>Errors ({syncProgress.errors.length})</h4>
                  <ul>
                    {syncProgress.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="deck-sync-modal-footer">
          <div className="deck-count">Total Decks: {decks.length}</div>
          <div className="actions">
            <button
              className="cancel-button"
              onClick={onClose}
              disabled={syncProgress.isProcessing}
            >
              Close
            </button>
            <button
              className="sync-button"
              onClick={() => {
                const direction = document.querySelector(
                  'input[name="sync-direction"]:checked'
                ) as HTMLInputElement;

                if (direction?.value === "export") {
                  // For export, use the existing syncDecksWithFolder function with browser downloads
                  handleSyncWithFolder("Browser Download", "export", "json");
                } else {
                  // For import, check if files have already been selected
                  if (
                    window.selectedDeckFiles &&
                    window.selectedDeckFiles.length > 0
                  ) {
                    // Process the already selected files
                    processSelectedFiles(window.selectedDeckFiles);
                  } else {
                    // No files selected yet, so open the file selector
                    handleFolderSelect();
                  }
                }
              }}
              disabled={syncProgress.isProcessing}
            >
              {syncProgress.isProcessing ? "Syncing..." : "Start Sync"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckSyncModal;
