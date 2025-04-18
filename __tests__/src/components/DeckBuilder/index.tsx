// Add TypeScript declarations for global variables
declare global {
  interface Window {
    selectedDeckFiles?: File[];
  }
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, Deck, DeckBuilderProps } from "./types";
import DeckList from "./components/DeckList";
import DeckEditor from "./components/DeckEditor/DeckEditor.tsx";
import SearchPanel from "./components/Search/SearchPanel";
import DeckAnalytics from "./components/DeckAnalysis";
import CardModal from "./components/CardModal/CardModal.tsx";
import CardNotification from "./components/CardNotification/CardNotification.tsx";
import CardSuggestions from "./components/CardSuggestion/CardSuggestions.tsx";
import DrawSimulator from "./components/DrawSimulator"; // Fix import path
import { useDeckStorage } from "./hooks/useDeckStorage";
import { useDeckAnalytics } from "./hooks/useDeckAnalytics";
import { useAnalyzerService } from "./hooks/useAnalyzerService";
import { canAddCardToDeck } from "./utils";
import { initializeBanList } from "./services/banListLoader";
import { banListService } from "./services/banListService";
import { syncDecksWithFolder, processFiles } from "../../utils/deckFileSystem";
import "./DeckBuilder.css";

const DeckBuilder: React.FC<DeckBuilderProps> = ({ initialDecks = [] }) => {
  // State
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deckAnalytics, setDeckAnalytics] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "editor" | "simulator" | "analytics"
  >("editor");
  const [targetDeck, setTargetDeck] = useState<"main" | "side">("main");
  const [analyticsCalculated, setAnalyticsCalculated] = useState(false);
  const [useEnhancedAnalysis, setUseEnhancedAnalysis] = useState(false); // Set to false by default
  const [showEnhancedAnalysisToggle, setShowEnhancedAnalysisToggle] =
    useState(false);
  const [isEditingDeckName, setIsEditingDeckName] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    isProcessing: boolean;
    status: string;
    imported: number;
    exported: number;
    errors: string[];
  }>({
    isProcessing: false,
    status: "",
    imported: 0,
    exported: 0,
    errors: [],
  });
  const deckNameInputRef = useRef<HTMLInputElement>(null);

  // Custom hooks
  const {
    decks,
    selectedDeck,
    lastAddedCard,
    createDeck,
    selectDeck,
    updateDeck,
    deleteDeck,
    addCardToDeck,
    addCardToSideDeck,
    removeCardFromDeck,
    removeCardFromSideDeck,
    moveCardBetweenDecks,
    copyDeck,
  } = useDeckStorage();

  const { analyzeDeck } = useDeckAnalytics();
  const {
    analyzeDeckWithService,
    isLoading: analyzerServiceLoading,
    error: analyzerServiceError,
  } = useAnalyzerService();

  // Initialize ban list when component mounts
  useEffect(() => {
    console.log("Initializing Yu-Gi-Oh ban list...");

    // First load the ban list from our local JSON
    initializeBanList();

    // Then optionally fetch the latest ban list from the API
    // This is done asynchronously and will update the cache when complete
    banListService
      .getBanList("tcg", true)
      .then((banList) => {
        console.log(
          `Fetched latest TCG ban list with ${
            Object.keys(banList).length
          } entries`
        );
      })
      .catch((err) => {
        console.error(
          "Failed to fetch latest ban list, using local data:",
          err
        );
      });
  }, []);

  // Calculate analytics only when we select the analytics tab
  // instead of on every deck change
  const calculateDeckAnalytics = useCallback(async () => {
    if (selectedDeck && !isAnalyzing) {
      setIsAnalyzing(true);
      setDeckAnalytics(null); // Clear previous analytics while calculating

      try {
        // Always start with local analysis first to ensure basic metrics are always available
        const localAnalytics = analyzeDeck(selectedDeck);

        // If enhanced analysis is enabled, try to enhance the local analytics
        if (useEnhancedAnalysis) {
          // Try to use the enhanced analyzer service
          console.log(
            "Using enhanced analyzer service for deck:",
            selectedDeck.name
          );
          console.log("Making API request to analyzer service...");

          // Show loading state for analyzer service
          console.log(
            "Analyzer service loading state:",
            analyzerServiceLoading
          );

          const enhancedAnalytics = await analyzeDeckWithService(selectedDeck);

          if (enhancedAnalytics) {
            console.log("Enhanced analytics received:", enhancedAnalytics);
            // Make sure we preserve all basic metrics from local analytics first
            const mergedAnalytics = {
              // Start with ALL local analytics data to ensure basic metrics are preserved
              ...localAnalytics,
              // Then add enhanced fields, being careful not to override core metrics
              archetype:
                enhancedAnalytics.archetype || localAnalytics.archetype,
              strategy: enhancedAnalytics.strategy,
              mainCombos: enhancedAnalytics.mainCombos,
              strengths: enhancedAnalytics.strengths,
              weaknesses: enhancedAnalytics.weaknesses,
              counters: enhancedAnalytics.counters,
              recommendedTechs: enhancedAnalytics.recommendedTechs,
              confidenceScore: enhancedAnalytics.confidenceScore,
              // Ensure these critical fields from local analytics are preserved
              monsterCount: localAnalytics.monsterCount,
              spellCount: localAnalytics.spellCount,
              trapCount: localAnalytics.trapCount,
              typeDistribution: localAnalytics.typeDistribution,
              attributeDistribution: localAnalytics.attributeDistribution,
              levelDistribution: localAnalytics.levelDistribution,
              potentialArchetypes: localAnalytics.potentialArchetypes,
            };
            setDeckAnalytics(mergedAnalytics);
            setShowEnhancedAnalysisToggle(true);
          } else {
            // Use local analysis if the service failed
            console.log("Enhanced analyzer failed, using local analysis");
            setDeckAnalytics(localAnalytics);
          }
        } else {
          // Just use the local analyzer if enhanced analysis is disabled
          console.log("Using local analyzer only");
          setDeckAnalytics(localAnalytics);
          setShowEnhancedAnalysisToggle(true);
        }
      } catch (error) {
        console.error("Error during deck analysis:", error);
        // Fall back to local analysis in case of any error
        const localAnalytics = analyzeDeck(selectedDeck);
        setDeckAnalytics(localAnalytics);
      } finally {
        setIsAnalyzing(false);
        setAnalyticsCalculated(true);
      }
    }
  }, [
    selectedDeck,
    isAnalyzing,
    analyzeDeck,
    analyzeDeckWithService,
    useEnhancedAnalysis,
    analyzerServiceLoading, // Add this to the dependency array
  ]);

  // Reset analytics calculated flag when deck changes
  useEffect(() => {
    setAnalyticsCalculated(false);
  }, [selectedDeck]);

  // Load initial decks
  useEffect(() => {
    if (initialDecks.length > 0) {
      initialDecks.forEach((deck) => {
        // Add the deck if it doesn't already exist
        if (!decks.some((d) => d.name === deck.name)) {
          createDeck(deck.name);
          updateDeck(deck);
        }
      });
    }
  }, [initialDecks, decks, createDeck, updateDeck]);

  // Event handlers
  const toggleCardPreview = (card: Card) => {
    setPreviewCard(card);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setPreviewCard(null), 300);
  };

  const handleTabChange = (tab: "editor" | "simulator" | "analytics") => {
    setActiveTab(tab);

    // Calculate analytics only if switching to analytics tab and they haven't been calculated yet
    if (tab === "analytics" && !analyticsCalculated && selectedDeck) {
      calculateDeckAnalytics();
    }
  };

  // Toggle between enhanced and basic analysis
  const toggleEnhancedAnalysis = async (newState) => {
    // Force the correct state - don't just toggle
    console.log(
      `🔄 DeckBuilder: toggleEnhancedAnalysis called with state: ${newState}`
    );

    setUseEnhancedAnalysis(newState);

    // We don't need to recalculate here since the child component
    // already fetched and processed the enhanced data
    if (newState) {
      console.log(
        `🧮 Enhanced analysis state updated for "${selectedDeck?.name}", using already fetched data`
      );
    } else {
      // If turning off enhanced mode, we need to revert to local analytics
      setAnalyticsCalculated(false);
      calculateDeckAnalytics();
    }

    console.log(`Enhanced analysis toggled to: ${newState ? "ON" : "OFF"}`);
  };

  const handleImportDeck = (importedDeck: Deck) => {
    // Validate the imported deck structure
    if (
      !importedDeck.name ||
      !Array.isArray(importedDeck.mainDeck) ||
      !Array.isArray(importedDeck.extraDeck)
    ) {
      alert("Invalid deck format");
      return;
    }

    // Add the deck to storage
    const newDeck = {
      ...importedDeck,
      name: importedDeck.name + " (Imported)",
    };

    // Use your existing deck storage mechanism
    updateDeck(newDeck);
    selectDeck(newDeck);
  };

  const handleRenameDeck = (deck: Deck, newName: string) => {
    if (!deck) return;

    const updatedDeck = {
      ...deck,
      name: newName,
    };

    // This will update both storage and state
    updateDeck(updatedDeck);

    // If this was the selected deck, update the selection
    if (selectedDeck && selectedDeck.name === deck.name) {
      selectDeck(updatedDeck);
    }
  };

  const handleClearDeck = (deck: Deck) => {
    if (!deck) return;

    const clearedDeck = {
      ...deck,
      mainDeck: [],
      extraDeck: [],
    };

    updateDeck(clearedDeck);

    // If this was the selected deck, update the selection
    if (selectedDeck && selectedDeck.name === deck.name) {
      selectDeck(clearedDeck);
    }
  };

  const handleAddCard = (card: Card) => {
    if (selectedDeck) {
      if (!canAddCardToDeck(selectedDeck, card.id)) {
        alert("Cannot add more than 3 copies of the same card");
        return;
      }

      // Add to main/extra or side deck based on targetDeck setting
      if (targetDeck === "main") {
        addCardToDeck(card);
      } else {
        addCardToSideDeck(card);
      }
    }
  };

  const handleDeleteDeck = (deckToDelete: Deck) => {
    deleteDeck(deckToDelete.name);

    // If this was the selected deck, clear the selection
    if (selectedDeck && selectedDeck.name === deckToDelete.name) {
      selectDeck(null);
    }
  };

  const handleReorderCards = (
    sourceIndex: number,
    destinationIndex: number,
    isExtraDeck: boolean,
    isSideDeck: boolean = false
  ) => {
    if (!selectedDeck) return;

    let deckSection;
    if (isExtraDeck) {
      deckSection = selectedDeck.extraDeck;
    } else if (isSideDeck) {
      deckSection = selectedDeck.sideDeck;
    } else {
      deckSection = selectedDeck.mainDeck;
    }

    const reorderedCards = Array.from(deckSection);
    const [removed] = reorderedCards.splice(sourceIndex, 1);
    reorderedCards.splice(destinationIndex, 0, removed);

    const updatedDeck = {
      ...selectedDeck,
    };

    if (isExtraDeck) {
      updatedDeck.extraDeck = reorderedCards;
    } else if (isSideDeck) {
      updatedDeck.sideDeck = reorderedCards;
    } else {
      updatedDeck.mainDeck = reorderedCards;
    }

    updateDeck(updatedDeck);
  };

  const handleToggleFavorite = (card: Card) => {
    const updatedCard = { ...card, isFavorite: !card.isFavorite };

    // Update preview card if modal is open
    if (previewCard && previewCard.id === card.id) {
      setPreviewCard(updatedCard);
    }

    // Update localStorage
    const storedFavorites = JSON.parse(
      localStorage.getItem("favoriteCards") || "[]"
    );

    let newFavorites;
    if (updatedCard.isFavorite) {
      // Add to favorites
      newFavorites = storedFavorites.filter((f: Card) => f.id !== card.id);
      newFavorites.push(updatedCard);
    } else {
      // Remove from favorites
      newFavorites = storedFavorites.filter((f: Card) => f.id !== card.id);
    }

    localStorage.setItem("favoriteCards", JSON.stringify(newFavorites));

    // Dispatch event to notify SearchPanel
    window.dispatchEvent(new Event("favoritesUpdated"));
  };

  const handleDeckNameEdit = () => {
    setIsEditingDeckName(true);
    setTimeout(() => {
      deckNameInputRef.current?.focus();
    }, 0);
  };

  const handleDeckNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedDeck) {
      handleRenameDeck(selectedDeck, e.target.value);
    }
  };

  const handleDeckNameBlur = () => {
    setIsEditingDeckName(false);
  };

  // Deck sync functionality
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
          // Add custom import suffix to avoid name collisions
          const importedDeck = {
            ...deck,
            name: deck.name.endsWith(" (Imported)")
              ? deck.name
              : deck.name + " (Imported)",
            importedAt: new Date().toISOString(),
          };
          updateDeck(importedDeck);
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
        errors: [`Error during sync: ${error.message}`],
      });
      alert(`Error during sync: ${error.message}`);
    }
  };

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
          // Add custom import suffix to avoid name collisions
          const importedDeck = {
            ...deck,
            name: deck.name.endsWith(" (Imported)")
              ? deck.name
              : deck.name + " (Imported)",
            importedAt: new Date().toISOString(),
          };
          updateDeck(importedDeck);
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

  // Helper function to read file contents
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  return (
    <div className="deck-builder">
      <div className="builder-container">
        <div className="decks-panel">
          <DeckList
            decks={decks}
            selectedDeck={selectedDeck}
            onSelectDeck={selectDeck}
            onDeleteDeck={handleDeleteDeck}
            copyDeck={copyDeck}
            onCreateDeck={createDeck}
            onRenameDeck={handleRenameDeck}
            onClearDeck={handleClearDeck}
            onImportDeck={handleImportDeck}
            onCreateCollection={(deck) => {
              // Implement createCollection functionality
              if (deck) {
                console.log("Creating collection from deck:", deck.name);
                // This would typically interact with your collection system
              }
            }}
            onSyncDecks={() => setIsSyncModalOpen(true)}
          />
        </div>

        <div className="editor-panel">
          <div className="editor-header-container">
            {selectedDeck && (
              <div className="deck-header">
                {isEditingDeckName ? (
                  <input
                    ref={deckNameInputRef}
                    type="text"
                    value={selectedDeck.name}
                    onChange={handleDeckNameChange}
                    onBlur={handleDeckNameBlur}
                    className="deck-name-input"
                  />
                ) : (
                  <h2
                    onClick={handleDeckNameEdit}
                    className="clickable-deck-name"
                  >
                    {selectedDeck.name}
                  </h2>
                )}
              </div>
            )}

            <div className="editor-tabs">
              <button
                className={activeTab === "editor" ? "active-tab" : ""}
                onClick={() => handleTabChange("editor")}
                disabled={!selectedDeck}
              >
                Deck Editor
              </button>
              <button
                className={activeTab === "analytics" ? "active-tab" : ""}
                onClick={() => handleTabChange("analytics")}
                disabled={!selectedDeck}
              >
                Deck Analytics
              </button>
              <button
                className={activeTab === "simulator" ? "active-tab" : ""}
                onClick={() => handleTabChange("simulator")}
                disabled={!selectedDeck}
              >
                Draw Simulator
              </button>

              {/* Removed Enhanced Analysis toggle from here as it's now handled by the badge */}
            </div>
          </div>

          <div className="editor-panel-content">
            {!selectedDeck ? (
              <div className="no-deck-selected">
                <h3>No Deck Selected</h3>
                <p>
                  Select a deck from the left panel or create a new one to
                  begin.
                </p>
                <button
                  className="action-btn"
                  onClick={() => createDeck(`New Deck ${decks.length + 1}`)}
                >
                  Create New Deck
                </button>
              </div>
            ) : activeTab === "editor" ? (
              <DeckEditor
                deck={selectedDeck}
                onCardSelect={toggleCardPreview}
                onCardRemove={(card, index, isExtraDeck, isSideDeck) =>
                  isSideDeck
                    ? removeCardFromSideDeck(card, index)
                    : removeCardFromDeck(card, index, isExtraDeck)
                }
                onRenameDeck={(newName) =>
                  selectedDeck && handleRenameDeck(selectedDeck, newName)
                }
                onClearDeck={() =>
                  selectedDeck && handleClearDeck(selectedDeck)
                }
                onReorderCards={handleReorderCards}
                onMoveCardBetweenDecks={moveCardBetweenDecks}
                updateDeck={updateDeck}
              />
            ) : activeTab === "simulator" ? (
              <DrawSimulator
                deck={selectedDeck}
                onCardSelect={toggleCardPreview}
              />
            ) : (
              <DeckAnalytics
                analytics={deckAnalytics}
                deck={selectedDeck}
                isVisible={activeTab === "analytics"}
                isLoading={isAnalyzing}
                isEnhanced={useEnhancedAnalysis && !analyzerServiceError}
                onToggleEnhanced={(newState) => {
                  toggleEnhancedAnalysis(newState);
                }}
              />
            )}
          </div>
        </div>

        <div className="search-panel">
          <SearchPanel
            onCardSelect={toggleCardPreview}
            onCardAdd={handleAddCard}
            onToggleFavorite={handleToggleFavorite}
            targetDeck={targetDeck}
            onTargetDeckChange={setTargetDeck}
          />
          {selectedDeck && (
            <CardSuggestions
              deck={selectedDeck}
              onAddCardToDeck={handleAddCard}
            />
          )}
        </div>
      </div>

      {previewCard && (
        <CardModal
          card={previewCard}
          isOpen={isModalOpen}
          onClose={closeModal}
          onAddCard={selectedDeck ? handleAddCard : undefined}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {lastAddedCard && <CardNotification card={lastAddedCard} />}

      {/* Deck Sync Modal */}
      {isSyncModalOpen && (
        <div className="deck-sync-modal-overlay">
          <div className="deck-sync-modal">
            <div className="deck-sync-modal-header">
              <h2>Sync Decks with Folder</h2>
              <button
                className="close-button"
                onClick={() => setIsSyncModalOpen(false)}
              >
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
                  onClick={() => setIsSyncModalOpen(false)}
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
                      handleSyncWithFolder(
                        "Browser Download",
                        "export",
                        "json"
                      );
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
      )}
    </div>
  );
};

export default DeckBuilder;
