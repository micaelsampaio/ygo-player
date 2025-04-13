import { useState, useEffect } from "react";
import { Card, Deck } from "../types";
import { YGOGameUtils } from "ygo-player";
import { canAddCardToDeck, getBanStatusMessage } from "../utils/banlistUtils";

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
                // Add sideDeck if it doesn't exist (for backward compatibility)
                if (!Array.isArray(deck.sideDeck)) {
                  deck.sideDeck = [];
                }
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
   * Sorts cards in a deck section in a meaningful way
   */
  const sortCards = (cards: Card[]): Card[] => {
    // Use YGOGameUtils for consistent sorting across the application
    return YGOGameUtils.sortCards
      ? YGOGameUtils.sortCards(cards)
      : cards.sort((a, b) => {
          // Fallback sort implementation if YGOGameUtils.sortCards is not available
          // First sort by card type: Monsters -> Spells -> Traps
          const typeOrder = { Monster: 1, Spell: 2, Trap: 3 };
          const aType = a.type.includes("Monster")
            ? "Monster"
            : a.type.includes("Spell")
            ? "Spell"
            : "Trap";
          const bType = b.type.includes("Monster")
            ? "Monster"
            : b.type.includes("Spell")
            ? "Spell"
            : "Trap";

          if (aType !== bType) {
            return typeOrder[aType] - typeOrder[bType];
          }

          // For monsters, sort by level/rank descending
          if (aType === "Monster" && a.level && b.level) {
            return b.level - a.level;
          }

          // Finally sort by name
          return a.name.localeCompare(b.name);
        });
  };

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

    // Check if the card can be added based on banlist restrictions
    if (!canAddCardToDeck(selectedDeck, card)) {
      alert(getBanStatusMessage(card)); // Get specific message for this card's ban status
      return;
    }

    // Check if it's an Extra Deck card
    const isExtraDeck = ["XYZ", "Synchro", "Fusion", "Link"].some((type) =>
      card.type.includes(type)
    );

    const updatedDeck = { ...selectedDeck };

    // Update lastModified timestamp
    updatedDeck.lastModified = new Date().toISOString();

    // Add card to appropriate deck section
    if (isExtraDeck) {
      if (updatedDeck.extraDeck.length < 15) {
        // Add card and then sort the deck
        updatedDeck.extraDeck = sortCards([...updatedDeck.extraDeck, card]);
      } else {
        alert("Extra deck can't have more than 15 cards");
        return;
      }
    } else {
      if (updatedDeck.mainDeck.length < 60) {
        // Add card and then sort the deck
        updatedDeck.mainDeck = sortCards([...updatedDeck.mainDeck, card]);
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
      sideDeck: [], // Initialize empty side deck
      createdAt: new Date().toISOString(), // Store creation date
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

    // If name changed, we need to remove the old entry
    if (selectedDeck && selectedDeck.name !== updatedDeck.name) {
      localStorage.removeItem(`deck_${selectedDeck.name}`);
    }

    // Update localStorage with new name
    localStorage.setItem(
      `deck_${updatedDeck.name}`,
      JSON.stringify(updatedDeck)
    );

    // Update decks list
    setDecks((prevDecks) => {
      const newDecks = prevDecks.filter(
        (deck) => deck.name !== selectedDeck?.name
      );
      return [...newDecks, updatedDeck];
    });

    // Update selected deck
    setSelectedDeck(updatedDeck);
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

    // Add creation date if not present
    if (!importedDeck.createdAt) {
      importedDeck.createdAt = new Date().toISOString();
    }

    // Add import date
    importedDeck.importedAt = new Date().toISOString();

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
      sideDeck: [...(deckToCopy.sideDeck || [])], // Include side deck with fallback
      originalDeck: deckToCopy.name, // Reference to original deck
      createdAt: new Date().toISOString(), // Add creation date
      copiedAt: new Date().toISOString(), // Add copy date
      // Copy over the original creation date if it exists
      originalCreatedAt: deckToCopy.createdAt || undefined,
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

  /**
   * Adds a card to the side deck
   */
  const addCardToSideDeck = (card: Card) => {
    if (!selectedDeck) return;

    const updatedDeck = { ...selectedDeck };

    // Side deck can only have up to 15 cards
    if (updatedDeck.sideDeck.length < 15) {
      // Add card and then sort the side deck
      updatedDeck.sideDeck = sortCards([...updatedDeck.sideDeck, card]);
      setSelectedDeck(updatedDeck);
      updateDeckStorage(updatedDeck);

      // Set last added card for notification
      setLastAddedCard(card);
      setTimeout(() => setLastAddedCard(null), 1500);
    } else {
      alert("Side deck can't have more than 15 cards");
    }
  };

  /**
   * Removes a card from the side deck
   */
  const removeCardFromSideDeck = (card: Card, index: number) => {
    if (!selectedDeck) return;

    const updatedDeck = { ...selectedDeck };
    updatedDeck.sideDeck = updatedDeck.sideDeck.filter(
      (_, idx) => idx !== index
    );

    setSelectedDeck(updatedDeck);
    updateDeckStorage(updatedDeck);
  };

  /**
   * Moves a card between main, extra, and side decks
   */
  const moveCardBetweenDecks = (
    sourceType: "main" | "extra" | "side",
    targetType: "main" | "extra" | "side",
    cardIndex: number
  ) => {
    if (!selectedDeck) return;

    const updatedDeck = { ...selectedDeck };
    let card: Card | undefined;

    // Remove card from source deck
    if (sourceType === "main") {
      card = updatedDeck.mainDeck[cardIndex];
      updatedDeck.mainDeck = updatedDeck.mainDeck.filter(
        (_, idx) => idx !== cardIndex
      );
    } else if (sourceType === "extra") {
      card = updatedDeck.extraDeck[cardIndex];
      updatedDeck.extraDeck = updatedDeck.extraDeck.filter(
        (_, idx) => idx !== cardIndex
      );
    } else if (sourceType === "side") {
      card = updatedDeck.sideDeck[cardIndex];
      updatedDeck.sideDeck = updatedDeck.sideDeck.filter(
        (_, idx) => idx !== cardIndex
      );
    }

    if (!card) return;

    // Add card to target deck
    if (targetType === "main") {
      if (updatedDeck.mainDeck.length < 60) {
        updatedDeck.mainDeck.push(card);
        // Sort the main deck after adding card
        updatedDeck.mainDeck = sortCards(updatedDeck.mainDeck);
      } else {
        alert("Main deck can't have more than 60 cards");
        return;
      }
    } else if (targetType === "extra") {
      // Validate if it's an extra deck card
      const isExtraDeck = ["XYZ", "Synchro", "Fusion", "Link"].some((type) =>
        card?.type.includes(type)
      );

      if (!isExtraDeck) {
        alert(
          "Only XYZ, Synchro, Fusion or Link monsters can be added to Extra Deck"
        );
        return;
      }

      if (updatedDeck.extraDeck.length < 15) {
        updatedDeck.extraDeck.push(card);
        // Sort the extra deck after adding card
        updatedDeck.extraDeck = sortCards(updatedDeck.extraDeck);
      } else {
        alert("Extra deck can't have more than 15 cards");
        return;
      }
    } else if (targetType === "side") {
      if (updatedDeck.sideDeck.length < 15) {
        updatedDeck.sideDeck.push(card);
        // Sort the side deck after adding card
        updatedDeck.sideDeck = sortCards(updatedDeck.sideDeck);
      } else {
        alert("Side deck can't have more than 15 cards");
        return;
      }
    }

    // Update the lastModified timestamp
    updatedDeck.lastModified = new Date().toISOString();

    setSelectedDeck(updatedDeck);
    updateDeckStorage(updatedDeck);
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
    addCardToSideDeck,
    removeCardFromSideDeck,
    moveCardBetweenDecks,
  };
}
