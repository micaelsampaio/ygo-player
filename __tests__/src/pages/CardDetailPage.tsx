import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ThemeProvider } from "styled-components";
import theme from "../styles/theme";
import AppLayout from "../components/Layout/AppLayout";
import Card from "../components/UI/Card";
import { getCardImageUrl } from "../utils/cardImages";
import { ArrowLeft, ExternalLink, Info, DollarSign, Box, Tag, ChevronLeft } from "lucide-react";

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
  typeline?: string | null;
  humanReadableCardType?: string;
  frameType?: string;
  ygoprodeck_url?: string;
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
    image_url_cropped?: string;
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
  const navigate = useNavigate();

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
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
        const cachedCardsData = localStorage.getItem('cached_cards');
        const cachedCards = cachedCardsData ? JSON.parse(cachedCardsData) : {};

        if (cachedCards[id]) {
          console.log("Found card data in localStorage cache:", cachedCards[id]);
          setCard(cachedCards[id]);
          setLoading(false);
          return;
        }

        console.log(
          `Fetching card with ID: ${id} from ${apiBaseUrl}/cards?ids=${id}`
        );

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

        if (!data) {
          setError("No data returned from API");
          return;
        }

        let cardDetails = null;

        if (Array.isArray(data) && data.length > 0) {
          cardDetails = data[0];
          console.log("Card details from array format:", cardDetails);
          if (!cardDetails) {
            setError("Invalid card data format");
            return;
          }
        } else if (
          data &&
          data.data &&
          Array.isArray(data.data) &&
          data.data.length > 0
        ) {
          cardDetails = data.data[0];
          console.log("Card details from nested data format:", cardDetails);
        } else {
          console.error("Unexpected API response format:", data);
          setError("Card not found or invalid response format");
          return;
        }

        setCard(cardDetails);

        const existingCache = localStorage.getItem('cached_cards');
        const cardCache = existingCache ? JSON.parse(existingCache) : {};

        cardCache[id] = cardDetails;

        try {
          localStorage.setItem('cached_cards', JSON.stringify(cardCache));
        } catch (storageError) {
          console.warn("Failed to cache card in localStorage:", storageError);

          if (storageError instanceof DOMException && 
              (storageError.name === 'QuotaExceededError' || 
               storageError.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            
            console.log("localStorage quota exceeded, clearing cache and storing only current card");
            localStorage.clear();
            
            const newCache = {};
            newCache[id] = cardDetails;
            localStorage.setItem('cached_cards', JSON.stringify(newCache));
          }
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

  const goBack = () => {
    navigate(-1);
  };

  const renderCardStats = () => {
    if (!card) return null;

    const stats: JSX.Element[] = [];

    stats.push(
      <StatItem key="type">
        <StatLabel>Frame:</StatLabel>
        <StatValue>{card.type}</StatValue>
      </StatItem>
    );

    stats.push(
      <StatItem key="race">
        <StatLabel>{card.type && card.type.includes("Monster") ? "Monster Type:" : "Card Type:"}</StatLabel>
        <StatValue>{card.race}</StatValue>
      </StatItem>
    );

    if (card.attribute && card.attribute !== "") {
      stats.push(
        <StatItem key="attribute">
          <StatLabel>Attribute:</StatLabel>
          <StatValue>{card.attribute}</StatValue>
        </StatItem>
      );
    }

    if (card.level && card.level > 0) {
      stats.push(
        <StatItem key="level">
          <StatLabel>Level/Rank:</StatLabel>
          <StatValue>{card.level}</StatValue>
        </StatItem>
      );
    }

    if (card.atk !== undefined && card.atk !== null && card.atk !== 0) {
      stats.push(
        <StatItem key="atk">
          <StatLabel>ATK:</StatLabel>
          <StatValue>{card.atk}</StatValue>
        </StatItem>
      );
    }

    if (card.def !== undefined && card.def !== null && card.def !== 0) {
      stats.push(
        <StatItem key="def">
          <StatLabel>DEF:</StatLabel>
          <StatValue>{card.def}</StatValue>
        </StatItem>
      );
    }

    if (card.scale !== undefined && card.scale > 0) {
      stats.push(
        <StatItem key="scale">
          <StatLabel>Pendulum Scale:</StatLabel>
          <StatValue>{card.scale}</StatValue>
        </StatItem>
      );
    }

    if (card.linkval !== undefined && card.linkval > 0) {
      stats.push(
        <StatItem key="linkval">
          <StatLabel>Link Rating:</StatLabel>
          <StatValue>{card.linkval}</StatValue>
        </StatItem>
      );
    }

    if (card.linkmarkers && card.linkmarkers.length > 0) {
      stats.push(
        <StatItem key="linkmarkers">
          <StatLabel>Link Markers:</StatLabel>
          <StatValue>{card.linkmarkers.join(", ")}</StatValue>
        </StatItem>
      );
    }

    if (card.archetype && card.archetype !== "") {
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
        <SectionHeader>
          <Box size={18} />
          <h3>Card Sets</h3>
        </SectionHeader>
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
        <SectionHeader>
          <DollarSign size={18} />
          <h3>Market Prices</h3>
        </SectionHeader>
        <PricesGrid>
          {prices.tcgplayer_price && Number(prices.tcgplayer_price) > 0 && (
            <PriceItem>
              <PriceLabel>TCGPlayer</PriceLabel>
              <PriceValue>${prices.tcgplayer_price}</PriceValue>
              <ExternalLinkIcon
                href={`https://www.tcgplayer.com/search/yugioh/product?productLineName=yugioh&q=${encodeURIComponent(
                  card.name
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} />
              </ExternalLinkIcon>
            </PriceItem>
          )}
          {prices.cardmarket_price && Number(prices.cardmarket_price) > 0 && (
            <PriceItem>
              <PriceLabel>Cardmarket</PriceLabel>
              <PriceValue>€{prices.cardmarket_price}</PriceValue>
              <ExternalLinkIcon
                href={`https://www.cardmarket.com/en/YuGiOh/Products/Singles?searchString=${encodeURIComponent(
                  card.name
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} />
              </ExternalLinkIcon>
            </PriceItem>
          )}
          {prices.ebay_price && Number(prices.ebay_price) > 0 && (
            <PriceItem>
              <PriceLabel>eBay</PriceLabel>
              <PriceValue>${prices.ebay_price}</PriceValue>
              <ExternalLinkIcon
                href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
                  `yugioh ${card.name}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} />
              </ExternalLinkIcon>
            </PriceItem>
          )}
          {prices.amazon_price && Number(prices.amazon_price) > 0 && (
            <PriceItem>
              <PriceLabel>Amazon</PriceLabel>
              <PriceValue>${prices.amazon_price}</PriceValue>
              <ExternalLinkIcon
                href={`https://www.amazon.com/s?k=${encodeURIComponent(
                  `yugioh ${card.name}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} />
              </ExternalLinkIcon>
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
            <BackButton onClick={goBack}>
              <ChevronLeft size={20} />
              Back
            </BackButton>
            <PageTitle>Card Details</PageTitle>
          </NavigationBar>

          <StyledCard elevation="medium">
            <Card.Content>
              <CardLayout>
                <CardImageContainer>
                  <CardArtwork
                    src={
                      card && card.id
                        ? getCardImageUrl(card.id, "normal")
                        : `${cdnUrl}/images/card_back.png`
                    }
                    alt={card ? card.name : "Card"}
                    onError={(e) => {
                      console.error(
                        `Failed to load image for card ID: ${card?.id}`
                      );
                      const target = e.target as HTMLImageElement;
                      target.src = `${cdnUrl}/images/card_back.png`;
                    }}
                  />
                  {card?.archetype && (
                    <ArchetypeBadge>
                      <Tag size={14} />
                      {card.archetype}
                    </ArchetypeBadge>
                  )}
                </CardImageContainer>

                <CardDetailsContainer>
                  <CardHeader>
                    <CardTitle>{card?.name}</CardTitle>
                    <CardIdText>#{card?.id}</CardIdText>
                  </CardHeader>

                  {renderCardStats()}

                  <CardDescription>
                    <SectionHeader>
                      <Info size={18} />
                      <h3>Card Text</h3>
                    </SectionHeader>
                    <CardText>{card?.desc}</CardText>
                  </CardDescription>

                  {renderCardSets()}
                  {renderCardPrices()}

                  <RelatedActions>
                    <ActionButton onClick={goBack}>
                      <ChevronLeft size={18} />
                      Go Back
                    </ActionButton>
                  </RelatedActions>
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
  animation: fadeIn 0.5s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const NavigationBar = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.primary.main};
  background: none;
  border: none;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ theme }) => `${theme.colors.primary.main}10`};
    color: ${({ theme }) => theme.colors.primary.dark};
    transform: translateX(-3px);
  }
`;

const PageTitle = styled.h1`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.size.xl};
  margin: 0;
`;

const StyledCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  overflow: hidden;
  transition: all 0.3s ease;
  transform-origin: center;
  animation: cardAppear 0.5s ease-out;
  
  @keyframes cardAppear {
    from { 
      opacity: 0;
      transform: translateY(30px) scale(0.98);
    }
    to { 
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
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
  position: relative;
  transition: transform 0.3s ease;
`;

const CardArtwork = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  transition: transform 0.3s ease;
  animation: imageAppear 0.6s ease-out;

  @keyframes imageAppear {
    from { 
      opacity: 0;
      transform: scale(0.9);
    }
    to { 
      opacity: 1;
      transform: scale(1);
    }
  }

  &:hover {
    transform: scale(1.03);
  }
`;

const ArchetypeBadge = styled.div`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: ${({ theme }) => `${theme.colors.primary.main}CC`};
  color: white;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.typography.size.sm};
  display: flex;
  align-items: center;
  gap: 5px;
  backdrop-filter: blur(5px);
  animation: badgeAppear 0.8s ease-out;
  
  @keyframes badgeAppear {
    from { 
      opacity: 0;
      transform: translateX(-50%) translateY(10px);
    }
    to { 
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`;

const CardDetailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const CardHeader = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  position: relative;
  animation: slideDown 0.5s ease-out;
  
  @keyframes slideDown {
    from { 
      opacity: 0;
      transform: translateY(-10px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100px;
    height: 3px;
    background-color: ${({ theme }) => theme.colors.primary.main};
    border-radius: 3px;
  }
`;

const CardTitle = styled.h1`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.size["2xl"]};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
`;

const CardIdText = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

const CardStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => `${theme.colors.background.card}`};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border-left: 5px solid ${({ theme }) => theme.colors.primary.light};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm};
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  
  h3 {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.typography.size.lg};
    margin: 0;
  }
  
  svg {
    color: ${({ theme }) => theme.colors.primary.main};
  }
`;

const CardDescription = styled.div`
  background-color: ${({ theme }) => theme.colors.background.card};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border-left: 5px solid ${({ theme }) => theme.colors.info.main};
`;

const CardText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.md};
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
`;

const CardSetsSection = styled.div`
  background-color: ${({ theme }) => theme.colors.background.card};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border-left: 5px solid ${({ theme }) => theme.colors.success.main};
`;

const SetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  max-height: 300px;
  overflow-y: auto;
  padding-right: ${({ theme }) => theme.spacing.sm};
`;

const SetItem = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.paper};
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
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
  background-color: ${({ theme }) => theme.colors.background.card};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border-left: 5px solid ${({ theme }) => theme.colors.warning.main};
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
  background-color: ${({ theme }) => theme.colors.background.paper};
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
`;

const ExternalLinkIcon = styled.a`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  right: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.primary.main};
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.2);
    color: ${({ theme }) => theme.colors.primary.dark};
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

const RelatedActions = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-top: ${({ theme }) => theme.spacing.md};
  gap: ${({ theme }) => theme.spacing.md};
  animation: fadeIn 0.7s ease-out;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background-color: ${({ theme }) => theme.colors.primary.main};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primary.dark};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
  
  &:active {
    transform: translateY(0);
  }
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
