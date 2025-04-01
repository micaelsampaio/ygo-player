import React, { useState, useEffect } from "react";
import { Card, Deck, DeckBuilderProps } from "./types";
import DeckList from "./components/DeckList";
import DeckEditor from "./components/DeckEditor/DeckEditor.tsx";
import SearchPanel from "./components/Search/SearchPanel";
import DeckAnalytics from "./components/DeckAnalysis";
import CardModal from "./components/CardModal/CardModal.tsx";
import CardNotification from "./components/CardNotification/CardNotification.tsx";
import CardSuggestions from "./components/CardSuggestion/CardSuggestions.tsx";
import { useDeckStorage } from "./hooks/useDeckStorage";
import { useDeckAnalytics } from "./hooks/useDeckAnalytics";
import "./DeckBuilder.css";

const DeckBuilder: React.FC<DeckBuilderProps> = ({ initialDecks = [] }) => {
  // State
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deckAnalytics, setDeckAnalytics] =
    useState<
      ReturnType<typeof useDeckAnalytics>["analyzeDeck"] extends (
        deck: Deck
      ) => infer R
        ? R
        : never | null
    >(null);

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
    removeCardFromDeck,
  } = useDeckStorage();

  const { analyzeDeck } = useDeckAnalytics();

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

  // Update analytics whenever the selected deck changes
  useEffect(() => {
    if (selectedDeck) {
      const analytics = analyzeDeck(selectedDeck);
      setDeckAnalytics(analytics);
    } else {
      setDeckAnalytics(null);
    }
  }, [selectedDeck, analyzeDeck]);

  // Event handlers
  const toggleCardPreview = (card: Card) => {
    setPreviewCard(card);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setPreviewCard(null), 300);
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

  const handleRenameDeck = (newName: string) => {
    if (!selectedDeck) return;

    const updatedDeck = {
      ...selectedDeck,
      name: newName,
    };

    // This will update both storage and state
    updateDeck(updatedDeck);
  };

  const handleClearDeck = () => {
    if (!selectedDeck) return;

    const clearedDeck = {
      ...selectedDeck,
      mainDeck: [],
      extraDeck: [],
    };

    updateDeck(clearedDeck);
    selectDeck(clearedDeck);
  };

  const handleAddCard = (card: Card) => {
    if (selectedDeck) {
      addCardToDeck(card);
    }
  };

  const handleDeleteDeck = (deckToDelete: Deck) => {
    deleteDeck(deckToDelete.name);
  };

  return (
    <div className="deck-builder">
      <div className="builder-container">
        <div className="decks-panel">
          <DeckList
            decks={decks}
            selectedDeck={selectedDeck}
            onSelectDeck={selectDeck}
            onCreateDeck={createDeck}
            onImportDeck={handleImportDeck}
            onDeleteDeck={handleDeleteDeck} // Pass the new handler
          />
        </div>

        <div className="editor-panel">
          <div className="search-controls">
            <div className="search-toggle">
              <button
                className={!isSearchVisible ? "active-search" : ""}
                onClick={() => setIsSearchVisible(false)}
              >
                Deck Editor
              </button>
              <button
                className={isSearchVisible ? "active-search" : ""}
                onClick={() => setIsSearchVisible(true)}
              >
                Card Search
              </button>
            </div>
          </div>

          {isSearchVisible ? (
            <SearchPanel
              onCardSelect={toggleCardPreview}
              onCardAdd={handleAddCard}
            />
          ) : (
            <DeckEditor
              deck={selectedDeck}
              onCardSelect={toggleCardPreview}
              onCardRemove={removeCardFromDeck}
              onRenameDeck={handleRenameDeck} // Pass the handler here
              onClearDeck={handleClearDeck}
            />
          )}
        </div>

        <div className="analytics-panel">
          <DeckAnalytics analytics={deckAnalytics} />
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
        />
      )}

      {lastAddedCard && <CardNotification card={lastAddedCard} />}
    </div>
  );
};

export default DeckBuilder;
