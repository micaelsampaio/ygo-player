import { useState, useEffect } from "react";
import { SidingPattern, Card, Deck, CardWithCount } from "../types";

// Adding uuid function if we don't have the library
const generateUniqueId = () => {
  return (
    "pattern-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9)
  );
};

// Helper function to convert array of cards to CardWithCount array
const convertToCardWithCount = (cards: Card[]): CardWithCount[] => {
  const cardMap = new Map<number, CardWithCount>();

  cards.forEach((card) => {
    if (cardMap.has(card.id)) {
      cardMap.get(card.id)!.count++;
    } else {
      cardMap.set(card.id, {
        id: card.id,
        name: card.name,
        type: card.type,
        count: 1,
      });
    }
  });

  return Array.from(cardMap.values());
};

// Helper function to migrate old patterns to new format
const migratePattern = (pattern: SidingPattern): SidingPattern => {
  if (pattern.cardsIn && pattern.cardsOut) {
    // Already in new format
    return pattern;
  }

  // Convert from old format to new format
  return {
    ...pattern,
    cardsIn: pattern.cardsToAdd
      ? convertToCardWithCount(pattern.cardsToAdd)
      : [],
    cardsOut: pattern.cardsToRemove
      ? convertToCardWithCount(pattern.cardsToRemove)
      : [],
  };
};

export const useSidePatterns = (deckId?: string) => {
  const [sidePatterns, setSidePatterns] = useState<SidingPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<SidingPattern | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load side patterns from deck object in local storage
  useEffect(() => {
    if (!deckId) {
      setSidePatterns([]);
      setSelectedPattern(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get the deck data from localStorage - try both with and without prefix
      let deck: Deck | null = null;
      let migratedPatterns: SidingPattern[] = [];

      // First try with the key as provided
      const directKey = deckId;
      // Then try with deck_ prefix if not already present
      const prefixedKey = deckId.startsWith("deck_")
        ? deckId
        : `deck_${deckId}`;

      try {
        let deckData = localStorage.getItem(directKey);

        // If not found with direct key, try with prefixed key
        if (!deckData && directKey !== prefixedKey) {
          deckData = localStorage.getItem(prefixedKey);
          console.log(
            "Tried alternate key format for loading side patterns:",
            prefixedKey
          );
        }

        if (deckData) {
          deck = JSON.parse(deckData);
          console.log(
            "Found deck for side patterns in localStorage:",
            deck.name
          );

          // Check if patterns are already in deck object
          if (deck.sidePatterns) {
            // New format - patterns stored in deck object
            migratedPatterns = deck.sidePatterns.map(migratePattern);
            console.log(
              `Loaded ${migratedPatterns.length} side patterns from deck`
            );
          } else {
            // No patterns found anywhere
            migratedPatterns = [];
            console.log("No side patterns found in deck");
          }

          // Update state with the patterns
          setSidePatterns(migratedPatterns);

          // Select the first pattern if available
          if (migratedPatterns.length > 0) {
            setSelectedPattern(migratedPatterns[0]);
          } else {
            setSelectedPattern(null);
          }
        } else {
          // No deck found with either key format
          console.error(
            `Deck not found in localStorage with either key: ${directKey} or ${prefixedKey}`
          );
          setSidePatterns([]);
          setSelectedPattern(null);
        }
      } catch (error) {
        console.error("Error loading side patterns:", error);
        setSidePatterns([]);
        setSelectedPattern(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  // Save patterns to deck object in local storage
  const savePatterns = (patterns: SidingPattern[]) => {
    if (!deckId) return;

    try {
      // Get the storage key - ensure we use deck_prefix if it's not already there
      const storageKey = deckId.startsWith("deck_") ? deckId : `deck_${deckId}`;

      // Get the deck from localStorage
      const deckData = localStorage.getItem(storageKey);
      if (deckData) {
        const deck = JSON.parse(deckData);
        const updatedDeck = {
          ...deck,
          sidePatterns: patterns,
        };

        // Save back to localStorage
        localStorage.setItem(storageKey, JSON.stringify(updatedDeck));
        console.log("Saved side patterns to deck object:", storageKey);
      } else {
        console.error(
          `Cannot save side patterns: Deck not found in localStorage at key ${storageKey}`
        );
      }
    } catch (error) {
      console.error("Error saving side patterns:", error);
    }
  };

  // Create a new pattern
  const createPattern = (patternData: SidingPattern) => {
    if (!deckId) return null;

    // Ensure the pattern has required fields and convert to new format
    const newPattern: SidingPattern = {
      id: patternData.id || generateUniqueId(),
      name: patternData.name,
      matchup: patternData.matchup,
      description: patternData.description || "",
      cardsIn:
        patternData.cardsIn ||
        (patternData.cardsToAdd
          ? convertToCardWithCount(patternData.cardsToAdd)
          : []),
      cardsOut:
        patternData.cardsOut ||
        (patternData.cardsToRemove
          ? convertToCardWithCount(patternData.cardsToRemove)
          : []),
      // For backward compatibility, keep these fields too
      cardsToAdd: patternData.cardsToAdd || [],
      cardsToRemove: patternData.cardsToRemove || [],
      createdAt: patternData.createdAt || Date.now(),
      updatedAt: patternData.updatedAt || Date.now(),
    };

    const updatedPatterns = [...sidePatterns, newPattern];
    setSidePatterns(updatedPatterns);
    savePatterns(updatedPatterns);
    setSelectedPattern(newPattern);
    return newPattern;
  };

  // Update an existing pattern
  const updatePattern = (pattern: SidingPattern) => {
    if (!deckId) return;

    // Ensure the pattern is in the new format
    const updatedPattern = migratePattern({
      ...pattern,
      updatedAt: Date.now(),
    });

    const updatedPatterns = sidePatterns.map((p) =>
      p.id === pattern.id ? updatedPattern : p
    );

    setSidePatterns(updatedPatterns);
    savePatterns(updatedPatterns);

    if (selectedPattern?.id === pattern.id) {
      setSelectedPattern(updatedPattern);
    }

    return updatedPattern;
  };

  // Delete a pattern
  const deletePattern = (patternId: string) => {
    if (!deckId) return;

    const updatedPatterns = sidePatterns.filter((p) => p.id !== patternId);
    setSidePatterns(updatedPatterns);
    savePatterns(updatedPatterns);

    if (selectedPattern?.id === patternId) {
      setSelectedPattern(
        updatedPatterns.length > 0 ? updatedPatterns[0] : null
      );
    }
  };

  // Select a pattern by ID
  const selectPattern = (patternId: string) => {
    const pattern = sidePatterns.find((p) => p.id === patternId);
    if (pattern) {
      setSelectedPattern(pattern);
    }
  };

  // Apply a side pattern (remove and add cards)
  const applySidePattern = (
    pattern: SidingPattern,
    mainDeck: Card[],
    extraDeck: Card[],
    sideDeck: Card[]
  ) => {
    if (!pattern) return { mainDeck, extraDeck, sideDeck };

    // Create copies of the decks to avoid mutation
    const newMainDeck = [...mainDeck];
    const newExtraDeck = [...extraDeck];
    const newSideDeck = [...sideDeck];

    // Use cardsOut instead of cardsToRemove if available
    const cardsOutList = pattern.cardsOut || [];

    // Remove cards from main/extra deck
    for (const cardToRemove of cardsOutList) {
      const cardId = cardToRemove.id;
      const count = cardToRemove.count || 1;

      for (let i = 0; i < count; i++) {
        // Check if card is in main deck
        const mainDeckIndex = newMainDeck.findIndex(
          (card) => card.id === cardId
        );
        if (mainDeckIndex !== -1) {
          // Move card from main deck to side deck
          newSideDeck.push(newMainDeck[mainDeckIndex]);
          newMainDeck.splice(mainDeckIndex, 1);
          continue;
        }

        // Check if card is in extra deck
        const extraDeckIndex = newExtraDeck.findIndex(
          (card) => card.id === cardId
        );
        if (extraDeckIndex !== -1) {
          // Move card from extra deck to side deck
          newSideDeck.push(newExtraDeck[extraDeckIndex]);
          newExtraDeck.splice(extraDeckIndex, 1);
          continue;
        }
      }
    }

    // Use cardsIn instead of cardsToAdd if available
    const cardsInList = pattern.cardsIn || [];

    // Add cards from side deck to main/extra deck
    for (const cardToAdd of cardsInList) {
      const cardId = cardToAdd.id;
      const count = cardToAdd.count || 1;

      for (let i = 0; i < count; i++) {
        // Find card in side deck
        const sideDeckIndex = newSideDeck.findIndex(
          (card) => card.id === cardId
        );
        if (sideDeckIndex === -1) continue; // Card not in side deck

        // Determine if card belongs to main or extra deck
        const card = newSideDeck[sideDeckIndex];
        const isExtraDeckCard =
          card.type &&
          ["XYZ", "Synchro", "Fusion", "Link"].some((type) =>
            card.type.includes(type)
          );

        // Move card from side deck to appropriate deck
        if (isExtraDeckCard) {
          newExtraDeck.push(newSideDeck[sideDeckIndex]);
        } else {
          newMainDeck.push(newSideDeck[sideDeckIndex]);
        }

        // Remove card from side deck
        newSideDeck.splice(sideDeckIndex, 1);
      }
    }

    return {
      mainDeck: newMainDeck,
      extraDeck: newExtraDeck,
      sideDeck: newSideDeck,
    };
  };

  return {
    sidePatterns,
    selectedPattern,
    isLoading,
    createPattern,
    updatePattern,
    deletePattern,
    selectPattern,
    setSelectedPattern,
    applySidePattern,
  };
};
