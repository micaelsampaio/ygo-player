import React, { useState, useEffect, useCallback } from "react";
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
  const [useEnhancedAnalysis, setUseEnhancedAnalysis] = useState(true);
  const [showEnhancedAnalysisToggle, setShowEnhancedAnalysisToggle] =
    useState(false);

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
        if (useEnhancedAnalysis) {
          // First try to use the enhanced analyzer service
          console.log("Using enhanced analyzer service");
          const enhancedAnalytics = await analyzeDeckWithService(selectedDeck);

          if (enhancedAnalytics) {
            setDeckAnalytics(enhancedAnalytics);
            setShowEnhancedAnalysisToggle(true);
          } else {
            // Fall back to local analysis if the service failed
            console.log("Enhanced analyzer failed, using local analysis");
            const localAnalytics = analyzeDeck(selectedDeck);
            setDeckAnalytics(localAnalytics);
          }
        } else {
          // Just use the local analyzer if enhanced analysis is disabled
          console.log("Using local analyzer only");
          const localAnalytics = analyzeDeck(selectedDeck);
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
  const toggleEnhancedAnalysis = () => {
    setUseEnhancedAnalysis(!useEnhancedAnalysis);
    setAnalyticsCalculated(false); // Force recalculation

    // Recalculate if we're currently on analytics tab
    if (activeTab === "analytics" && selectedDeck) {
      calculateDeckAnalytics();
    }
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
          />
        </div>

        <div className="editor-panel">
          <div className="editor-tabs">
            <button
              className={activeTab === "editor" ? "active-tab" : ""}
              onClick={() => handleTabChange("editor")}
            >
              Deck Editor
            </button>
            <button
              className={activeTab === "analytics" ? "active-tab" : ""}
              onClick={() => handleTabChange("analytics")}
            >
              Deck Analytics
            </button>
            <button
              className={activeTab === "simulator" ? "active-tab" : ""}
              onClick={() => handleTabChange("simulator")}
            >
              Draw Simulator
            </button>

            {showEnhancedAnalysisToggle && activeTab === "analytics" && (
              <div className="analysis-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={useEnhancedAnalysis}
                    onChange={toggleEnhancedAnalysis}
                  />
                  Enhanced Analysis
                </label>
                {isAnalyzing && (
                  <span className="analyzing-indicator">Analyzing...</span>
                )}
                {analyzerServiceError && !isAnalyzing && (
                  <span className="error-indicator">Service Error</span>
                )}
              </div>
            )}
          </div>

          {activeTab === "editor" && (
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
              onClearDeck={() => selectedDeck && handleClearDeck(selectedDeck)}
              onReorderCards={handleReorderCards}
              onMoveCardBetweenDecks={moveCardBetweenDecks}
              updateDeck={updateDeck}
            />
          )}
          {activeTab === "simulator" && (
            <DrawSimulator
              deck={selectedDeck}
              onCardSelect={toggleCardPreview}
            />
          )}
          {activeTab === "analytics" && (
            <DeckAnalytics
              analytics={deckAnalytics}
              deck={selectedDeck}
              isVisible={activeTab === "analytics"}
              isLoading={isAnalyzing}
              isEnhanced={useEnhancedAnalysis && !analyzerServiceError}
            />
          )}
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
    </div>
  );
};

export default DeckBuilder;
