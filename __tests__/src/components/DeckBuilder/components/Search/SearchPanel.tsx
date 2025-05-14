import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  hideAddToDeck?: boolean; // Add prop to hide "Add to Deck" functionality
  isDuelInterface?: boolean; // Add prop to indicate when used in duel interface
  className?: string; // Add custom className prop
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  onCardSelect,
  onCardAdd,
  onToggleFavorite,
  targetDeck = "main",
  onTargetDeckChange,
  hideAddToDeck = false, // Default to showing "Add to Deck"
  isDuelInterface = false, // Default to false for backward compatibility
  className = "", // Default to empty string
}) => {
  const [activeTab, setActiveTab] = useState<"search" | "favorites">("search");
  const [favoriteCards, setFavoriteCards] = useState<Card[]>([]);
  const [showingArchetypeCards, setShowingArchetypeCards] = useState<boolean>(false);

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
    setResults,
    isSearching,
    setIsSearching,
    isEmptySearch,
    error,
    setError,
    performSearch,
  } = useCardSearch();

  // Calculate the dominant archetype directly from results
  const dominantArchetype = useMemo(() => {
    if (!results || results.length === 0) return null;

    // Count archetypes
    const archetypeCounts: Record<string, number> = {};
    results.forEach((card) => {
      if (card.archetype) {
        archetypeCounts[card.archetype] = (archetypeCounts[card.archetype] || 0) + 1;
      }
    });

    // Find the most common archetype
    let maxCount = 0;
    let dominantArchetype: string | null = null;

    Object.entries(archetypeCounts).forEach(([archetype, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantArchetype = archetype;
      }
    });

    // Only return if we have at least 2 cards from the same archetype
    return maxCount >= 2 ? dominantArchetype : null;
  }, [results]);

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

  const handleShowArchetypeCards = () => {
    if (dominantArchetype) {
      setShowingArchetypeCards(true);
      setIsSearching(true);

      // Search for all cards with the same archetype
      performSearch({ archetype: dominantArchetype }, true);
    }
  };

  return (
    <div
      className={`search-panel ${
        isDuelInterface ? "duel-interface" : ""
      } ${className}`}
    >
      {onTargetDeckChange && !hideAddToDeck && (
        <div className="target-deck-selector">
          <label>Add to:</label>
          <div className="target-toggle">
            <button
              className={`toggle-button ${
                targetDeck === "main" ? "active" : ""
              }`}
              onClick={() =>
                onTargetDeckChange(targetDeck === "main" ? "side" : "main")
              }
            >
              {targetDeck === "main" ? "Main/Extra Deck" : "Side Deck"}
            </button>
          </div>
        </div>
      )}

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

          {dominantArchetype && !showingArchetypeCards && (
            <div className="archetype-info">
              <span><span className="archetype-name">{dominantArchetype}</span> ({results.filter(card => card.archetype === dominantArchetype).length})</span>
              <button
                className="archetype-button"
                onClick={handleShowArchetypeCards}
              >
                View All
              </button>
            </div>
          )}
          
          {showingArchetypeCards && dominantArchetype && (
            <div className="archetype-info">
              <span>Showing all <span className="archetype-name">{dominantArchetype}</span> cards</span>
              <button
                className="archetype-button"
                onClick={() => {
                  setShowingArchetypeCards(false);
                  if (isAdvancedSearch) {
                    performSearch(searchFilters, true);
                  } else {
                    performSearch({ fname: searchTerm }, false);
                  }
                }}
              >
                Back
              </button>
            </div>
          )}

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
            hideAddToDeck={hideAddToDeck} // Pass the prop to SearchResults
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
            hideAddToDeck={hideAddToDeck} // Pass the prop to SearchResults
          />
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
