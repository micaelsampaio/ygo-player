import React from "react";
import { Card } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";

const CARD_BACK_IMAGE = "/assets/images/card-back.jpg";

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
              <div className="card-thumbnail">
                <img
                  src={getCardImageUrl(card, "small")}
                  alt={card.name}
                  loading="lazy"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.currentTarget.src = CARD_BACK_IMAGE;
                    e.currentTarget.classList.add("placeholder");
                  }}
                />
              </div>

              <div className="card-info">
                <div className="card-primary">
                  <div className="card-name" title={card.name}>
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
