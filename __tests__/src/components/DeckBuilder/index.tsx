// Add TypeScript declarations for global variables
declare global {
  interface Window {
    selectedDeckFiles?: File[];
  }
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, Deck, DeckBuilderProps, DeckGroup, CardGroup } from "./types";
import DeckList from "./components/DeckList";
import DeckEditor from "./components/DeckEditor/DeckEditor.tsx";
import SearchPanel from "./components/Search/SearchPanel";
import CardGroups from "./components/Search/CardGroups";
import DeckAnalytics from "./components/DeckAnalysis";
import CardModal from "./components/CardModal/CardModal.tsx";
import CardNotification from "./components/CardNotification/CardNotification.tsx";
import CardSuggestions from "./components/CardSuggestion/CardSuggestions.tsx";
import DrawSimulator from "./components/DrawSimulator"; // Fix import path
import DeckSyncModal from "./components/DeckSyncModal/DeckSyncModal";
import { useDeckStorage } from "./hooks/useDeckStorage";
import { useDeckGroups } from "./hooks/useDeckGroups"; // New hook for deck groups
import { useDeckAnalytics } from "./hooks/useDeckAnalytics";
import { useAnalyzerService } from "./hooks/useAnalyzerService";
import { canAddCardToDeck } from "./utils";
import { initializeBanList } from "./services/banListLoader";
import { banListService } from "./services/banListService";
import { syncDecksWithFolder, processFiles } from "../../utils/deckFileSystem";
import { v4 as uuidv4 } from "uuid"; // You'll need to install this dependency
import AppLayout from "../Layout/AppLayout";
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
  const [viewMode, setViewMode] = useState<"cards" | "collections">("cards");
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

  // Use the new deck groups hook
  const {
    deckGroups,
    cardGroups,
    selectedDeckGroup,
    selectedCardGroup,
    setSelectedDeckGroup,
    setSelectedCardGroup,
    createDeckGroup,
    updateDeckGroup,
    deleteDeckGroup,
    moveDeckToGroup,
    getDecksInGroup,
    createCardGroup,
    updateCardGroup,
    deleteCardGroup,
    addCardToGroup,
    removeCardFromGroup,
  } = useDeckGroups();

  const { analyzeDeck } = useDeckAnalytics();
  const {
    analyzeDeckWithService,
    isLoading: analyzerServiceLoading,
    error: analyzerServiceError,
  } = useAnalyzerService();

  // Effect to ensure all decks have IDs
  useEffect(() => {
    // Ensure all decks have IDs for proper management with groups
    decks.forEach((deck) => {
      if (!deck.id) {
        const updatedDeck = {
          ...deck,
          id: uuidv4(),
        };
        updateDeck(updatedDeck);
      }
    });
  }, [decks]);

  // Handle 'edit' parameter in the URL to select a specific deck
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editDeckId = params.get("edit");

    if (editDeckId) {
      try {
        // Check if this deck is already selected
        if (
          selectedDeck &&
          (selectedDeck.id === editDeckId ||
            `deck_${selectedDeck.id}` === editDeckId)
        ) {
          console.log(
            `Deck ${selectedDeck.name} is already selected for editing`
          );
          return;
        }

        // First, check if a deck with this exact ID exists in our loaded decks
        const deckWithExactId = decks.find((d) => d.id === editDeckId);
        if (deckWithExactId) {
          selectDeck(deckWithExactId);
          console.log(`Selected deck for editing: ${deckWithExactId.name}`);
          return;
        }

        // Next, try to load directly from localStorage using the ID as the key
        const storedDeck = localStorage.getItem(editDeckId);
        if (storedDeck) {
          try {
            const parsedDeck = JSON.parse(storedDeck);
            // Ensure the deck has an ID
            if (!parsedDeck.id) {
              parsedDeck.id = editDeckId;
            }

            // Save the updated deck and select it
            updateDeck(parsedDeck);
            selectDeck(parsedDeck);
            console.log(`Loaded deck from localStorage key: ${editDeckId}`);
            return;
          } catch (parseError) {
            console.error(
              `Error parsing deck data for ${editDeckId}:`,
              parseError
            );
          }
        }

        // If we reach here, search through all localStorage to find a deck with this ID inside the object
        const allKeys = Object.keys(localStorage);
        for (const key of allKeys) {
          if (key.startsWith("deck_")) {
            try {
              const deckData = localStorage.getItem(key);
              if (deckData) {
                const parsedDeck = JSON.parse(deckData);
                if (parsedDeck.id === editDeckId) {
                  // Found a deck with this ID in its properties
                  updateDeck(parsedDeck);
                  selectDeck(parsedDeck);
                  console.log(
                    `Found and selected deck by internal ID: ${parsedDeck.name}`
                  );
                  return;
                }
              }
            } catch (error) {
              console.error(`Error checking deck ${key}:`, error);
            }
          }
        }

        // If we still haven't found the deck, show an error message
        // We no longer create a new deck automatically since that's causing duplicates
        console.error(`Deck with ID ${editDeckId} not found.`);
        alert(
          `Could not find the deck you're trying to edit. It may have been deleted.`
        );
      } catch (error) {
        console.error(`Error handling deck edit for ${editDeckId}:`, error);
        alert(
          `Error loading deck: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  }, [decks, selectDeck, updateDeck, selectedDeck]);

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
          // Ensure deck has an ID
          const deckWithId = {
            ...deck,
            id: deck.id || uuidv4(),
          };
          createDeck(deckWithId.name);
          updateDeck(deckWithId);
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

    // Add the deck to storage with ID and selected group
    const newDeck = {
      ...importedDeck,
      id: uuidv4(),
      name: importedDeck.name + " (Imported)",
      groupId: selectedDeckGroup?.id || "default", // Assign to current group if one is selected
      // Make sure sideDeck is properly initialized
      sideDeck: importedDeck.sideDeck || [],
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

  const handleAddCardToCollection = (card: Card) => {
    if (selectedCardGroup) {
      addCardToGroup(selectedCardGroup.id, card);
    } else {
      // If no collection is selected, offer to create one
      const collectionName = prompt("Name for new group:");
      if (collectionName) {
        const newGroup = createCardGroup(collectionName);
        if (newGroup) {
          addCardToGroup(newGroup.id, card);
          setSelectedCardGroup(newGroup);
        }
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

  const handleCreateDeck = (name: string, groupId?: string) => {
    // Create a deck with an ID and assign it to the specified group or current group
    const newDeck = createDeck(name);
    if (newDeck && (groupId || selectedDeckGroup)) {
      const updatedDeck = {
        ...newDeck,
        id: newDeck.id || uuidv4(),
        groupId: groupId || selectedDeckGroup?.id,
      };
      updateDeck(updatedDeck);
      return updatedDeck;
    }
    return newDeck;
  };

  const handleMoveDeckToGroup = (deckId: string, groupId: string) => {
    const result = moveDeckToGroup(deckId, groupId);

    // Update UI by refreshing the entire deck list
    if (result) {
      // Find the updated deck in local storage and update local state
      const updatedDeck = decks.find((d) => d.id === deckId);
      if (updatedDeck) {
        // Create an updated copy with the new groupId
        const refreshedDeck = {
          ...updatedDeck,
          groupId: groupId,
          lastModified: new Date().toISOString(),
        };

        // Force a UI update by updating the deck
        updateDeck(refreshedDeck);

        // If this was the selected deck, update the selection to show changes immediately
        if (selectedDeck?.id === deckId) {
          selectDeck(refreshedDeck);
        }
      }
    }
    return result;
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

  const handleAddAllCardsFromGroup = (cardsToAdd: Card[]) => {
    if (!selectedDeck || cardsToAdd.length === 0) return;

    // Create a copy of the current deck to batch all updates
    let updatedMainDeck = [...selectedDeck.mainDeck];
    let updatedExtraDeck = [...selectedDeck.extraDeck];
    let updatedSideDeck = selectedDeck.sideDeck
      ? [...selectedDeck.sideDeck]
      : [];

    let addedCount = 0;
    let skippedCount = 0;

    // Process all cards first before updating the deck
    cardsToAdd.forEach((card) => {
      if (canAddCardToDeck(selectedDeck, card.id)) {
        // Determine which deck section to add to
        if (targetDeck === "main") {
          // Check if it's an extra deck card
          if (
            card.type &&
            ["XYZ", "Synchro", "Fusion", "Link"].some((type) =>
              card.type.includes(type)
            )
          ) {
            updatedExtraDeck.push(card);
          } else {
            updatedMainDeck.push(card);
          }
        } else {
          updatedSideDeck.push(card);
        }
        addedCount++;
      } else {
        skippedCount++;
      }
    });

    // Now update the deck with all changes at once
    const updatedDeck = {
      ...selectedDeck,
      mainDeck: updatedMainDeck,
      extraDeck: updatedExtraDeck,
      sideDeck: updatedSideDeck,
    };

    updateDeck(updatedDeck);
    selectDeck(updatedDeck); // Update selection to refresh the UI

    console.log(
      `Added ${addedCount} cards to deck. Skipped ${skippedCount} cards (limit of 3 copies reached).`
    );
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
            id: uuidv4(),
            name: deck.name.endsWith(" (Imported)")
              ? deck.name
              : deck.name + " (Imported)",
            importedAt: new Date().toISOString(),
            groupId: selectedDeckGroup?.id || "default",
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
            id: uuidv4(),
            name: deck.name.endsWith(" (Imported)")
              ? deck.name
              : deck.name + " (Imported)",
            importedAt: new Date().toISOString(),
            groupId: selectedDeckGroup?.id || "default",
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

  // Calculate group stats for decks
  const calculateGroupStats = useCallback(() => {
    const stats: Record<string, { count: number; decks: Deck[] }> = {};

    // Initialize all groups
    deckGroups.forEach((group) => {
      stats[group.id] = { count: 0, decks: [] };
    });

    // Count decks per group
    decks.forEach((deck) => {
      const groupId = deck.groupId || "default";
      if (!stats[groupId]) {
        stats[groupId] = { count: 0, decks: [] };
      }
      stats[groupId].count++;
      stats[groupId].decks.push(deck);
    });

    return stats;
  }, [decks, deckGroups]);

  const groupStats = calculateGroupStats();

  return (
    <AppLayout>
      <div className="deck-builder">
        <div className="page-header">
          <h1>Deck Builder</h1>
        </div>
        <div className="builder-container">
          <div className="decks-panel">
            <DeckList
              decks={decks}
              selectedDeck={selectedDeck}
              onSelectDeck={selectDeck}
              onDeleteDeck={handleDeleteDeck}
              copyDeck={copyDeck}
              onCreateDeck={handleCreateDeck}
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
              // New props for deck groups
              deckGroups={deckGroups}
              selectedGroup={selectedDeckGroup}
              onSelectGroup={setSelectedDeckGroup}
              onCreateGroup={createDeckGroup}
              onUpdateGroup={updateDeckGroup}
              onDeleteGroup={deleteDeckGroup}
              onMoveDeckToGroup={handleMoveDeckToGroup}
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
                    onClick={() =>
                      handleCreateDeck(
                        `New Deck ${decks.length + 1}`,
                        selectedDeckGroup?.id
                      )
                    }
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

          {/* Always render the search panel, regardless of whether a deck is selected */}
          <div className="search-panel">
            <div className="view-mode-toggle search-view-toggle">
              <button
                className={`view-mode-button ${
                  viewMode === "cards" ? "active" : ""
                }`}
                onClick={() => setViewMode("cards")}
              >
                Cards
              </button>
              <button
                className={`view-mode-button ${
                  viewMode === "collections" ? "active" : ""
                }`}
                onClick={() => setViewMode("collections")}
              >
                Groups
              </button>
            </div>

            {viewMode === "cards" ? (
              <SearchPanel
                onCardSelect={toggleCardPreview}
                onCardAdd={handleAddCard}
                onToggleFavorite={handleToggleFavorite}
                onAddToCollection={handleAddCardToCollection}
                targetDeck={targetDeck}
                onTargetDeckChange={setTargetDeck}
              />
            ) : (
              <CardGroups
                cardGroups={cardGroups}
                selectedGroup={selectedCardGroup}
                onSelectGroup={setSelectedCardGroup}
                onCreateGroup={createCardGroup}
                onUpdateGroup={updateCardGroup}
                onDeleteGroup={deleteCardGroup}
                onAddCardToGroup={addCardToGroup}
                onRemoveCardFromGroup={removeCardFromGroup}
                onCardSelect={toggleCardPreview}
                onAddCardToDeck={handleAddCard}
                onAddAllCardsFromGroup={handleAddAllCardsFromGroup}
              />
            )}

            {selectedDeck && viewMode === "cards" && (
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
            onAddToCollection={handleAddCardToCollection}
          />
        )}

        {lastAddedCard && <CardNotification card={lastAddedCard} />}

        {/* Deck Sync Modal */}
        <DeckSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          decks={decks}
          selectedDeckGroupId={selectedDeckGroup?.id}
          updateDeck={updateDeck}
        />
      </div>
    </AppLayout>
  );
};

export default DeckBuilder;
