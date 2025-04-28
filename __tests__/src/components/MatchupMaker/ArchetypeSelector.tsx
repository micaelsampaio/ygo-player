import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Button from "../UI/Button";
import { Logger } from "../../utils/logger";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../utils/cardImages";

// Import CDN URL for card images (if needed)
const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);
const logger = Logger.createLogger("ArchetypeSelector");

// Fetch archetype data from YGOProDeck API
const API_BASE_URL = "https://db.ygoprodeck.com/api/v7";

// Define representative card IDs for popular archetypes
// These will be used to show images next to the archetype names
const ARCHETYPE_REPRESENTATIVE_CARDS: Record<string, number> = {
  "Sky Striker": 63288573,
  Swordsoul: 37818794,
  Branded: 23288411,
  "Branded Despia": 23288411,
  Spright: 78506013,
  Floowandereeze: 56495147,
  Tearalaments: 572850,
  "Dragon Link": 98095162,
  Eldlich: 95440946,
  Mathmech: 36639205,
  Exosister: 26606369,
  Dragonmaid: 24799107,
  "@Ignister": 59054773,
  ABC: 1561110,
  Marincess: 30691817,
  "Mekk-Knight": 28692962,
  Labrynth: 56063182,
  Runick: 73956664,
  Scareclaw: 56407504,
  Kashtira: 37629703,
  Tearlaments: 572850,
  Rikka: 92266279,
  Infernoble: 95793022,
  "Destiny HERO": 83965310,
  "Phantom Knights": 24212820,
};

interface ArchetypeItem {
  id: string;
  name: string;
  description?: string;
  representativeCardId?: number;
  imageUrl?: string;
}

interface ArchetypeSelectorProps {
  onSelect: (archetype: ArchetypeItem) => void;
  onClose: () => void;
}

// Empty placeholder for archetypes that will be loaded from API
const POPULAR_ARCHETYPES: ArchetypeItem[] = [];

const ArchetypeSelector: React.FC<ArchetypeSelectorProps> = ({
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ArchetypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [customArchetypeName, setCustomArchetypeName] = useState("");
  const [allArchetypes, setAllArchetypes] = useState<ArchetypeItem[]>([]);
  const [loadingArchetypes, setLoadingArchetypes] = useState(true);

  // Load all archetypes from the YGOProDeck API
  useEffect(() => {
    const fetchArchetypes = async () => {
      setLoadingArchetypes(true);
      try {
        const response = await fetch(`${API_BASE_URL}/archetypes.php`);
        const data = await response.json();

        if (data && Array.isArray(data)) {
          // Transform API data into our format
          const archetypesList = data.map((item: any) => {
            const name = item.archetype_name;
            // Generate a slug-style ID from the name
            const id = name
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");

            // Add a representative card ID if we have one defined
            const representativeCardId = ARCHETYPE_REPRESENTATIVE_CARDS[name];

            return {
              id,
              name,
              // Add description if available, otherwise use a generic one
              description: `${name} archetype`,
              // Add a representative card ID if we have one defined
              representativeCardId,
            };
          });

          // For archetypes without a defined representative card,
          // find a card from the archetype via API
          const archetypesWithImages = await Promise.all(
            archetypesList.map(async (archetype) => {
              // If we already have a representative card ID, no need to search
              if (archetype.representativeCardId) {
                return {
                  ...archetype,
                  imageUrl: getCardImageUrl(archetype.representativeCardId, "small"),
                };
              }

              // Otherwise, search for a card from this archetype
              try {
                const searchResponse = await fetch(
                  `${API_BASE_URL}/cardinfo.php?archetype=${encodeURIComponent(archetype.name)}&num=1&offset=0`
                );
                const searchData = await searchResponse.json();

                if (searchData.data && searchData.data.length > 0) {
                  const card = searchData.data[0];
                  return {
                    ...archetype,
                    representativeCardId: card.id,
                    imageUrl: getCardImageUrl(card.id, "small"),
                  };
                }
                return archetype;
              } catch (error) {
                logger.error(`Error finding image for ${archetype.name}:`, error);
                return archetype;
              }
            })
          );

          setAllArchetypes(archetypesWithImages);
          setSearchResults(archetypesWithImages.slice(0, 20)); // Show first 20 archetypes initially
        }
      } catch (error) {
        logger.error("Error fetching archetypes:", error);
        // Fallback to static list if API fails
        const fallbackList = Object.entries(ARCHETYPE_REPRESENTATIVE_CARDS).map(
          ([name, cardId]) => ({
            id: name
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, ""),
            name,
            description: `${name} archetype`,
            representativeCardId: cardId,
            imageUrl: getCardImageUrl(cardId, "small"),
          })
        );

        setAllArchetypes(fallbackList);
        setSearchResults(fallbackList);
      } finally {
        setLoadingArchetypes(false);
      }
    };

    fetchArchetypes();
  }, []);

  // Search for archetypes when the query changes
  useEffect(() => {
    const searchArchetypes = async () => {
      if (!searchQuery) {
        setSearchResults(allArchetypes.slice(0, 20)); // Show first 20 archetypes if no query
        return;
      }

      setLoading(true);
      try {
        // Filter archetypes based on search query
        const results = allArchetypes.filter((archetype) =>
          archetype.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setSearchResults(results);
      } catch (error) {
        logger.error("Error searching for archetypes", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchArchetypes, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, allArchetypes]);

  // Handle creating a custom archetype
  const handleCreateCustom = () => {
    if (!customArchetypeName.trim()) {
      alert("Please enter a name for your custom archetype");
      return;
    }

    const customArchetype: ArchetypeItem = {
      id: `custom-${Date.now()}`,
      name: customArchetypeName.trim(),
      description: "Custom archetype",
    };

    onSelect(customArchetype);
    onClose();
  };

  const handleSelectArchetype = (archetype: ArchetypeItem) => {
    onSelect(archetype);
    onClose();
  };

  return (
    <SelectorContainer>
      <SelectorHeader>
        <h2>Select an Archetype</h2>
        <CloseButton onClick={onClose}>✕</CloseButton>
      </SelectorHeader>

      <SearchSection>
        <SearchInput
          type="text"
          placeholder="Search for archetypes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <SearchInfo>
          {loading
            ? "Searching..."
            : searchQuery
            ? `${searchResults.length} archetypes found`
            : `Showing ${searchResults.length} of ${allArchetypes.length} archetypes`}
        </SearchInfo>
      </SearchSection>

      <CustomArchetypeSection>
        <SectionTitle>Create Custom Archetype</SectionTitle>
        <CustomArchetypeForm>
          <CustomNameInput
            type="text"
            placeholder="Enter custom archetype name..."
            value={customArchetypeName}
            onChange={(e) => setCustomArchetypeName(e.target.value)}
          />
          <Button onClick={handleCreateCustom} variant="primary">
            Create Custom
          </Button>
        </CustomArchetypeForm>
      </CustomArchetypeSection>

      <ResultsSection>
        <SectionTitle>
          {searchQuery
            ? `Search Results for "${searchQuery}"`
            : "Yu-Gi-Oh! Archetypes"}
        </SectionTitle>

        {loadingArchetypes ? (
          <LoadingMessage>
            Loading archetypes from YGOProDeck API...
          </LoadingMessage>
        ) : loading ? (
          <LoadingMessage>Searching...</LoadingMessage>
        ) : searchResults.length === 0 ? (
          <NoResults>No archetypes found matching "{searchQuery}"</NoResults>
        ) : (
          <ResultsGrid>
            {searchResults.map((archetype) => (
              <ArchetypeItemContainer
                key={archetype.id}
                onClick={() => handleSelectArchetype(archetype)}
              >
                {(archetype.imageUrl || archetype.representativeCardId) && (
                  <RepresentativeCard
                    src={
                      archetype.imageUrl || 
                      getCardImageUrl(archetype.representativeCardId, "small")
                    }
                    alt={archetype.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = CARD_BACK_IMAGE;
                    }}
                  />
                )}
                <ArchetypeDetails>
                  <ArchetypeName>{archetype.name}</ArchetypeName>
                  {archetype.description && (
                    <ArchetypeDescription>
                      {archetype.description}
                    </ArchetypeDescription>
                  )}
                </ArchetypeDetails>
              </ArchetypeItemContainer>
            ))}
          </ResultsGrid>
        )}
      </ResultsSection>

      <ButtonContainer>
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
      </ButtonContainer>
    </SelectorContainer>
  );
};

// Styled Components
const SelectorContainer = styled.div`
  width: 100%;
  max-width: 800px;
`;

const SelectorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  h2 {
    margin: 0;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${(props) => props.theme.colors.text.secondary};

  &:hover {
    color: ${(props) => props.theme.colors.text.primary};
  }
`;

const SearchInfo = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const SearchSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${(props) => props.theme.colors.border.default};
  border-radius: ${(props) => props.theme.borderRadius.md};
  font-size: 1rem;
`;

const CustomArchetypeSection = styled.div`
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: ${(props) => props.theme.colors.background.card};
  border-radius: ${(props) => props.theme.borderRadius.md};
`;

const CustomArchetypeForm = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const CustomNameInput = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid ${(props) => props.theme.colors.border.default};
  border-radius: ${(props) => props.theme.borderRadius.md};
  font-size: 1rem;
`;

const ResultsSection = styled.div`
  margin-bottom: 1.5rem;
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  max-height: 350px;
  overflow-y: auto;
`;

const ArchetypeItemContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid ${(props) => props.theme.colors.border.default};
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: 0.75rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${(props) => props.theme.shadows.md};
  }
`;

const RepresentativeCard = styled.img`
  width: 50px;
  height: 70px;
  object-fit: cover;
  border-radius: 4px;
`;

const ArchetypeDetails = styled.div`
  flex: 1;
`;

const ArchetypeName = styled.div`
  font-weight: ${(props) => props.theme.typography.weight.medium};
  margin-bottom: 0.25rem;
`;

const ArchetypeDescription = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
`;

const LoadingMessage = styled.div`
  padding: 1rem;
  text-align: center;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const NoResults = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
`;

export default ArchetypeSelector;
