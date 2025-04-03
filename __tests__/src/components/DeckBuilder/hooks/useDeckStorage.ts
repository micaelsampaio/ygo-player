import { useState, useEffect } from "react";
import { Card, Deck } from "../types";

/**
 * Custom hook for managing deck storage, retrieval, and modifications
 */
export function useDeckStorage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [lastAddedCard, setLastAddedCard] = useState<Card | null>(null);

  // Load available decks from localStorage
  useEffect(() => {
    try {
      const availableDecks: Deck[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("deck_")) {
          try {
            const deckData = localStorage.getItem(key);
            if (deckData) {
              const deck = JSON.parse(deckData);
              // Validate the deck structure
              if (
                deck.name &&
                Array.isArray(deck.mainDeck) &&
                Array.isArray(deck.extraDeck)
              ) {
                availableDecks.push(deck);
              }
            }
          } catch (parseError) {
            console.error(`Error parsing deck data for ${key}:`, parseError);
          }
        }
      }
      setDecks(availableDecks);
    } catch (error) {
      console.error("Error loading decks from localStorage:", error);
    }
  }, []);

  /**
   * Updates the local and localStorage copies of a deck
   */
  const updateDeckStorage = (updatedDeck: Deck) => {
    try {
      // Save updated deck to localStorage
      localStorage.setItem(
        `deck_${updatedDeck.name}`,
        JSON.stringify(updatedDeck)
      );

      // Update decks list if needed
      setDecks((prevDecks) => {
        const index = prevDecks.findIndex((d) => d.name === updatedDeck.name);
        if (index !== -1) {
          const newDecks = [...prevDecks];
          newDecks[index] = updatedDeck;
          return newDecks;
        }
        return prevDecks;
      });
    } catch (error) {
      console.error("Error updating deck storage:", error);
    }
  };

  /**
   * Selects a deck for editing
   */
  const selectDeck = (deck: Deck) => {
    setSelectedDeck(deck);
  };

  /**
   * Adds a card to the selected deck
   */
  const addCardToDeck = (card: Card) => {
    if (!selectedDeck) return;

    // Check if it's an Extra Deck card
    const isExtraDeck = ["XYZ", "Synchro", "Fusion", "Link"].some((type) =>
      card.type.includes(type)
    );

    const updatedDeck = { ...selectedDeck };

    // Add card to appropriate deck section
    if (isExtraDeck) {
      if (updatedDeck.extraDeck.length < 15) {
        updatedDeck.extraDeck = [...updatedDeck.extraDeck, card];
      } else {
        alert("Extra deck can't have more than 15 cards");
        return;
      }
    } else {
      if (updatedDeck.mainDeck.length < 60) {
        updatedDeck.mainDeck = [...updatedDeck.mainDeck, card];
      } else {
        alert("Main deck can't have more than 60 cards");
        return;
      }
    }

    setSelectedDeck(updatedDeck);
    updateDeckStorage(updatedDeck);

    // Set last added card for notification
    setLastAddedCard(card);
    setTimeout(() => setLastAddedCard(null), 1500);
  };

  /**
   * Removes a card from the selected deck
   */
  const removeCardFromDeck = (
    card: Card,
    index: number,
    isExtraDeck: boolean
  ) => {
    if (!selectedDeck) return;

    const updatedDeck = { ...selectedDeck };

    if (isExtraDeck) {
      updatedDeck.extraDeck = updatedDeck.extraDeck.filter(
        (_, idx) => idx !== index
      );
    } else {
      updatedDeck.mainDeck = updatedDeck.mainDeck.filter(
        (_, idx) => idx !== index
      );
    }

    setSelectedDeck(updatedDeck);
    updateDeckStorage(updatedDeck);
  };

  /**
   * Creates a new deck
   */
  const createDeck = (name: string) => {
    // Check if deck with same name already exists
    if (decks.some((deck) => deck.name === name)) {
      alert(`A deck named "${name}" already exists.`);
      return null;
    }

    const newDeck: Deck = {
      name, // The new deck name
      mainDeck: [], // Initialize empty main deck
      extraDeck: [], // Initialize empty extra deck
    };

    // Save to localStorage
    try {
      localStorage.setItem(`deck_${name}`, JSON.stringify(newDeck));

      // Update decks list
      setDecks((prevDecks) => [...prevDecks, newDeck]);

      // Select the new deck
      setSelectedDeck(newDeck);

      return newDeck;
    } catch (error) {
      console.error("Error creating new deck:", error);
      alert("Failed to create new deck. Please try again.");
      return null;
    }
  };

  /**
   * Updates an existing deck
   */
  const updateDeck = (updatedDeck: Deck) => {
    if (!updatedDeck?.name) return;

    setSelectedDeck(updatedDeck);
    updateDeckStorage(updatedDeck);
  };

  /**
   * Deletes a deck
   */
  const deleteDeck = (deckName: string) => {
    try {
      // Remove from localStorage
      localStorage.removeItem(`deck_${deckName}`);

      // Update decks list
      setDecks((prevDecks) =>
        prevDecks.filter((deck) => deck.name !== deckName)
      );

      // Clear selection if the deleted deck was selected
      if (selectedDeck?.name === deckName) {
        setSelectedDeck(null);
      }

      return true;
    } catch (error) {
      console.error("Error deleting deck:", error);
      return false;
    }
  };

  /**
   * Imports a deck
   */
  const importDeck = (importedDeck: Deck, appendName = " (Imported)") => {
    // Validate the imported deck structure
    if (
      !importedDeck?.name ||
      !Array.isArray(importedDeck.mainDeck) ||
      !Array.isArray(importedDeck.extraDeck)
    ) {
      return null;
    }

    const deckName = importedDeck.name + appendName;

    // Check for duplicate names
    if (decks.some((deck) => deck.name === deckName)) {
      const timestamp = new Date().toISOString().slice(0, 10);
      importedDeck.name = `${deckName} ${timestamp}`;
    } else {
      importedDeck.name = deckName;
    }

    try {
      // Save to localStorage
      localStorage.setItem(
        `deck_${importedDeck.name}`,
        JSON.stringify(importedDeck)
      );

      // Update decks list
      setDecks((prevDecks) => [...prevDecks, importedDeck]);

      // Select the imported deck
      setSelectedDeck(importedDeck);

      return importedDeck;
    } catch (error) {
      console.error("Error importing deck:", error);
      return null;
    }
  };

  /**
   * Creates a copy of an existing deck
   */
  const copyDeck = (deckToCopy: Deck) => {
    const copyName = `${deckToCopy.name} (Copy)`;

    // Check if name exists and generate unique name if needed
    let finalName = copyName;
    let counter = 1;
    while (decks.some((deck) => deck.name === finalName)) {
      finalName = `${copyName} ${counter}`;
      counter++;
    }

    const newDeck: Deck = {
      name: finalName,
      mainDeck: [...deckToCopy.mainDeck],
      extraDeck: [...deckToCopy.extraDeck],
    };

    // Save to localStorage and update state
    try {
      localStorage.setItem(`deck_${finalName}`, JSON.stringify(newDeck));
      setDecks((prevDecks) => [...prevDecks, newDeck]);
      setSelectedDeck(newDeck);
      return newDeck;
    } catch (error) {
      console.error("Error copying deck:", error);
      alert("Failed to copy deck. Please try again.");
      return null;
    }
  };

  return {
    decks,
    selectedDeck,
    lastAddedCard,
    selectDeck,
    addCardToDeck,
    removeCardFromDeck,
    createDeck,
    updateDeck,
    deleteDeck,
    importDeck,
    copyDeck,
  };
}
