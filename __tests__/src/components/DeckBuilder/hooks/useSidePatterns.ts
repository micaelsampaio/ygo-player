import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SidingPattern, Card, Deck, CardWithCount } from '../types';

// Local storage key format for side patterns
// Will be deprecated in favor of storing inside deck object
const getSidePatternKey = (deckId: string) => `ygo_side_patterns_${deckId}`;

// Helper function to convert array of cards to CardWithCount array
const convertToCardWithCount = (cards: Card[]): CardWithCount[] => {
  const cardMap = new Map<number, CardWithCount>();
  
  cards.forEach(card => {
    if (cardMap.has(card.id)) {
      cardMap.get(card.id)!.count++;
    } else {
      cardMap.set(card.id, {
        id: card.id,
        name: card.name,
        type: card.type,
        count: 1
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
    cardsIn: pattern.cardsToAdd ? convertToCardWithCount(pattern.cardsToAdd) : [],
    cardsOut: pattern.cardsToRemove ? convertToCardWithCount(pattern.cardsToRemove) : [],
  };
};

export const useSidePatterns = (deckId?: string) => {
  const [sidePatterns, setSidePatterns] = useState<SidingPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<SidingPattern | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load side patterns from local storage
  useEffect(() => {
    if (!deckId) {
      setSidePatterns([]);
      setSelectedPattern(null);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      // First try from the deck object (new format)
      let deck: Deck | null = null;
      try {
        const deckData = localStorage.getItem(deckId);
        if (deckData) {
          deck = JSON.parse(deckData);
          if (deck.sidePatterns) {
            // New format - patterns stored in deck object
            const migratedPatterns = deck.sidePatterns.map(migratePattern);
            setSidePatterns(migratedPatterns);
            
            if (migratedPatterns.length > 0) {
              setSelectedPattern(migratedPatterns[0]);
            } else {
              setSelectedPattern(null);
            }
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading side patterns from deck:', error);
      }
      
      // Fall back to old format if not found in deck object
      const storedPatterns = localStorage.getItem(getSidePatternKey(deckId));
      if (storedPatterns) {
        const parsedPatterns = JSON.parse(storedPatterns) as SidingPattern[];
        
        // Migrate patterns to new format if needed
        const migratedPatterns = parsedPatterns.map(migratePattern);
        
        setSidePatterns(migratedPatterns);
        
        // Select the first pattern if available
        if (migratedPatterns.length > 0) {
          setSelectedPattern(migratedPatterns[0]);
        } else {
          setSelectedPattern(null); // Ensure null if no patterns
        }
        
        // If we have deck and patterns, save to new format
        if (deck && migratedPatterns.length > 0) {
          try {
            const updatedDeck = {
              ...deck,
              sidePatterns: migratedPatterns
            };
            localStorage.setItem(deckId, JSON.stringify(updatedDeck));
            // Remove old format storage
            localStorage.removeItem(getSidePatternKey(deckId));
            console.log('Migrated side patterns to deck object');
          } catch (error) {
            console.error('Error migrating side patterns to deck object:', error);
          }
        }
      } else {
        // Initialize with empty array if no patterns found
        setSidePatterns([]);
        setSelectedPattern(null);
      }
    } catch (error) {
      console.error('Error loading side patterns:', error);
      // Initialize with empty state on error
      setSidePatterns([]);
      setSelectedPattern(null);
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  // Save patterns to local storage - now saves in the deck object
  const savePatterns = (patterns: SidingPattern[]) => {
    if (!deckId) return;
    
    try {
      console.log('Saving patterns:', patterns);
      
      // Get the deck from localStorage
      const deckData = localStorage.getItem(deckId);
      if (deckData) {
        const deck = JSON.parse(deckData);
        const updatedDeck = {
          ...deck,
          sidePatterns: patterns
        };
        
        // Save back to localStorage
        localStorage.setItem(deckId, JSON.stringify(updatedDeck));
        console.log('Saved side patterns to deck object');
        
        // Also save to old format for backward compatibility
        localStorage.setItem(getSidePatternKey(deckId), JSON.stringify(patterns));
      } else {
        // Fall back to old method if deck not found
        localStorage.setItem(getSidePatternKey(deckId), JSON.stringify(patterns));
      }
    } catch (error) {
      console.error('Error saving side patterns:', error);
    }
  };

  // Create a new pattern
  const createPattern = (patternData: SidingPattern) => {
    if (!deckId) return null;
    
    // Ensure the pattern has required fields and convert to new format
    const newPattern: SidingPattern = {
      id: patternData.id || uuidv4(),
      name: patternData.name,
      matchup: patternData.matchup,
      description: patternData.description || '',
      cardsIn: patternData.cardsIn || (patternData.cardsToAdd ? convertToCardWithCount(patternData.cardsToAdd) : []),
      cardsOut: patternData.cardsOut || (patternData.cardsToRemove ? convertToCardWithCount(patternData.cardsToRemove) : []),
      createdAt: patternData.createdAt || Date.now(),
      updatedAt: patternData.updatedAt || Date.now()
    };
    
    console.log('Creating new pattern:', newPattern);
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
      updatedAt: Date.now()
    });
    
    const updatedPatterns = sidePatterns.map(p => 
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
    
    const updatedPatterns = sidePatterns.filter(p => p.id !== patternId);
    setSidePatterns(updatedPatterns);
    savePatterns(updatedPatterns);
    
    if (selectedPattern?.id === patternId) {
      setSelectedPattern(updatedPatterns.length > 0 ? updatedPatterns[0] : null);
    }
  };

  // Select a pattern by ID
  const selectPattern = (patternId: string) => {
    const pattern = sidePatterns.find(p => p.id === patternId);
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
    
    console.log('Applying side pattern:', pattern);
    console.log('Current decks:', { mainDeck: mainDeck.length, extraDeck: extraDeck.length, sideDeck: sideDeck.length });
    
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
        const mainDeckIndex = newMainDeck.findIndex(card => card.id === cardId);
        if (mainDeckIndex !== -1) {
          // Move card from main deck to side deck
          newSideDeck.push(newMainDeck[mainDeckIndex]);
          newMainDeck.splice(mainDeckIndex, 1);
          continue;
        }
        
        // Check if card is in extra deck
        const extraDeckIndex = newExtraDeck.findIndex(card => card.id === cardId);
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
        const sideDeckIndex = newSideDeck.findIndex(card => card.id === cardId);
        if (sideDeckIndex === -1) continue; // Card not in side deck
        
        // Determine if card belongs to main or extra deck
        const card = newSideDeck[sideDeckIndex];
        const isExtraDeckCard = card.type && ["XYZ", "Synchro", "Fusion", "Link"].some(type => 
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
    
    console.log('Updated decks:', { mainDeck: newMainDeck.length, extraDeck: newExtraDeck.length, sideDeck: newSideDeck.length });
    return { mainDeck: newMainDeck, extraDeck: newExtraDeck, sideDeck: newSideDeck };
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
    applySidePattern
  };
};