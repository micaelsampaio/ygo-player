import { useState, useCallback } from "react";
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
      searchParams: SearchFilters | { fname?: string; archetype?: string },
      isAdvancedSearch: boolean
    ) => {
      // For archetype searches, we don't need the minimum length check
      const isArchetypeSearch =
        "archetype" in searchParams && searchParams.archetype;
        
      console.log("Search params:", searchParams, "isAdvancedSearch:", isAdvancedSearch);

      // Allow searching with any filters, even if not all conditions are met
      // The only time we don't search is if there are absolutely no filters applied
      if (
        !isArchetypeSearch &&
        !isAdvancedSearch &&
        (!("fname" in searchParams) || !searchParams.fname)
      ) {
        // Only clear results if there's absolutely no search criteria
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
            const filters = searchParams as any; // Use 'any' to accommodate different property names
            let match = true;

            // Apply name filter if provided (always check this first)
            // Support both 'name' and 'fname' for compatibility
            const nameQuery = filters.name || filters.fname || "";
            if (nameQuery && nameQuery.length > 0) {
              match = card.name.toLowerCase().includes(nameQuery.toLowerCase());
              // If name doesn't match, return false immediately
              if (!match) return false;
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
              match =
                match &&
                (card.level?.toString() === filters.level ||
                  card.linkval?.toString() === filters.level);
            }

            if (filters.race && filters.race.length >= 1) {
              match =
                match &&
                !!card.race &&
                card.race.toLowerCase().includes(filters.race.toLowerCase());
            }

            if (filters.text && filters.text.length > 0) {
              match =
                match &&
                card.desc.toLowerCase().includes(filters.text.toLowerCase());
            }

            // Handle archetype search
            if ("archetype" in filters && filters.archetype && typeof filters.archetype === 'string') {
              match =
                match &&
                !!card.archetype &&
                typeof card.archetype === 'string' &&
                card.archetype.toLowerCase() ===
                  filters.archetype.toLowerCase();
            }

            return match;
          });
        } else {
          // Handle basic search (by name or archetype)
          if ("archetype" in searchParams && searchParams.archetype) {
            filteredCards = data.cards.filter(
              (card: Card) =>
                !!card.archetype &&
                typeof card.archetype === 'string' &&
                card.archetype.toLowerCase() ===
                  searchParams.archetype?.toLowerCase()
            );
          } else if ("fname" in searchParams && searchParams.fname) {
            // Basic name search
            const nameQuery = searchParams.fname.toLowerCase();
            filteredCards = data.cards.filter((card: Card) =>
              card.name.toLowerCase().includes(nameQuery)
            );
          }
        }

        // No longer limiting results to 30 cards
        // Removed the 30-card limit to show all matching results

        // Sort cards by frame type (card type)
        filteredCards.sort((a, b) => {
          // Define the order of card types
          const typeOrder: { [key: string]: number } = {
            "Normal Monster": 1,
            "Effect Monster": 2,
            "Ritual Monster": 3,
            "Fusion Monster": 4,
            "Synchro Monster": 5,
            "Xyz Monster": 6,
            "Pendulum Effect Monster": 7,
            "Link Monster": 8,
            "Spell Card": 9,
            "Trap Card": 10
          };
          
          // Extract the base type (ignoring subtypes)
          const getBaseType = (type: string): string => {
            if (type.includes("Monster")) return type;
            if (type.includes("Spell")) return "Spell Card";
            if (type.includes("Trap")) return "Trap Card";
            return type;
          };
          
          const typeA = getBaseType(a.type);
          const typeB = getBaseType(b.type);
          
          // Get the order value (default to 99 if not found)
          const orderA = typeOrder[typeA] || 99;
          const orderB = typeOrder[typeB] || 99;
          
          // Sort by type order
          return orderA - orderB;
        });

        console.log(`Found ${filteredCards.length} cards matching criteria`);
        
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
    setResults,
    isSearching,
    setIsSearching,
    isEmptySearch,
    error,
    setError,
    performSearch,
  };
}
