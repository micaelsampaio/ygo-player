import React, { useState, useEffect } from "react";
import { Card, Deck } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";
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

  // Handle right-click to directly add to the currently selected deck
  const handleRightClick = (card: Card, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent default context menu
    onAddCardToDeck(card); // Add to the currently selected deck type
  };

  // Add drag functionality for consistent UX across the app
  const handleDragStart = (e: React.DragEvent, card: Card) => {
    // Use the same format as other components to be compatible with DeckEditor
    const dragData = {
      card: card,
      isFromSuggestions: true,
    };

    // Set the data as a JSON string
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));

    // Create a small drag image
    const dragElem = document.createElement("div");
    dragElem.style.width = "60px";
    dragElem.style.height = "88px";
    dragElem.style.backgroundImage = `url(${getCardImageUrl(card.id, "small")})`;
    dragElem.style.backgroundSize = "contain";
    dragElem.style.backgroundRepeat = "no-repeat";
    dragElem.style.position = "absolute";
    dragElem.style.top = "-1000px";

    document.body.appendChild(dragElem);

    e.dataTransfer.setDragImage(dragElem, 30, 44);

    // Clean up the temporary element after the drag starts
    setTimeout(() => {
      document.body.removeChild(dragElem);
    }, 0);
  };

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
    // Count archetype occurrences from card.archetype
    const archetypeCounts: Record<string, number> = {};

    deck.mainDeck.forEach((card) => {
      if (card.archetype) {
        archetypeCounts[card.archetype] =
          (archetypeCounts[card.archetype] || 0) + 1;
      }
    });

    // Sort archetypes by frequency and take top 3
    return Object.entries(archetypeCounts)
      .filter(([_, count]) => count >= 2)
      .sort(([_, countA], [__, countB]) => countB - countA)
      .map(([archetype]) => archetype)
      .slice(0, 3);
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
          <div
            key={card.id}
            className="suggestion-card"
            onContextMenu={(e) => handleRightClick(card, e)}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, card)}
          >
            <img
              src={getCardImageUrl(card.id, "small")}
              alt={card.name}
              className="suggestion-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `${
                  import.meta.env.VITE_YGO_CDN_URL
                }/images/card_back.png`;
                target.classList.add("card-image-fallback");
              }}
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
