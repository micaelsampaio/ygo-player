import { useState, useEffect } from "react";
import { Card } from "../../DeckBuilder/types";
import { v4 as uuidv4 } from "uuid";

// Define the CardGroup interface
export interface CardGroup {
  id: string;
  name: string;
  description?: string;
  cards: Card[];
  createdAt: string;
  lastModified?: string;
}

/**
 * Custom hook for managing card groups
 */
export function useCardGroups() {
  const [cardGroups, setCardGroups] = useState<CardGroup[]>([]);
  const [selectedCardGroup, setSelectedCardGroup] = useState<CardGroup | null>(
    null
  );

  // Load existing card groups from localStorage
  useEffect(() => {
    try {
      const storedCardGroups = localStorage.getItem("card_groups");
      if (storedCardGroups) {
        setCardGroups(JSON.parse(storedCardGroups));
      } else {
        // Initialize with empty array if none exists
        localStorage.setItem("card_groups", JSON.stringify([]));
      }
    } catch (error) {
      console.error("Error loading card groups from localStorage:", error);
    }
  }, []);

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
  const addCardToGroup = (groupId: string, card: Card): boolean => {
    const group = cardGroups.find((g) => g.id === groupId);
    if (!group) return false;

    // Check if card already exists in the group
    if (group.cards.some((c) => c.id === card.id)) {
      return false; // Card already exists
    }

    const updatedCards = [...group.cards, card];
    const updatedGroup = {
      ...group,
      cards: updatedCards,
      lastModified: new Date().toISOString(),
    };

    const updatedGroups = cardGroups.map((g) =>
      g.id === groupId ? updatedGroup : g
    );

    setCardGroups(updatedGroups);
    localStorage.setItem("card_groups", JSON.stringify(updatedGroups));

    // Update selected group if it's the one being modified
    if (selectedCardGroup?.id === groupId) {
      setSelectedCardGroup(updatedGroup);
    }

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

    const updatedGroups = cardGroups.map((g) =>
      g.id === groupId ? updatedGroup : g
    );

    setCardGroups(updatedGroups);
    localStorage.setItem("card_groups", JSON.stringify(updatedGroups));

    // Update selected group if it's the one being modified
    if (selectedCardGroup?.id === groupId) {
      setSelectedCardGroup(updatedGroup);
    }

    return true;
  };

  /**
   * Get a specific card group by ID
   */
  const getCardGroup = (groupId: string): CardGroup | undefined => {
    return cardGroups.find((group) => group.id === groupId);
  };

  return {
    cardGroups,
    selectedCardGroup,
    setSelectedCardGroup,
    createCardGroup,
    updateCardGroup,
    deleteCardGroup,
    addCardToGroup,
    removeCardFromGroup,
    getCardGroup,
  };
}
