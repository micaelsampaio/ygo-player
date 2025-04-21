import React from "react";
import { Card } from "../../types";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../../../utils/cardImages";

interface SearchResultsProps {
  results: Card[];
  onCardSelect: (card: Card) => void; // This should show the card modal
  onCardAdd: (card: Card) => void;
  onToggleFavorite: (card: Card) => void;
  isEmptySearch: boolean;
  isLoading?: boolean;
  hideAddToDeck?: boolean; // New prop to hide "Add to Deck" functionality
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onCardSelect,
  onCardAdd,
  onToggleFavorite,
  isEmptySearch,
  isLoading = false,
  hideAddToDeck = false, // Default to showing "Add to Deck"
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

  const getImageSource = (card: Card) => {
    // Always use our CDN instead of ygoprodeck.com
    return getCardImageUrl(card, "small");
  };

  // Handle right-click to directly add to the currently selected deck
  const handleRightClick = (card: Card, event: React.MouseEvent) => {
    if (hideAddToDeck) return; // Don't add to deck if hideAddToDeck is true
    event.preventDefault(); // Prevent default context menu
    onCardAdd(card); // Add to the currently selected deck type
  };

  // Add drag functionality to allow dragging cards to deck
  const handleDragStart = (e: React.DragEvent, card: Card) => {
    // Use the same format as CardGroups to be compatible with DeckEditor
    const dragData = {
      card: card,
      isFromSearchResults: true,
    };

    // Set the data as a JSON string
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));

    // Create a small drag image
    const dragElem = document.createElement("div");
    dragElem.style.width = "60px";
    dragElem.style.height = "88px";
    dragElem.style.backgroundImage = `url(${getImageSource(card)})`;
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
            className={`suggestion-card ${
              hideAddToDeck ? "no-add-button" : ""
            }`}
            onContextMenu={(e) => handleRightClick(card, e)}
            draggable={!hideAddToDeck}
            onDragStart={(e) => !hideAddToDeck && handleDragStart(e, card)}
          >
            <img
              src={getImageSource(card)}
              alt={card.name}
              className="suggestion-image"
              onClick={() => onCardSelect(card)}
              loading="lazy"
              crossOrigin="anonymous"
              onError={(e) => {
                console.log(`Failed to load image for card: ${card.name}`);
                e.currentTarget.src = CARD_BACK_IMAGE;
                e.currentTarget.classList.add("placeholder");
              }}
            />
            <div className="suggestion-details">
              <div className="suggestion-name" title={card.name}>
                {card.name}
              </div>
              {!hideAddToDeck ? (
                <button
                  className="add-suggestion"
                  onClick={() => onCardAdd(card)}
                >
                  Add to Deck
                </button>
              ) : (
                <div className="spacer"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
