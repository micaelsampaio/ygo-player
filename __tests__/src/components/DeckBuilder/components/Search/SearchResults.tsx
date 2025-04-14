import React from "react";
import { Card } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";

const CARD_BACK_IMAGE = "/assets/images/card-back.jpg";

interface SearchResultsProps {
  results: Card[];
  onCardSelect: (card: Card) => void; // This should show the card modal
  onCardAdd: (card: Card) => void;
  onToggleFavorite: (card: Card) => void;
  isEmptySearch: boolean;
  isLoading?: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onCardSelect,
  onCardAdd,
  onToggleFavorite,
  isEmptySearch,
  isLoading = false,
}) => {
  const getMonsterBadgeClass = (type: string) => {
    const typeLC = type.toLowerCase();
    if (typeLC.includes("normal")) return "monster normal";
    if (typeLC.includes("fusion")) return "monster fusion";
    if (typeLC.includes("synchro")) return "monster synchro";
    if (typeLC.includes("xyz")) return "monster xyz";
    if (typeLC.includes("ritual")) return "monster ritual";
    if (typeLC.includes("link")) return "monster link";
    if (typeLC.includes("effect")) return "monster effect";
    if (typeLC.includes("monster")) return "monster effect";
    return "";
  };

  // Handle right-click to directly add to the currently selected deck
  const handleRightClick = (card: Card, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent default context menu
    onCardAdd(card); // Add to the currently selected deck type
  };

  if (isLoading) {
    return <div className="search-results loading">Searching cards...</div>;
  }

  if (isEmptySearch) {
    return (
      <div className="search-results empty">Start typing to search cards</div>
    );
  }

  if (results.length === 0) {
    return <div className="search-results no-results">No cards found</div>;
  }

  return (
    <div className="search-results">
      <div className="search-results-grid">
        {results.map((card) => (
          <div 
            key={card.id} 
            className="suggestion-card" 
            onContextMenu={(e) => handleRightClick(card, e)}
          >
            <img
              src={getCardImageUrl(card, "small")}
              alt={card.name}
              className="suggestion-image"
              onClick={() => onCardSelect(card)}
              loading="lazy"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.src = CARD_BACK_IMAGE;
                e.currentTarget.classList.add("placeholder");
              }}
            />
            <div className="suggestion-details">
              <div className="suggestion-name" title={card.name}>
                {card.name}
              </div>
              <button
                className="add-suggestion"
                onClick={() => onCardAdd(card)}
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

export default SearchResults;
