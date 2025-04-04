import React from "react";
import { Card } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";

interface SearchResultsProps {
  results: Card[];
  onCardSelect: (card: Card) => void; // This should show the card modal
  onCardAdd: (card: Card) => void;
  isEmptySearch: boolean;
  isLoading?: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onCardSelect,
  onCardAdd,
  isEmptySearch,
  isLoading = false,
}) => {
  const getMonsterBadgeClass = (type: string) => {
    if (type.includes("Normal")) return "monster normal";
    if (type.includes("Fusion")) return "monster fusion";
    if (type.includes("Synchro")) return "monster synchro";
    if (type.includes("XYZ")) return "monster xyz";
    if (type.includes("Ritual")) return "monster ritual";
    if (type.includes("Link")) return "monster link";
    if (type.includes("Monster")) return "monster effect";
    return "monster";
  };

  if (isLoading) {
    return <div className="search-loading">Searching for cards...</div>;
  }

  if (!results || results.length === 0) {
    return (
      <div className="no-results">
        {isEmptySearch
          ? "Enter a search term to find cards."
          : "No cards found. Try adjusting your search."}
      </div>
    );
  }

  return (
    <div className="search-results">
      {results.map((card) => {
        if (
          !card?.id ||
          !card?.name ||
          !card?.type ||
          !card?.card_images?.[0]
        ) {
          return null;
        }

        return (
          <div key={card.id} className="card-result">
            <div
              className="card-content"
              onClick={() => onCardSelect(card)} // This will trigger the card modal
            >
              <div className="card-container">
                <img
                  src={getCardImageUrl(card, "small")}
                  alt={card.name}
                  className="card-image"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://via.placeholder.com/44x64?text=No+Image";
                  }}
                />
              </div>

              <div className="card-info">
                <div className="card-primary">
                  <div
                    className="card-name"
                    title={card.name}
                    style={{
                      fontSize: "0.85rem",
                      lineHeight: "1.2",
                      fontWeight: 500,
                    }}
                  >
                    {card.name}
                  </div>
                  <div className="card-badges">
                    {card.type.includes("Monster") && (
                      <span
                        className={`badge ${getMonsterBadgeClass(card.type)}`}
                      >
                        {card.race || "Monster"}
                      </span>
                    )}
                    {card.attribute && (
                      <span className="badge attribute">{card.attribute}</span>
                    )}
                    {card.type.includes("Spell") && (
                      <span className="badge spell">Spell</span>
                    )}
                    {card.type.includes("Trap") && (
                      <span className="badge trap">Trap</span>
                    )}
                  </div>
                </div>
                <div className="card-secondary">
                  {card.level && (
                    <span className="level">Level {card.level}</span>
                  )}
                  {card.atk !== undefined && (
                    <span className="stats">
                      ATK: {card.atk} / DEF: {card.def}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              className="quick-add-search"
              onClick={(e) => {
                e.stopPropagation();
                onCardAdd(card);
              }}
              title="Add to deck"
            >
              +
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SearchResults;
