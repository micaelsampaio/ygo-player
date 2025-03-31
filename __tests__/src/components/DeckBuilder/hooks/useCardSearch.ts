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
        // Construct query params
        const queryParams = new URLSearchParams();

        // Add a limit to prevent too many results
        queryParams.append("num", "30");
        queryParams.append("offset", "0");

        // Add search parameters
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value && value.trim()) {
            queryParams.append(key, value.trim());
          }
        });

        // Make API request
        const response = await fetch(
          `https://db.ygoprodeck.com/api/v7/cardinfo.php?${queryParams}`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          setResults([]);
          setIsEmptySearch(true);
        } else {
          const cards = data.data || [];
          setResults(cards);
          setIsEmptySearch(cards.length === 0);
        }
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
