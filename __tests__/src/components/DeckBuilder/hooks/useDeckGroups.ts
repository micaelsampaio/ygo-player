import { useState, useEffect } from "react";
import { DeckGroup, CardGroup, Card, Deck } from "../types";
import { v4 as uuidv4 } from "uuid"; // You'll need to install this dependency

/**
 * Custom hook for managing deck groups and card groups
 */
export function useDeckGroups() {
  const [deckGroups, setDeckGroups] = useState<DeckGroup[]>([]);
  const [cardGroups, setCardGroups] = useState<CardGroup[]>([]);
  const [selectedDeckGroup, setSelectedDeckGroup] = useState<DeckGroup | null>(
    null
  );
  const [selectedCardGroup, setSelectedCardGroup] = useState<CardGroup | null>(
    null
  );

  // Load existing groups from localStorage
  useEffect(() => {
    try {
      // Load deck groups
      const storedDeckGroups = localStorage.getItem("deck_groups");
      if (storedDeckGroups) {
        setDeckGroups(JSON.parse(storedDeckGroups));
      } else {
        // Create a default group if none exists
        const defaultGroup: DeckGroup = {
          id: "default",
          name: "All Decks",
          createdAt: new Date().toISOString(),
        };
        setDeckGroups([defaultGroup]);
        localStorage.setItem("deck_groups", JSON.stringify([defaultGroup]));
      }

      // Load card groups
      const storedCardGroups = localStorage.getItem("card_groups");
      if (storedCardGroups) {
        setCardGroups(JSON.parse(storedCardGroups));
      }
    } catch (error) {
      console.error("Error loading groups from localStorage:", error);
    }
  }, []);

  /**
   * Creates a new deck group
   */
  const createDeckGroup = (name: string, description?: string) => {
    if (!name.trim()) {
      alert("Group name cannot be empty");
      return null;
    }

    // Check if group with same name already exists
    if (deckGroups.some((group) => group.name === name)) {
      alert(`A group named "${name}" already exists.`);
      return null;
    }

    const newGroup: DeckGroup = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date().toISOString(),
    };

    const updatedGroups = [...deckGroups, newGroup];
    setDeckGroups(updatedGroups);
    localStorage.setItem("deck_groups", JSON.stringify(updatedGroups));

    return newGroup;
  };

  /**
   * Updates an existing deck group
   */
  const updateDeckGroup = (groupId: string, updates: Partial<DeckGroup>) => {
    const updatedGroups = deckGroups.map((group) =>
      group.id === groupId
        ? { ...group, ...updates, lastModified: new Date().toISOString() }
        : group
    );

    setDeckGroups(updatedGroups);
    localStorage.setItem("deck_groups", JSON.stringify(updatedGroups));

    // Update selected group if it's the one being modified
    if (selectedDeckGroup?.id === groupId) {
      setSelectedDeckGroup(updatedGroups.find((g) => g.id === groupId) || null);
    }
  };

  /**
   * Deletes a deck group
   */
  const deleteDeckGroup = (groupId: string) => {
    // Don't allow deleting the default group
    if (groupId === "default") {
      alert("Cannot delete the default group.");
      return false;
    }

    // Check if the group has any decks
    const hasDecks = checkIfGroupHasDecks(groupId);
    if (hasDecks) {
      const confirm = window.confirm(
        "This group contains decks. Deleting it will move all its decks to the default group. Continue?"
      );
      if (!confirm) return false;

      // Move all decks in this group to the default group
      moveDecksToDefaultGroup(groupId);
    }

    const updatedGroups = deckGroups.filter((group) => group.id !== groupId);
    setDeckGroups(updatedGroups);
    localStorage.setItem("deck_groups", JSON.stringify(updatedGroups));

    // Clear selection if the deleted group was selected
    if (selectedDeckGroup?.id === groupId) {
      setSelectedDeckGroup(null);
    }

    return true;
  };

  /**
   * Check if a group has any decks associated with it
   */
  const checkIfGroupHasDecks = (groupId: string): boolean => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("deck_") && !key.includes("deck_groups")) {
        try {
          const deckData = localStorage.getItem(key);
          if (deckData) {
            const deck = JSON.parse(deckData);
            if (deck.groupId === groupId) {
              return true;
            }
          }
        } catch (error) {
          console.error(`Error checking deck in group for ${key}:`, error);
        }
      }
    }
    return false;
  };

  /**
   * Move all decks from a group to the default group
   */
  const moveDecksToDefaultGroup = (sourceGroupId: string) => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("deck_") && !key.includes("deck_groups")) {
        try {
          const deckData = localStorage.getItem(key);
          if (deckData) {
            const deck = JSON.parse(deckData);
            if (deck.groupId === sourceGroupId) {
              deck.groupId = "default";
              localStorage.setItem(key, JSON.stringify(deck));
            }
          }
        } catch (error) {
          console.error(
            `Error moving deck to default group for ${key}:`,
            error
          );
        }
      }
    }
  };

  /**
   * Move a deck to a different group
   */
  const moveDeckToGroup = (deckId: string, targetGroupId: string) => {
    try {
      // Search through all localStorage keys to find the right deck
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("deck_") && !key.includes("deck_groups")) {
          const deckData = localStorage.getItem(key);
          if (deckData) {
            const deck = JSON.parse(deckData);
            // Match by deck id
            if (deck.id === deckId) {
              // Update the group ID
              deck.groupId = targetGroupId;
              deck.lastModified = new Date().toISOString();
              localStorage.setItem(key, JSON.stringify(deck));
              return true;
            }
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error moving deck to group:", error);
      return false;
    }
  };

  /**
   * Creates a new card group
   */
  const createCardGroup = (
    name: string,
    description?: string,
    cards: Card[] = []
  ) => {
    if (!name.trim()) {
      alert("Group name cannot be empty");
      return null;
    }

    // Check if group with same name already exists
    if (cardGroups.some((group) => group.name === name)) {
      alert(`A card group named "${name}" already exists.`);
      return null;
    }

    const newGroup: CardGroup = {
      id: uuidv4(),
      name,
      description,
      cards,
      createdAt: new Date().toISOString(),
    };

    const updatedGroups = [...cardGroups, newGroup];
    setCardGroups(updatedGroups);
    localStorage.setItem("card_groups", JSON.stringify(updatedGroups));

    return newGroup;
  };

  /**
   * Updates an existing card group
   */
  const updateCardGroup = (groupId: string, updates: Partial<CardGroup>) => {
    const updatedGroups = cardGroups.map((group) =>
      group.id === groupId
        ? { ...group, ...updates, lastModified: new Date().toISOString() }
        : group
    );

    setCardGroups(updatedGroups);
    localStorage.setItem("card_groups", JSON.stringify(updatedGroups));

    // Update selected group if it's the one being modified
    if (selectedCardGroup?.id === groupId) {
      setSelectedCardGroup(updatedGroups.find((g) => g.id === groupId) || null);
    }
  };

  /**
   * Deletes a card group
   */
  const deleteCardGroup = (groupId: string) => {
    const updatedGroups = cardGroups.filter((group) => group.id !== groupId);
    setCardGroups(updatedGroups);
    localStorage.setItem("card_groups", JSON.stringify(updatedGroups));

    // Clear selection if the deleted group was selected
    if (selectedCardGroup?.id === groupId) {
      setSelectedCardGroup(null);
    }

    return true;
  };

  /**
   * Adds a card to a card group
   */
  const addCardToGroup = (groupId: string, card: Card) => {
    const group = cardGroups.find((g) => g.id === groupId);
    if (!group) return false;

    // Check if card already exists in the group
    if (group.cards.some((c) => c.id === card.id)) {
      return false; // Card already exists
    }

    const updatedGroup = {
      ...group,
      cards: [...group.cards, card],
      lastModified: new Date().toISOString(),
    };

    updateCardGroup(groupId, updatedGroup);
    return true;
  };

  /**
   * Removes a card from a card group
   */
  const removeCardFromGroup = (groupId: string, cardId: number) => {
    const group = cardGroups.find((g) => g.id === groupId);
    if (!group) return false;

    const updatedCards = group.cards.filter((c) => c.id !== cardId);

    const updatedGroup = {
      ...group,
      cards: updatedCards,
      lastModified: new Date().toISOString(),
    };

    updateCardGroup(groupId, updatedGroup);
    return true;
  };

  /**
   * Gets all decks belonging to a specific group
   */
  const getDecksInGroup = (groupId: string): Deck[] => {
    const groupDecks: Deck[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("deck_") && !key.includes("deck_groups")) {
        try {
          const deckData = localStorage.getItem(key);
          if (deckData) {
            const deck = JSON.parse(deckData);
            // If groupId matches or if groupId is default and deck has no groupId
            if (
              deck.groupId === groupId ||
              (groupId === "default" && !deck.groupId)
            ) {
              groupDecks.push(deck);
            }
          }
        } catch (error) {
          console.error(`Error getting deck in group for ${key}:`, error);
        }
      }
    }

    return groupDecks;
  };

  return {
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
  };
}
