import { useState, useEffect, useCallback } from "react";
import { Card, SearchFilters } from "../types";

export function useCardSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    name: "",
    type: "",
    attribute: "",
    level: "",
    race: "",
    text: "",
  });
  const [results, setResults] = useState<Card[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEmptySearch, setIsEmptySearch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perform search with debounce in SearchPanel component
  const performSearch = useCallback(
    async (
      searchParams: SearchFilters | { fname: string },
      isAdvancedSearch: boolean
    ) => {
      if (
        (!isAdvancedSearch &&
          (!("fname" in searchParams) || searchParams.fname.length < 3)) ||
        (isAdvancedSearch &&
          !Object.values(searchParams).some((v) => v && v.length >= 3))
      ) {
        setResults([]);
        setIsEmptySearch(false);
        return;
      }

      setIsSearching(true);
      setIsEmptySearch(false);
      setError(null);

      try {
        // Use the local analyzer API to get all cards
        const response = await fetch(
          `${import.meta.env.VITE_ANALYZER_API_URL}/cards`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.cards || !Array.isArray(data.cards)) {
          throw new Error("Invalid response format from API");
        }

        // Filter cards locally based on search parameters
        let filteredCards: Card[] = [];

        if (isAdvancedSearch) {
          // Handle advanced search
          filteredCards = data.cards.filter((card: Card) => {
            const filters = searchParams as SearchFilters;
            let match = true;

            if (filters.name && filters.name.length >= 3) {
              match =
                match &&
                card.name.toLowerCase().includes(filters.name.toLowerCase());
            }

            if (filters.type && filters.type.length >= 1) {
              match =
                match &&
                card.type.toLowerCase().includes(filters.type.toLowerCase());
            }

            if (filters.attribute && filters.attribute.length >= 1) {
              match =
                match &&
                card.attribute?.toLowerCase() ===
                  filters.attribute.toLowerCase();
            }

            if (filters.level && filters.level.length >= 1) {
              match = match && card.level?.toString() === filters.level;
            }

            if (filters.race && filters.race.length >= 1) {
              match =
                match &&
                card.race?.toLowerCase().includes(filters.race.toLowerCase());
            }

            if (filters.text && filters.text.length >= 3) {
              match =
                match &&
                card.desc.toLowerCase().includes(filters.text.toLowerCase());
            }

            return match;
          });
        } else {
          // Handle basic search (by name)
          const searchName = "fname" in searchParams ? searchParams.fname : "";
          if (searchName && searchName.length >= 3) {
            filteredCards = data.cards.filter((card: Card) =>
              card.name.toLowerCase().includes(searchName.toLowerCase())
            );
          }
        }

        // Limit results to prevent performance issues
        filteredCards = filteredCards.slice(0, 30);

        setResults(filteredCards);
        setIsEmptySearch(filteredCards.length === 0);
      } catch (error) {
        console.error("Search error:", error);
        setError(
          error instanceof Error
            ? error.message
            : "An error occurred during the search"
        );
        setResults([]);
        setIsEmptySearch(true);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  return {
    searchTerm,
    setSearchTerm,
    searchFilters,
    setSearchFilters,
    results,
    isSearching,
    isEmptySearch,
    error,
    performSearch,
  };
}
