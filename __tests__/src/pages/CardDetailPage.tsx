import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { ThemeProvider } from "styled-components";
import theme from "../styles/theme";
import AppLayout from "../components/Layout/AppLayout";
import Card from "../components/UI/Card";
import { getCardImageUrl } from "../utils/cardImages";
import { ArrowLeft, ExternalLink } from "react-feather";

interface YugiohCard {
  id: number;
  name: string;
  type: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  attribute?: string;
  archetype?: string;
  scale?: number;
  linkval?: number;
  linkmarkers?: string[];
  card_sets?: {
    set_name: string;
    set_code: string;
    set_rarity: string;
    set_rarity_code: string;
    set_price: string;
  }[];
  card_images?: {
    id: number;
    image_url: string;
    image_url_small: string;
  }[];
  card_prices?: {
    cardmarket_price: string;
    tcgplayer_price: string;
    ebay_price: string;
    amazon_price: string;
    coolstuffinc_price: string;
  }[];
}

const CardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<YugiohCard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get the API base URL from environment variables for API calls
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  // Get the CDN URL for images only
  const cdnUrl = import.meta.env.VITE_YGO_CDN_URL || "http://localhost:8080";

  useEffect(() => {
    const fetchCardData = async () => {
      if (!id) {
        setError("Invalid card ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Try to fetch from local storage first
        const cardData = localStorage.getItem(`card_${id}`);

        if (cardData) {
          console.log("Found card data in localStorage:", JSON.parse(cardData));
          setCard(JSON.parse(cardData));
          setLoading(false);
          return;
        }

        // Debug logging to verify API call parameters
        console.log(
          `Fetching card with ID: ${id} from ${apiBaseUrl}/cards?ids=${id}`
        );

        // Make the API call with proper query parameter
        const response = await fetch(`${apiBaseUrl}/cards?ids=${id}`, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        console.log(
          "API Response Status:",
          response.status,
          response.statusText
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch card data: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("API response full data:", data);

        // Check if data is falsy
        if (!data) {
          setError("No data returned from API");
          return;
        }

        if (Array.isArray(data) && data.length > 0) {
          // Handle response format as array - our API returns array
          const cardDetails = data[0];
          console.log("Card details from array format:", cardDetails);
          if (!cardDetails) {
            setError("Invalid card data format");
            return;
          }
          setCard(cardDetails);
          // Cache the card data in local storage
          localStorage.setItem(`card_${id}`, JSON.stringify(cardDetails));
        } else if (
          data &&
          data.data &&
          Array.isArray(data.data) &&
          data.data.length > 0
        ) {
          // Handle YGOProDeck-like response format
          const cardDetails = data.data[0];
          console.log("Card details from nested data format:", cardDetails);
          setCard(cardDetails);
          // Cache the card data in local storage
          localStorage.setItem(`card_${id}`, JSON.stringify(cardDetails));
        } else {
          console.error("Unexpected API response format:", data);
          setError("Card not found or invalid response format");
        }
      } catch (err) {
        console.error("Error fetching card:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCardData();
  }, [id, apiBaseUrl]);

  const renderCardStats = () => {
    if (!card) return null;

    const stats: JSX.Element[] = [];

    // Add Type
    stats.push(
      <StatItem key="type">
        <StatLabel>Type:</StatLabel>
        <StatValue>{card.type}</StatValue>
      </StatItem>
    );

    // Add Race/Type
    stats.push(
      <StatItem key="race">
        <StatLabel>Race:</StatLabel>
        <StatValue>{card.race}</StatValue>
      </StatItem>
    );

    // Add Attribute if applicable
    if (card.attribute) {
      stats.push(
        <StatItem key="attribute">
          <StatLabel>Attribute:</StatLabel>
          <StatValue>{card.attribute}</StatValue>
        </StatItem>
      );
    }

    // Add Level/Rank if applicable
    if (card.level) {
      stats.push(
        <StatItem key="level">
          <StatLabel>Level/Rank:</StatLabel>
          <StatValue>{card.level}</StatValue>
        </StatItem>
      );
    }

    // Add ATK if applicable
    if (card.atk !== undefined) {
      stats.push(
        <StatItem key="atk">
          <StatLabel>ATK:</StatLabel>
          <StatValue>{card.atk}</StatValue>
        </StatItem>
      );
    }

    // Add DEF if applicable
    if (card.def !== undefined) {
      stats.push(
        <StatItem key="def">
          <StatLabel>DEF:</StatLabel>
          <StatValue>{card.def}</StatValue>
        </StatItem>
      );
    }

    // Add Scale if applicable
    if (card.scale !== undefined) {
      stats.push(
        <StatItem key="scale">
          <StatLabel>Pendulum Scale:</StatLabel>
          <StatValue>{card.scale}</StatValue>
        </StatItem>
      );
    }

    // Add Link Rating if applicable
    if (card.linkval !== undefined) {
      stats.push(
        <StatItem key="linkval">
          <StatLabel>Link Rating:</StatLabel>
          <StatValue>{card.linkval}</StatValue>
        </StatItem>
      );
    }

    // Add Link Markers if applicable
    if (card.linkmarkers && card.linkmarkers.length > 0) {
      stats.push(
        <StatItem key="linkmarkers">
          <StatLabel>Link Markers:</StatLabel>
          <StatValue>{card.linkmarkers.join(", ")}</StatValue>
        </StatItem>
      );
    }

    // Add Archetype if applicable
    if (card.archetype) {
      stats.push(
        <StatItem key="archetype">
          <StatLabel>Archetype:</StatLabel>
          <StatValue>{card.archetype}</StatValue>
        </StatItem>
      );
    }

    return <CardStats>{stats}</CardStats>;
  };

  const renderCardSets = () => {
    if (!card || !card.card_sets || card.card_sets.length === 0) return null;

    return (
      <CardSetsSection>
        <h3>Card Sets</h3>
        <SetsGrid>
          {card.card_sets.map((set, index) => (
            <SetItem key={`${set.set_code}_${index}`}>
              <SetCode>{set.set_code}</SetCode>
              <SetName>{set.set_name}</SetName>
              <SetRarity>{set.set_rarity}</SetRarity>
            </SetItem>
          ))}
        </SetsGrid>
      </CardSetsSection>
    );
  };

  const renderCardPrices = () => {
    if (!card || !card.card_prices || card.card_prices.length === 0)
      return null;

    const prices = card.card_prices[0];

    return (
      <PricesSection>
        <h3>Market Prices</h3>
        <PricesGrid>
          {prices.tcgplayer_price && Number(prices.tcgplayer_price) > 0 && (
            <PriceItem>
              <PriceLabel>TCGPlayer</PriceLabel>
              <PriceValue>${prices.tcgplayer_price}</PriceValue>
              <ExternalLink
                href={`https://www.tcgplayer.com/search/yugioh/product?productLineName=yugioh&q=${encodeURIComponent(
                  card.name
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                size={16}
              />
            </PriceItem>
          )}
          {prices.cardmarket_price && Number(prices.cardmarket_price) > 0 && (
            <PriceItem>
              <PriceLabel>Cardmarket</PriceLabel>
              <PriceValue>€{prices.cardmarket_price}</PriceValue>
              <ExternalLink
                href={`https://www.cardmarket.com/en/YuGiOh/Products/Singles?searchString=${encodeURIComponent(
                  card.name
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                size={16}
              />
            </PriceItem>
          )}
          {prices.ebay_price && Number(prices.ebay_price) > 0 && (
            <PriceItem>
              <PriceLabel>eBay</PriceLabel>
              <PriceValue>${prices.ebay_price}</PriceValue>
              <ExternalLink
                href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
                  `yugioh ${card.name}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                size={16}
              />
            </PriceItem>
          )}
          {prices.amazon_price && Number(prices.amazon_price) > 0 && (
            <PriceItem>
              <PriceLabel>Amazon</PriceLabel>
              <PriceValue>${prices.amazon_price}</PriceValue>
              <ExternalLink
                href={`https://www.amazon.com/s?k=${encodeURIComponent(
                  `yugioh ${card.name}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                size={16}
              />
            </PriceItem>
          )}
        </PricesGrid>
      </PricesSection>
    );
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <AppLayout>
          <PageContainer>
            <LoadingContainer>Loading card details...</LoadingContainer>
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
            <ErrorContainer>
              <ErrorMessage>{error}</ErrorMessage>
              <BackLink to="/cards/database">Back to Card Database</BackLink>
            </ErrorContainer>
          </PageContainer>
        </AppLayout>
      </ThemeProvider>
    );
  }

  if (!card) {
    return (
      <ThemeProvider theme={theme}>
        <AppLayout>
          <PageContainer>
            <ErrorContainer>
              <ErrorMessage>Card not found</ErrorMessage>
              <BackLink to="/cards/database">Back to Card Database</BackLink>
            </ErrorContainer>
          </PageContainer>
        </AppLayout>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <AppLayout>
        <PageContainer>
          <NavigationBar>
            <BackLink to="/cards/database">
              <ArrowLeft size={16} /> Back to Card Database
            </BackLink>
          </NavigationBar>

          <StyledCard elevation="low">
            <Card.Content>
              <CardLayout>
                <CardImageContainer>
                  {/* Use the correct card image URL path based on our CDN structure */}
                  <CardArtwork
                    src={
                      card && card.id
                        ? `${cdnUrl}/images/cards_small/${card.id}.jpg`
                        : `${cdnUrl}/images/card_back.png`
                    }
                    alt={card ? card.name : "Card"}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `${cdnUrl}/images/card_back.png`;
                    }}
                  />
                </CardImageContainer>

                <CardDetailsContainer>
                  <CardHeader>
                    <CardTitle>{card.name}</CardTitle>
                    <CardIdText>#{card.id}</CardIdText>
                  </CardHeader>

                  {renderCardStats()}

                  <CardDescription>
                    <h3>Card Text</h3>
                    <CardText>{card.desc}</CardText>
                  </CardDescription>

                  {renderCardSets()}
                  {renderCardPrices()}
                </CardDetailsContainer>
              </CardLayout>
            </Card.Content>
          </StyledCard>
        </PageContainer>
      </AppLayout>
    </ThemeProvider>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const NavigationBar = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
`;

const BackLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.primary.main};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.weight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

const StyledCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const CardLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CardImageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

const CardArtwork = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const CardDetailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const CardHeader = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  padding-bottom: ${({ theme }) => theme.spacing.md};
`;

const CardTitle = styled.h1`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.size.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const CardIdText = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const CardStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.typography.size.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const CardDescription = styled.div`
  h3 {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.typography.size.lg};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

const CardText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.md};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const CardSetsSection = styled.div`
  h3 {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.typography.size.lg};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

const SetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const SetItem = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.card};
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SetCode = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SetName = styled.div`
  font-size: ${({ theme }) => theme.typography.size.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const SetRarity = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.info.main};
`;

const PricesSection = styled.div`
  h3 {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.typography.size.lg};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

const PricesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const PriceItem = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.card};
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;

  svg {
    position: absolute;
    top: ${({ theme }) => theme.spacing.sm};
    right: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.primary.main};
  }
`;

const PriceLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PriceValue = styled.div`
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.colors.success.main};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.lg};
  min-height: 400px;
`;

const ErrorMessage = styled.div`
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.colors.error.main};
  text-align: center;
`;

export default CardDetailPage;
