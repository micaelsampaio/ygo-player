import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SidingPattern, Card, Deck } from '../types';

// Local storage key format for side patterns
const getSidePatternKey = (deckId: string) => `ygo_side_patterns_${deckId}`;

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
      const storedPatterns = localStorage.getItem(getSidePatternKey(deckId));
      if (storedPatterns) {
        const parsedPatterns = JSON.parse(storedPatterns) as SidingPattern[];
        setSidePatterns(parsedPatterns);
        
        // Select the first pattern if available
        if (parsedPatterns.length > 0) {
          setSelectedPattern(parsedPatterns[0]);
        } else {
          setSelectedPattern(null); // Ensure null if no patterns
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

  // Save patterns to local storage
  const savePatterns = (patterns: SidingPattern[]) => {
    if (!deckId) return;
    
    try {
      console.log('Saving patterns:', patterns);
      localStorage.setItem(getSidePatternKey(deckId), JSON.stringify(patterns));
    } catch (error) {
      console.error('Error saving side patterns:', error);
    }
  };

  // Create a new pattern
  const createPattern = (patternData: SidingPattern) => {
    if (!deckId) return null;
    
    // Ensure the pattern has required fields
    const newPattern: SidingPattern = {
      id: patternData.id || uuidv4(),
      name: patternData.name,
      matchup: patternData.matchup,
      description: patternData.description || '',
      cardsToRemove: patternData.cardsToRemove || [],
      cardsToAdd: patternData.cardsToAdd || [],
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
    
    const updatedPattern = {
      ...pattern,
      updatedAt: Date.now()
    };
    
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
    
    // Remove cards from main/extra deck
    for (const cardToRemove of pattern.cardsToRemove) {
      // Check if card is in main deck
      const mainDeckIndex = newMainDeck.findIndex(card => card.id === cardToRemove.id);
      if (mainDeckIndex !== -1) {
        // Move card from main deck to side deck
        newSideDeck.push(newMainDeck[mainDeckIndex]);
        newMainDeck.splice(mainDeckIndex, 1);
        continue;
      }
      
      // Check if card is in extra deck
      const extraDeckIndex = newExtraDeck.findIndex(card => card.id === cardToRemove.id);
      if (extraDeckIndex !== -1) {
        // Move card from extra deck to side deck
        newSideDeck.push(newExtraDeck[extraDeckIndex]);
        newExtraDeck.splice(extraDeckIndex, 1);
      }
    }
    
    // Add cards from side deck to main/extra deck
    for (const cardToAdd of pattern.cardsToAdd) {
      // Find card in side deck
      const sideDeckIndex = newSideDeck.findIndex(card => card.id === cardToAdd.id);
      if (sideDeckIndex === -1) continue; // Card not in side deck
      
      // Determine if card belongs to main or extra deck
      const isExtraDeckCard = cardToAdd.type && ["XYZ", "Synchro", "Fusion", "Link"].some(type => 
        cardToAdd.type.includes(type)
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