import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Button from "../UI/Button";
import { Logger } from "../../utils/logger";

// Import CDN URL for card images
const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);
const logger = Logger.createLogger("CardSelector");

// Fetch card data from YGOProDeck API
const API_BASE_URL = "https://db.ygoprodeck.com/api/v7";

interface CardItem {
  id: number;
  name: string;
  type?: string;
  desc?: string;
  imageUrl?: string;
}

interface CardSelectorProps {
  onSelect: (card: CardItem) => void;
  onClose: () => void;
}

// Only store card IDs for popular handtraps and staples
const POPULAR_CARD_IDS = [
  14558127, // Ash Blossom & Joyous Spring
  10045474, // Infinite Impermanence
  59438930, // Pot of Prosperity
  24224830, // Called by the Grave
  67616300, // Effect Veiler
  73642296, // Ghost Belle & Haunted Mansion
  9411399, // Destiny HERO - Destroyer Phoenix Enforcer
  4031928, // Change of Heart
  83152482, // Upstart Goblin
  40044918, // Evenly Matched
  13974207, // Nibiru, the Primal Being
  89463537, // Red Reboot
  71348837, // Dimensional Shifter
  97268402, // Effect Veiler
  53567095, // Red-Eyes Dark Dragoon
  14532163, // Lightning Storm
  23002292, // Red Supernova Dragon
  27204311, // Nibiru, the Primal Being
];

const CardSelector: React.FC<CardSelectorProps> = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularCards, setPopularCards] = useState<CardItem[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Load popular card data on component mount
  useEffect(() => {
    const loadPopularCards = async () => {
      setLoadingPopular(true);
      try {
        const cardPromises = POPULAR_CARD_IDS.map(async (id) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/cardinfo.php?id=${id}`
            );
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              const cardData = data.data[0];
              return {
                id: cardData.id,
                name: cardData.name,
                type: cardData.type,
                desc: cardData.desc,
                imageUrl: cardData.card_images?.[0]?.image_url_small,
              };
            }
            return null;
          } catch (error) {
            logger.error(`Error loading card data for ID ${id}:`, error);
            // Fallback with minimal data if API fails
            return {
              id,
              name: `Card #${id}`,
              type: "Unknown",
            };
          }
        });

        const loadedCards = (await Promise.all(cardPromises)).filter(
          Boolean
        ) as CardItem[];
        setPopularCards(loadedCards);
      } catch (error) {
        logger.error("Error loading popular cards:", error);
      } finally {
        setLoadingPopular(false);
      }
    };

    loadPopularCards();
  }, []);

  // Search for cards when the query changes
  useEffect(() => {
    const searchCards = async () => {
      if (!searchQuery || searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        // Search using YGOProDeck API
        const response = await fetch(
          `${API_BASE_URL}/cardinfo.php?fname=${encodeURIComponent(
            searchQuery
          )}`
        );
        const data = await response.json();

        if (data.data) {
          const results = data.data
            .map((card: any) => ({
              id: card.id,
              name: card.name,
              type: card.type,
              desc: card.desc,
              imageUrl: card.card_images?.[0]?.image_url_small,
            }))
            .slice(0, 20); // Limit to first 20 results

          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        logger.error("Error searching for cards:", error);
        // Fallback to filtering from popular cards if API fails
        const results = popularCards.filter((card) =>
          card.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(results);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchCards, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, popularCards]);

  const handleSelectCard = (card: CardItem) => {
    onSelect(card);
    onClose();
  };

  return (
    <SelectorContainer>
      <SelectorHeader>
        <h2>Select a Card</h2>
        <CloseButton onClick={onClose}>✕</CloseButton>
      </SelectorHeader>

      <SearchSection>
        <SearchInput
          type="text"
          placeholder="Search for cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <SearchInfo>
          {loading
            ? "Searching..."
            : searchQuery.length < 3
            ? "Type at least 3 characters to search"
            : `${searchResults.length} results found`}
        </SearchInfo>
      </SearchSection>

      {searchQuery.length >= 3 ? (
        <ResultsGrid>
          {searchResults.length === 0 && !loading ? (
            <NoResults>No cards found matching "{searchQuery}"</NoResults>
          ) : (
            searchResults.map((card) => (
              <CardItemContainer
                key={card.id}
                onClick={() => handleSelectCard(card)}
              >
                <CardImage
                  src={
                    card.imageUrl ||
                    `${cdnUrl}/images/cards_small/${card.id}.jpg`
                  }
                  alt={card.name}
                  onError={(e) => {
                    (
                      e.target as HTMLImageElement
                    ).src = `${cdnUrl}/images/cards_small/unknown.jpg`;
                  }}
                />
                <CardDetails>
                  <CardName>{card.name}</CardName>
                  <CardType>{card.type || "Unknown"}</CardType>
                </CardDetails>
              </CardItemContainer>
            ))
          )}
        </ResultsGrid>
      ) : (
        <>
          <SectionTitle>Popular Handtraps & Counters</SectionTitle>
          <ResultsGrid>
            {loadingPopular ? (
              <LoadingMessage>Loading popular cards...</LoadingMessage>
            ) : (
              popularCards.map((card) => (
                <CardItemContainer
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                >
                  <CardImage
                    src={
                      card.imageUrl ||
                      `${cdnUrl}/images/cards_small/${card.id}.jpg`
                    }
                    alt={card.name}
                    onError={(e) => {
                      (
                        e.target as HTMLImageElement
                      ).src = `${cdnUrl}/images/cards_small/unknown.jpg`;
                    }}
                  />
                  <CardDetails>
                    <CardName>{card.name}</CardName>
                    <CardType>{card.type || "Unknown"}</CardType>
                  </CardDetails>
                </CardItemContainer>
              ))
            )}
          </ResultsGrid>
        </>
      )}

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

const SearchInfo = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 1.5rem;
`;

const CardItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.colors.border.default};
  border-radius: ${(props) => props.theme.borderRadius.md};
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${(props) => props.theme.shadows.md};
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: auto;
  aspect-ratio: 3/4;
  object-fit: cover;
`;

const CardDetails = styled.div`
  padding: 0.75rem;
`;

const CardName = styled.div`
  font-weight: ${(props) => props.theme.typography.weight.medium};
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
`;

const CardType = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const NoResults = styled.div`
  grid-column: 1 / -1;
  padding: 2rem;
  text-align: center;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const LoadingMessage = styled.div`
  grid-column: 1 / -1;
  padding: 2rem;
  text-align: center;
  color: ${(props) => props.theme.colors.text.secondary};
`;

export default CardSelector;
