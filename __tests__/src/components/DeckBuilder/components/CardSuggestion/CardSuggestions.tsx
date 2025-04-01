import React, { useState, useEffect } from "react";
import { Card, Deck } from "../../types";
import "./CardSuggestions.css";

interface CardSuggestionsProps {
  deck: Deck;
  onAddCardToDeck: (card: Card) => void;
}

const CardSuggestions: React.FC<CardSuggestionsProps> = ({
  deck,
  onAddCardToDeck,
}) => {
  const [suggestions, setSuggestions] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deck) return;

    generateSuggestions();
  }, [deck]);

  const generateSuggestions = async () => {
    // Skip if deck is too small to analyze
    if (deck.mainDeck.length < 10) {
      setError("Add more cards to your deck to get suggestions");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Identify archetypes in the deck
      const archetypes = identifyArchetypes(deck);
      const searchPromises = archetypes.map((archetype) =>
        searchCardsForArchetype(archetype)
      );

      const results = await Promise.all(searchPromises);
      // Flatten results and filter out cards already in the deck
      const flatResults = results.flat();
      const deckCardIds = new Set([
        ...deck.mainDeck.map((card) => card.id),
        ...deck.extraDeck.map((card) => card.id),
      ]);

      const filteredSuggestions = flatResults.filter(
        (card) => !deckCardIds.has(card.id)
      );

      // Sort by relevance and take top suggestions
      const topSuggestions = filteredSuggestions
        .slice(0, 12)
        .sort(() => Math.random() - 0.5); // Randomize for variety

      setSuggestions(topSuggestions);
    } catch (err) {
      console.error("Error generating suggestions:", err);
      setError("Failed to generate suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  const identifyArchetypes = (deck: Deck): string[] => {
    // Simplified archetype detection - look for common terms in card names
    const cardNames = deck.mainDeck.map((card) => card.name);
    const nameWords = cardNames
      .join(" ")
      .split(/[\s-]+/)
      .filter((word) => word.length > 3)
      .map((word) => word.toLowerCase());

    // Count word frequency
    const wordCounts: Record<string, number> = {};
    nameWords.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Find potential archetypes (terms that appear multiple times)
    return Object.entries(wordCounts)
      .filter(([_, count]) => count >= 2)
      .map(([word]) => word)
      .slice(0, 3); // Limit to top 3 archetypes
  };

  const searchCardsForArchetype = async (
    archetype: string
  ): Promise<Card[]> => {
    try {
      const response = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${archetype}`
      );
      const data = await response.json();

      if (data.error) return [];
      return data.data || [];
    } catch (error) {
      console.error(`Error searching for ${archetype}:`, error);
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="card-suggestions loading">Generating suggestions...</div>
    );
  }

  if (error) {
    return <div className="card-suggestions error">{error}</div>;
  }

  if (suggestions.length === 0) {
    return (
      <div className="card-suggestions empty">No suggestions available</div>
    );
  }

  return (
    <div className="card-suggestions">
      <h3>Suggested Cards</h3>
      <p className="suggestion-hint">
        Based on your deck's archetype and strategy
      </p>

      <div className="suggestions-grid">
        {suggestions.map((card) => (
          <div key={card.id} className="suggestion-card">
            <img
              src={card.card_images[0].image_url}
              alt={card.name}
              className="suggestion-image"
            />
            <div className="suggestion-details">
              <div className="suggestion-name">{card.name}</div>
              <button
                className="add-suggestion"
                onClick={() => onAddCardToDeck(card)}
              >
                Add to Deck
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardSuggestions;
