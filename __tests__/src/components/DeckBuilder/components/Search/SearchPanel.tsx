import React, { useState, useEffect, useCallback } from "react";
import { Card, SearchFilters } from "../../types";
import BasicSearch from "./BasicSearch";
import AdvancedSearch from "./AdvancedSearch";
import SearchResults from "./SearchResults";
import { useCardSearch } from "../../hooks/useCardSearch";
import "./SearchPanel.css";

interface SearchPanelProps {
  onCardSelect: (card: Card) => void;
  onCardAdd: (card: Card) => void;
  onToggleFavorite: (card: Card) => void;
  targetDeck?: "main" | "side";
  onTargetDeckChange?: (target: "main" | "side") => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  onCardSelect,
  onCardAdd,
  onToggleFavorite,
  targetDeck = "main",
  onTargetDeckChange,
}) => {
  const [activeTab, setActiveTab] = useState<"search" | "favorites">("search");
  const [favoriteCards, setFavoriteCards] = useState<Card[]>([]);

  useEffect(() => {
    // Load favorites from localStorage
    const stored = localStorage.getItem("favoriteCards");
    if (stored) {
      setFavoriteCards(JSON.parse(stored));
    }
  }, []);

  // Add event listener for favorites updates
  useEffect(() => {
    const handleFavoritesUpdate = () => {
      const stored = localStorage.getItem("favoriteCards");
      if (stored) {
        setFavoriteCards(JSON.parse(stored));
      }
    };

    window.addEventListener("favoritesUpdated", handleFavoritesUpdate);
    return () => {
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdate);
    };
  }, []);

  const handleToggleFavorite = useCallback(
    (card: Card) => {
      onToggleFavorite(card);
    },
    [onToggleFavorite]
  );

  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const {
    searchTerm,
    setSearchTerm,
    searchFilters,
    setSearchFilters,
    results,
    isSearching,
    isEmptySearch,
    error,
    performSearch,
  } = useCardSearch();

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [debouncedFilters, setDebouncedFilters] = useState(searchFilters);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(searchFilters);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchFilters]);

  // Auto-search when debounced values change
  useEffect(() => {
    if (
      (debouncedSearchTerm && debouncedSearchTerm.length >= 3) ||
      Object.values(debouncedFilters).some((v) => v && v.length > 0)
    ) {
      if (isAdvancedSearch) {
        // Map the filters to the API expected format
        const apiFilters = {
          fname: debouncedFilters.name || "",
          desc: debouncedFilters.text || "",
          type: debouncedFilters.type || "",
          attribute: debouncedFilters.attribute || "",
          level: debouncedFilters.level || "",
          race: debouncedFilters.race || "",
        };
        performSearch(apiFilters, true);
      } else {
        performSearch({ fname: debouncedSearchTerm }, false);
      }
    }
  }, [debouncedSearchTerm, debouncedFilters, isAdvancedSearch, performSearch]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setSearchFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdvancedSearch) {
      performSearch(searchFilters, true);
    } else {
      performSearch({ fname: searchTerm }, false);
    }
  };

  return (
    <div className="search-panel">
      <div className="search-tabs">
        <button
          className={activeTab === "search" ? "active" : ""}
          onClick={() => setActiveTab("search")}
        >
          Search
        </button>
        <button
          className={activeTab === "favorites" ? "active" : ""}
          onClick={() => setActiveTab("favorites")}
        >
          Favorites ({favoriteCards.length})
        </button>
      </div>

      {onTargetDeckChange && (
        <div className="target-deck-selector">
          <label>Add cards to:</label>
          <div className="target-buttons">
            <button
              type="button"
              className={targetDeck === "main" ? "active" : ""}
              onClick={() => onTargetDeckChange("main")}
            >
              Main/Extra Deck
            </button>
            <button
              type="button"
              className={targetDeck === "side" ? "active" : ""}
              onClick={() => onTargetDeckChange("side")}
            >
              Side Deck
            </button>
          </div>
        </div>
      )}

      {activeTab === "search" ? (
        <>
          <div className="search-toggle">
            <button
              className={!isAdvancedSearch ? "active" : ""}
              onClick={() => setIsAdvancedSearch(false)}
            >
              Basic Search
            </button>
            <button
              className={isAdvancedSearch ? "active" : ""}
              onClick={() => setIsAdvancedSearch(true)}
            >
              Advanced Search
            </button>
          </div>

          <form onSubmit={handleManualSearch}>
            {!isAdvancedSearch ? (
              <BasicSearch
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
              />
            ) : (
              <AdvancedSearch
                searchFilters={searchFilters}
                onFilterChange={handleFilterChange}
              />
            )}

            <button
              type="submit"
              className="search-button"
              disabled={
                isSearching ||
                (!isAdvancedSearch && (!searchTerm || searchTerm.length < 3))
              }
            >
              {isSearching ? "Searching..." : "Search Cards"}
            </button>
          </form>

          <div className="search-status">
            {isSearching && (
              <span className="searching-indicator">Searching...</span>
            )}
            {!isSearching && results.length > 0 && (
              <span className="results-count">
                Found {results.length} cards
              </span>
            )}
            {!isSearching && isEmptySearch && (
              <span className="results-count">No cards found</span>
            )}
            {!isSearching && error && (
              <span className="search-error">{error}</span>
            )}
          </div>

          <SearchResults
            results={results.map((card) => ({
              ...card,
              isFavorite: favoriteCards.some((f) => f.id === card.id),
            }))}
            onCardSelect={(card) =>
              onCardSelect({
                ...card,
                isFavorite: favoriteCards.some((f) => f.id === card.id),
              })
            }
            onCardAdd={onCardAdd}
            onToggleFavorite={handleToggleFavorite}
            isEmptySearch={isEmptySearch}
            isLoading={isSearching}
          />
        </>
      ) : (
        <div className="favorites-content">
          <SearchResults
            results={favoriteCards}
            onCardSelect={onCardSelect}
            onCardAdd={onCardAdd}
            onToggleFavorite={handleToggleFavorite}
            isEmptySearch={false}
            isLoading={false}
          />
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
