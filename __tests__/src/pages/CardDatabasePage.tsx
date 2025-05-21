import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { ThemeProvider } from "styled-components";
import { Link } from "react-router-dom";
import theme from "../styles/theme";
import AppLayout from "../components/Layout/AppLayout";
import Card from "../components/UI/Card";
import { getCardImageUrl } from "../utils/cardImages";
import { Search, Filter, X, ChevronDown, ChevronUp } from "react-feather";
import debounce from "lodash/debounce";

interface YugiohCard {
  id: number;
  name: string;
  type: string;
  desc: string;
  atk?: number;
  def?: number;
  race: string;
  attribute?: string;
  archetype?: string;
  level?: number;
}

const CARD_TYPES = [
  "Effect Monster",
  "Flip Effect Monster",
  "Fusion Monster",
  "Gemini Monster",
  "Link Monster",
  "Normal Monster",
  "Normal Tuner Monster",
  "Pendulum Effect Monster",
  "Pendulum Normal Monster",
  "Ritual Monster",
  "Synchro Monster",
  "Synchro Tuner Monster",
  "XYZ Monster",
  "Spell Card",
  "Trap Card",
];

const CARD_ATTRIBUTES = [
  "DARK",
  "DIVINE",
  "EARTH",
  "FIRE",
  "LIGHT",
  "WATER",
  "WIND",
];

const CARD_RACES = [
  // Monster races
  "Aqua",
  "Beast",
  "Beast-Warrior",
  "Creator-God",
  "Cyberse",
  "Dinosaur",
  "Divine-Beast",
  "Dragon",
  "Fairy",
  "Fiend",
  "Fish",
  "Insect",
  "Machine",
  "Plant",
  "Psychic",
  "Pyro",
  "Reptile",
  "Rock",
  "Sea Serpent",
  "Spellcaster",
  "Thunder",
  "Warrior",
  "Winged Beast",
  "Zombie",
  // Spell types
  "Normal",
  "Field",
  "Equip",
  "Continuous",
  "Quick-Play",
  "Ritual",
  // Trap types
  "Counter",
];

const CardDatabasePage: React.FC = () => {
  const [cards, setCards] = useState<YugiohCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<YugiohCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
  const [levelRange, setLevelRange] = useState<[number | null, number | null]>([
    null,
    null,
  ]);
  const [atkRange, setAtkRange] = useState<[number | null, number | null]>([
    null,
    null,
  ]);
  const [defRange, setDefRange] = useState<[number | null, number | null]>([
    null,
    null,
  ]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [cardsPerPage] = useState(20);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortField, setSortField] = useState<
    "name" | "id" | "type" | "level" | "atk" | "def"
  >("name");

  // Fetch card data
  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);

        // Try to get from local storage first
        const cachedCards = localStorage.getItem("yugioh_cards");

        if (cachedCards) {
          const parsedCards = JSON.parse(cachedCards);
          setCards(parsedCards);
          setFilteredCards(parsedCards);
          setLoading(false);
          return;
        }

        // If not in cache, fetch from API
        const response = await fetch(
          "https://db.ygoprodeck.com/api/v7/cardinfo.php"
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch card data: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.data) {
          // Cache the results
          localStorage.setItem("yugioh_cards", JSON.stringify(data.data));
          setCards(data.data);
          setFilteredCards(data.data);
        } else {
          throw new Error("Invalid data format received from API");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  // Filter and sort cards
  useEffect(() => {
    let result = [...cards];

    // Apply search filter
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (card) =>
          card.name.toLowerCase().includes(searchLower) ||
          card.desc.toLowerCase().includes(searchLower) ||
          (card.archetype && card.archetype.toLowerCase().includes(searchLower))
      );
    }

    // Apply type filter
    if (selectedTypes.length > 0) {
      result = result.filter((card) => selectedTypes.includes(card.type));
    }

    // Apply attribute filter
    if (selectedAttributes.length > 0) {
      result = result.filter(
        (card) => card.attribute && selectedAttributes.includes(card.attribute)
      );
    }

    // Apply race filter
    if (selectedRaces.length > 0) {
      result = result.filter((card) => selectedRaces.includes(card.race));
    }

    // Apply level filter
    if (levelRange[0] !== null || levelRange[1] !== null) {
      result = result.filter((card) => {
        if (!card.level) return false;
        const meetsMinLevel =
          levelRange[0] === null || card.level >= levelRange[0];
        const meetsMaxLevel =
          levelRange[1] === null || card.level <= levelRange[1];
        return meetsMinLevel && meetsMaxLevel;
      });
    }

    // Apply ATK filter
    if (atkRange[0] !== null || atkRange[1] !== null) {
      result = result.filter((card) => {
        if (card.atk === undefined) return false;
        const meetsMinAtk = atkRange[0] === null || card.atk >= atkRange[0];
        const meetsMaxAtk = atkRange[1] === null || card.atk <= atkRange[1];
        return meetsMinAtk && meetsMaxAtk;
      });
    }

    // Apply DEF filter
    if (defRange[0] !== null || defRange[1] !== null) {
      result = result.filter((card) => {
        if (card.def === undefined) return false;
        const meetsMinDef = defRange[0] === null || card.def >= defRange[0];
        const meetsMaxDef = defRange[1] === null || card.def <= defRange[1];
        return meetsMinDef && meetsMaxDef;
      });
    }

    // Sort results
    result.sort((a, b) => {
      let valA, valB;

      switch (sortField) {
        case "name":
          valA = a.name;
          valB = b.name;
          break;
        case "id":
          valA = a.id;
          valB = b.id;
          break;
        case "type":
          valA = a.type;
          valB = b.type;
          break;
        case "level":
          valA = a.level || 0;
          valB = b.level || 0;
          break;
        case "atk":
          valA = a.atk === undefined ? -1 : a.atk;
          valB = b.atk === undefined ? -1 : b.atk;
          break;
        case "def":
          valA = a.def === undefined ? -1 : a.def;
          valB = b.def === undefined ? -1 : b.def;
          break;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredCards(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    cards,
    searchTerm,
    selectedTypes,
    selectedAttributes,
    selectedRaces,
    levelRange,
    atkRange,
    defRange,
    sortField,
    sortOrder,
  ]);

  // Pagination logic
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentCards = filteredCards.slice(indexOfFirstCard, indexOfLastCard);
  const totalPages = Math.ceil(filteredCards.length / cardsPerPage);

  // Event handlers for filters
  const handleSearchChange = debounce(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
    },
    300
  );

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleAttributeToggle = (attribute: string) => {
    setSelectedAttributes((prev) =>
      prev.includes(attribute)
        ? prev.filter((a) => a !== attribute)
        : [...prev, attribute]
    );
  };

  const handleRaceToggle = (race: string) => {
    setSelectedRaces((prev) =>
      prev.includes(race) ? prev.filter((r) => r !== race) : [...prev, race]
    );
  };

  const handleLevelRangeChange = (isMin: boolean, value: string) => {
    const numValue = value === "" ? null : Number(value);
    setLevelRange((prev) =>
      isMin ? [numValue, prev[1]] : [prev[0], numValue]
    );
  };

  const handleAtkRangeChange = (isMin: boolean, value: string) => {
    const numValue = value === "" ? null : Number(value);
    setAtkRange((prev) => (isMin ? [numValue, prev[1]] : [prev[0], numValue]));
  };

  const handleDefRangeChange = (isMin: boolean, value: string) => {
    const numValue = value === "" ? null : Number(value);
    setDefRange((prev) => (isMin ? [numValue, prev[1]] : [prev[0], numValue]));
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedTypes([]);
    setSelectedAttributes([]);
    setSelectedRaces([]);
    setLevelRange([null, null]);
    setAtkRange([null, null]);
    setDefRange([null, null]);
    setSortField("name");
    setSortOrder("asc");
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <AppLayout>
          <PageContainer>
            <LoadingMessage>Loading card database...</LoadingMessage>
          </PageContainer>
        </AppLayout>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <AppLayout>
          <PageContainer>
            <ErrorMessage>{error}</ErrorMessage>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </PageContainer>
        </AppLayout>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <AppLayout>
        <PageContainer>
          <PageHeader>
            <h1>Yu-Gi-Oh! Card Database</h1>
            <p>Browse and search for Yu-Gi-Oh! cards</p>
          </PageHeader>

          <SearchFilterContainer>
            <SearchContainer>
              <SearchIcon size={18} />
              <SearchInput
                type="text"
                placeholder="Search by card name, description, or archetype..."
                onChange={handleSearchChange}
                defaultValue={searchTerm}
              />
              {searchTerm && (
                <ClearSearchButton onClick={() => setSearchTerm("")}>
                  <X size={16} />
                </ClearSearchButton>
              )}
            </SearchContainer>

            <FilterToggleButton onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} />
              {showFilters ? "Hide Filters" : "Show Filters"}
              {showFilters ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </FilterToggleButton>
          </SearchFilterContainer>

          {showFilters && (
            <FiltersPanel>
              <FiltersGrid>
                <FilterSection>
                  <FilterSectionTitle>Card Type</FilterSectionTitle>
                  <CheckboxContainer>
                    {CARD_TYPES.map((type) => (
                      <CheckboxLabel key={type}>
                        <Checkbox
                          type="checkbox"
                          checked={selectedTypes.includes(type)}
                          onChange={() => handleTypeToggle(type)}
                        />
                        {type}
                      </CheckboxLabel>
                    ))}
                  </CheckboxContainer>
                </FilterSection>

                <FilterSection>
                  <FilterSectionTitle>Attribute</FilterSectionTitle>
                  <CheckboxContainer>
                    {CARD_ATTRIBUTES.map((attribute) => (
                      <CheckboxLabel key={attribute}>
                        <Checkbox
                          type="checkbox"
                          checked={selectedAttributes.includes(attribute)}
                          onChange={() => handleAttributeToggle(attribute)}
                        />
                        {attribute}
                      </CheckboxLabel>
                    ))}
                  </CheckboxContainer>
                </FilterSection>

                <FilterSection>
                  <FilterSectionTitle>Race/Type</FilterSectionTitle>
                  <CheckboxContainer>
                    {CARD_RACES.map((race) => (
                      <CheckboxLabel key={race}>
                        <Checkbox
                          type="checkbox"
                          checked={selectedRaces.includes(race)}
                          onChange={() => handleRaceToggle(race)}
                        />
                        {race}
                      </CheckboxLabel>
                    ))}
                  </CheckboxContainer>
                </FilterSection>

                <FilterSection>
                  <FilterSectionTitle>Level/Rank</FilterSectionTitle>
                  <RangeInputs>
                    <RangeInput
                      type="number"
                      placeholder="Min"
                      min="1"
                      max="12"
                      value={levelRange[0] === null ? "" : levelRange[0]}
                      onChange={(e) =>
                        handleLevelRangeChange(true, e.target.value)
                      }
                    />
                    <span>to</span>
                    <RangeInput
                      type="number"
                      placeholder="Max"
                      min="1"
                      max="12"
                      value={levelRange[1] === null ? "" : levelRange[1]}
                      onChange={(e) =>
                        handleLevelRangeChange(false, e.target.value)
                      }
                    />
                  </RangeInputs>
                </FilterSection>

                <FilterSection>
                  <FilterSectionTitle>ATK</FilterSectionTitle>
                  <RangeInputs>
                    <RangeInput
                      type="number"
                      placeholder="Min"
                      min="0"
                      value={atkRange[0] === null ? "" : atkRange[0]}
                      onChange={(e) =>
                        handleAtkRangeChange(true, e.target.value)
                      }
                    />
                    <span>to</span>
                    <RangeInput
                      type="number"
                      placeholder="Max"
                      min="0"
                      value={atkRange[1] === null ? "" : atkRange[1]}
                      onChange={(e) =>
                        handleAtkRangeChange(false, e.target.value)
                      }
                    />
                  </RangeInputs>
                </FilterSection>

                <FilterSection>
                  <FilterSectionTitle>DEF</FilterSectionTitle>
                  <RangeInputs>
                    <RangeInput
                      type="number"
                      placeholder="Min"
                      min="0"
                      value={defRange[0] === null ? "" : defRange[0]}
                      onChange={(e) =>
                        handleDefRangeChange(true, e.target.value)
                      }
                    />
                    <span>to</span>
                    <RangeInput
                      type="number"
                      placeholder="Max"
                      min="0"
                      value={defRange[1] === null ? "" : defRange[1]}
                      onChange={(e) =>
                        handleDefRangeChange(false, e.target.value)
                      }
                    />
                  </RangeInputs>
                </FilterSection>
              </FiltersGrid>

              <FilterActions>
                <SortingOptions>
                  <SortingLabel>Sort by:</SortingLabel>
                  <SortSelect
                    value={sortField}
                    onChange={(e) =>
                      setSortField(e.target.value as typeof sortField)
                    }
                  >
                    <option value="name">Name</option>
                    <option value="id">Card ID</option>
                    <option value="type">Card Type</option>
                    <option value="level">Level/Rank</option>
                    <option value="atk">ATK</option>
                    <option value="def">DEF</option>
                  </SortSelect>
                  <SortOrderButton
                    onClick={() =>
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                    }
                  >
                    {sortOrder === "asc" ? "Ascending" : "Descending"}
                    {sortOrder === "asc" ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </SortOrderButton>
                </SortingOptions>

                <ClearFiltersButton onClick={handleClearFilters}>
                  Clear All Filters
                </ClearFiltersButton>
              </FilterActions>
            </FiltersPanel>
          )}

          <ResultStats>
            Showing {indexOfFirstCard + 1} -{" "}
            {Math.min(indexOfLastCard, filteredCards.length)} of{" "}
            {filteredCards.length} cards
          </ResultStats>

          {filteredCards.length === 0 ? (
            <NoResultsMessage>
              <p>No cards found matching the current filters.</p>
              <Button onClick={handleClearFilters}>Clear Filters</Button>
            </NoResultsMessage>
          ) : (
            <>
              <CardsGrid>
                {currentCards.map((card) => (
                  <CardItem
                    key={card.id}
                    to={`/cards/database/card/${card.id}`}
                  >
                    <CardImage
                      src={getCardImageUrl(card.id, "small")}
                      alt={card.name}
                    />
                    <CardName>{card.name}</CardName>
                    <CardType>{card.type}</CardType>
                  </CardItem>
                ))}
              </CardsGrid>

              <Pagination>
                <PaginationButton
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  First
                </PaginationButton>
                <PaginationButton
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </PaginationButton>

                <PageInfo>
                  Page {currentPage} of {totalPages}
                </PageInfo>

                <PaginationButton
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </PaginationButton>
                <PaginationButton
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  Last
                </PaginationButton>
              </Pagination>
            </>
          )}
        </PageContainer>
      </AppLayout>
    </ThemeProvider>
  );
};

// Styled Components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;

  h1 {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.typography.size["2xl"]};
    margin: 0;
  }

  p {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: ${({ theme }) => theme.typography.size.md};
  }
`;

const SearchFilterContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  position: relative;
  flex-grow: 1;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SearchInput = styled.input`
  flex-grow: 1;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.sm}
    ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.xl};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.size.md};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary.light};
  }
`;

const ClearSearchButton = styled.button`
  position: absolute;
  right: ${({ theme }) => theme.spacing.sm};
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const FilterToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  background-color: ${({ theme }) => theme.colors.background.card};
  color: ${({ theme }) => theme.colors.primary.main};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.weight.medium};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary.light};
    color: ${({ theme }) => theme.colors.primary.dark};
  }
`;

const FiltersPanel = styled.div`
  background-color: ${({ theme }) => theme.colors.background.paper};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
`;

const FilterSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FilterSectionTitle = styled.h3`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.size.md};
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const CheckboxContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  max-height: 200px;
  overflow-y: auto;
  padding-right: ${({ theme }) => theme.spacing.sm};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Checkbox = styled.input`
  cursor: pointer;
`;

const RangeInputs = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};

  span {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const RangeInput = styled.input`
  width: 80px;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary.light};
  }
`;

const FilterActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  padding-top: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const SortingOptions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const SortingLabel = styled.label`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const SortSelect = styled.select`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.paper};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.size.sm};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
  }
`;

const SortOrderButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  background-color: ${({ theme }) => theme.colors.background.paper};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.size.sm};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.card};
  }
`;

const ClearFiltersButton = styled.button`
  background-color: ${({ theme }) => theme.colors.background.paper};
  color: ${({ theme }) => theme.colors.error.main};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.weight.medium};

  &:hover {
    background-color: ${({ theme }) => theme.colors.error.light};
    color: ${({ theme }) => theme.colors.error.dark};
    border-color: ${({ theme }) => theme.colors.error.main};
  }
`;

const ResultStats = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const CardItem = styled(Link)`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 320px; /* Fixed height for consistent card sizing */

  &:hover {
    transform: translateY(-5px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 220px; /* Fixed height for the image */
  object-fit: contain; /* Ensure image maintains aspect ratio */
  background-color: ${({ theme }) => theme.colors.background.card};
  flex-shrink: 0; /* Prevent image from shrinking */
`;

const CardName = styled.h3`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: ${({ theme }) => theme.spacing.xs};
  text-align: center;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  height: 50px; /* Fixed height for card name */
  /* Display 2 lines max and add ellipsis if it exceeds */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const CardType = styled.div`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 ${({ theme }) => theme.spacing.xs}
    ${({ theme }) => theme.spacing.xs};
  text-align: center;
  height: 25px; /* Fixed height for card type */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
`;

const PaginationButton = styled.button`
  background-color: ${({ theme }) => theme.colors.background.paper};
  color: ${({ theme }) => theme.colors.primary.main};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.size.sm};

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.primary.light};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
  margin: 0 ${({ theme }) => theme.spacing.md};
`;

const Button = styled.button`
  background-color: ${({ theme }) => theme.colors.primary.main};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.weight.medium};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary.dark};
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.error.main};
  font-size: ${({ theme }) => theme.typography.size.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.xl};
`;

const NoResultsMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl} 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};

  p {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: ${({ theme }) => theme.typography.size.lg};
  }
`;

export default CardDatabasePage;
