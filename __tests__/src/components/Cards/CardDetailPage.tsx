import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import AppLayout from "../Layout/AppLayout";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Info,
  Shield,
  Award,
  Database,
} from "lucide-react";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../utils/cardImages";
import theme from "../../styles/theme";
import { Button, Card, Badge } from "../UI";

// Type definition for card details
interface CardData {
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
  card_sets?: Array<{
    set_name: string;
    set_code: string;
    set_rarity: string;
    set_price: string;
  }>;
  card_images?: Array<{
    id: number;
    image_url: string;
    image_url_small: string;
  }>;
  card_prices?: Array<{
    cardmarket_price: string;
    tcgplayer_price: string;
    ebay_price: string;
    amazon_price: string;
    coolstuffinc_price: string;
  }>;
  banlist_info?: {
    ban_tcg?: string;
    ban_ocg?: string;
    ban_goat?: string;
  };
}

const CardDetailPage: React.FC = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [similarCards, setSimilarCards] = useState<CardData[]>([]);
  const [activeTab, setActiveTab] = useState<
    "info" | "sets" | "rulings" | "prices"
  >("info");

  useEffect(() => {
    const fetchCardDetails = async () => {
      if (!cardId) return;

      setLoading(true);
      setError(null);

      try {
        // First check if we have the card in local storage
        const localCards = localStorage.getItem("ygo_cards_cache");
        let cardData: CardData | null = null;

        if (localCards) {
          const parsedCards = JSON.parse(localCards);
          cardData = parsedCards.find(
            (c: CardData) => c.id === Number(cardId) || c.id === cardId
          );
        }

        // If not in local storage, fetch from API
        if (!cardData) {
          const response = await fetch(
            `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${cardId}`
          );
          if (!response.ok) throw new Error("Failed to fetch card details");

          const data = await response.json();
          cardData = data.data[0];
        }

        setCard(cardData);

        // Check if card is in favorites
        const storedFavorites = JSON.parse(
          localStorage.getItem("favoriteCards") || "[]"
        );
        setIsFavorite(
          storedFavorites.some((fav: any) => fav.id === Number(cardId))
        );

        // Fetch similar cards (same archetype or type)
        if (cardData?.archetype) {
          fetchSimilarCards(cardData.archetype);
        }
      } catch (err) {
        console.error("Error fetching card details:", err);
        setError("Failed to load card details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCardDetails();
  }, [cardId]);

  const fetchSimilarCards = async (archetype: string) => {
    try {
      const response = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?archetype=${encodeURIComponent(
          archetype
        )}&num=6&offset=0`
      );
      if (!response.ok) return;

      const data = await response.json();
      // Filter out the current card and limit to 5 cards
      const filtered = data.data
        .filter((c: CardData) => c.id !== Number(cardId))
        .slice(0, 5);
      setSimilarCards(filtered);
    } catch (err) {
      console.error("Error fetching similar cards:", err);
    }
  };

  const handleToggleFavorite = () => {
    if (!card) return;

    const storedFavorites = JSON.parse(
      localStorage.getItem("favoriteCards") || "[]"
    );
    let newFavorites;

    if (isFavorite) {
      // Remove from favorites
      newFavorites = storedFavorites.filter(
        (fav: any) => fav.id !== Number(cardId)
      );
    } else {
      // Add to favorites
      newFavorites = [...storedFavorites, card];
    }

    localStorage.setItem("favoriteCards", JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  const goBack = () => {
    navigate(-1);
  };

  // Helper function to format card type for display
  const getCardTypeDetails = (type: string) => {
    const types = [];

    // Extract main card type
    if (type.includes("Monster")) types.push("Monster");
    else if (type.includes("Spell")) types.push("Spell");
    else if (type.includes("Trap")) types.push("Trap");

    // Extract subtypes
    if (type.includes("Normal")) types.push("Normal");
    if (type.includes("Effect")) types.push("Effect");
    if (type.includes("Ritual")) types.push("Ritual");
    if (type.includes("Fusion")) types.push("Fusion");
    if (type.includes("Synchro")) types.push("Synchro");
    if (type.includes("XYZ")) types.push("XYZ");
    if (type.includes("Link")) types.push("Link");
    if (type.includes("Pendulum")) types.push("Pendulum");
    if (type.includes("Tuner")) types.push("Tuner");
    if (type.includes("Flip")) types.push("Flip");
    if (type.includes("Toon")) types.push("Toon");
    if (type.includes("Spirit")) types.push("Spirit");
    if (type.includes("Union")) types.push("Union");
    if (type.includes("Gemini")) types.push("Gemini");

    // For Spell/Trap subtypes
    if (type.includes("Quick-Play")) types.push("Quick-Play");
    if (type.includes("Field")) types.push("Field");
    if (type.includes("Equip")) types.push("Equip");
    if (type.includes("Continuous")) types.push("Continuous");
    if (type.includes("Counter")) types.push("Counter");

    return types;
  };

  // Function to render the colored badge for card type
  const renderTypeColor = (type: string) => {
    if (type.includes("Monster")) {
      if (type.includes("XYZ")) return theme.colors.card.xyz;
      if (type.includes("Fusion")) return theme.colors.card.fusion;
      if (type.includes("Synchro")) return theme.colors.card.synchro;
      if (type.includes("Link")) return theme.colors.card.link;
      if (type.includes("Ritual")) return theme.colors.card.ritual;
      if (type.includes("Pendulum")) return theme.colors.card.pendulum;
      if (type.includes("Normal")) return theme.colors.card.normal;
      return theme.colors.card.effect;
    }
    if (type.includes("Spell")) return theme.colors.card.spell;
    if (type.includes("Trap")) return theme.colors.card.trap;
    return theme.colors.background.paper;
  };

  // Function to highlight keywords in card description
  const getHighlightedCardText = (text: string) => {
    // First, escape any existing HTML to prevent issues
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const escapedText = escapeHtml(text);

    // Process quoted card names first
    let processedText = escapedText.replace(/"([^"]+)"/g, (match, cardName) => {
      return `<span class="keyword-card-name">${match}</span>`;
    });

    // Define categories of keywords to highlight
    const keywordPatterns = [
      {
        pattern: /\b(You can only use.*once per turn)\b/g,
        className: "keyword-restriction",
      },
      { pattern: /\b(Once per turn[,:])\b/g, className: "keyword-restriction" },
      {
        pattern:
          /\b(Normal Summon|Special Summon|Tribute Summon|Flip Summon|Synchro Summon|Xyz Summon|Link Summon|Fusion Summon|Ritual Summon)\b/g,
        className: "keyword-summon",
      },
      {
        pattern:
          /\b(destroy|negate|banish|control|damage|discard|draw|shuffle|search|add|target|attack)\b/gi,
        className: "keyword-action",
      },
      {
        pattern: /\b(hand|deck|GY|Graveyard|field|banished|Extra Deck)\b/g,
        className: "keyword-location",
      },
      {
        pattern: /\b(ATK|DEF|Level|Rank|Link Rating)\b/g,
        className: "keyword-stat",
      },
      {
        pattern: /\b(EARTH|WATER|FIRE|WIND|LIGHT|DARK|DIVINE)\b/g,
        className: "keyword-attribute",
      },
    ];

    // Apply patterns in order, but make sure we don't apply them inside already processed spans
    keywordPatterns.forEach(({ pattern, className }) => {
      const parts = processedText.split(/(<span[^>]*>.*?<\/span>)/g);

      // Process only the text parts (not the already created spans)
      for (let i = 0; i < parts.length; i += 2) {
        if (i < parts.length) {
          parts[i] = parts[i].replace(pattern, (match) => {
            return `<span class="${className}">${match}</span>`;
          });
        }
      }

      // Rejoin the parts
      processedText = parts.join("");
    });

    return { __html: processedText };
  };

  if (loading) {
    return (
      <AppLayout>
        <PageContainer>
          <BackButton onClick={goBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </BackButton>
          <LoadingContainer>
            <LoadingCard>
              <LoadingSpinner />
              <LoadingText>Loading card details...</LoadingText>
            </LoadingCard>
          </LoadingContainer>
        </PageContainer>
      </AppLayout>
    );
  }

  if (error || !card) {
    return (
      <AppLayout>
        <PageContainer>
          <BackButton onClick={goBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </BackButton>
          <ErrorContainer>
            <ErrorMessage>
              <h2>Error</h2>
              <p>{error || "Card not found"}</p>
              <Button variant="primary" onClick={goBack}>
                Go Back
              </Button>
            </ErrorMessage>
          </ErrorContainer>
        </PageContainer>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageContainer>
        <BackButton onClick={goBack}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </BackButton>

        <CardDetailGrid>
          <CardImageSection>
            <Card elevation="medium">
              <CardImageContainer>
                <CardImage
                  src={getCardImageUrl(card.id, "large")}
                  alt={card.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = CARD_BACK_IMAGE;
                  }}
                />
                <FavoriteButton
                  onClick={handleToggleFavorite}
                  $isFavorite={isFavorite}
                >
                  <Star size={22} fill={isFavorite ? "currentColor" : "none"} />
                </FavoriteButton>
              </CardImageContainer>
            </Card>

            {/* External links for the card */}
            <ExternalLinks>
              <ExternalButton
                as="a"
                href={`https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${card.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Database size={14} />
                <span>Official Database</span>
              </ExternalButton>

              <ExternalButton
                as="a"
                href={`https://yugipedia.com/wiki/${card.name.replace(
                  /\s+/g,
                  "_"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Info size={14} />
                <span>Yugipedia</span>
              </ExternalButton>
            </ExternalLinks>
          </CardImageSection>

          <CardInfoSection>
            <Card elevation="low">
              <TabsContainer>
                <TabButton
                  $active={activeTab === "info"}
                  onClick={() => setActiveTab("info")}
                >
                  Card Info
                </TabButton>
                <TabButton
                  $active={activeTab === "sets"}
                  onClick={() => setActiveTab("sets")}
                >
                  Card Sets
                </TabButton>
                <TabButton
                  $active={activeTab === "rulings"}
                  onClick={() => setActiveTab("rulings")}
                >
                  Rulings
                </TabButton>
                <TabButton
                  $active={activeTab === "prices"}
                  onClick={() => setActiveTab("prices")}
                >
                  Prices
                </TabButton>
              </TabsContainer>

              <TabContent>
                {activeTab === "info" && (
                  <>
                    <CardHeader>
                      <CardName>{card.name}</CardName>
                      <TypeContainer>
                        {getCardTypeDetails(card.type).map((type, index) => (
                          <TypeBadge key={index} $color={renderTypeColor(type)}>
                            {type}
                          </TypeBadge>
                        ))}
                      </TypeContainer>
                    </CardHeader>

                    <CardProperty>
                      <PropertyLabel>Type:</PropertyLabel>
                      <PropertyValue>
                        {card.race} {card.type}
                      </PropertyValue>
                    </CardProperty>

                    {card.attribute && (
                      <CardProperty>
                        <PropertyLabel>Attribute:</PropertyLabel>
                        <PropertyValue>{card.attribute}</PropertyValue>
                      </CardProperty>
                    )}

                    {card.level && (
                      <CardProperty>
                        <PropertyLabel>Level/Rank:</PropertyLabel>
                        <PropertyValue>{card.level} ★</PropertyValue>
                      </CardProperty>
                    )}

                    {card.linkval && (
                      <CardProperty>
                        <PropertyLabel>Link Rating:</PropertyLabel>
                        <PropertyValue>{card.linkval}</PropertyValue>
                      </CardProperty>
                    )}

                    {card.linkmarkers && card.linkmarkers.length > 0 && (
                      <CardProperty>
                        <PropertyLabel>Link Markers:</PropertyLabel>
                        <PropertyValue>
                          {card.linkmarkers.join(", ")}
                        </PropertyValue>
                      </CardProperty>
                    )}

                    {card.scale && (
                      <CardProperty>
                        <PropertyLabel>Pendulum Scale:</PropertyLabel>
                        <PropertyValue>{card.scale}</PropertyValue>
                      </CardProperty>
                    )}

                    {(card.atk !== undefined || card.def !== undefined) && (
                      <CardProperty>
                        <PropertyLabel>ATK/DEF:</PropertyLabel>
                        <PropertyValue>
                          {card.atk !== undefined ? card.atk : "?"} /{" "}
                          {card.def !== undefined ? card.def : "?"}
                        </PropertyValue>
                      </CardProperty>
                    )}

                    {card.archetype && (
                      <CardProperty>
                        <PropertyLabel>Archetype:</PropertyLabel>
                        <PropertyValue>{card.archetype}</PropertyValue>
                      </CardProperty>
                    )}

                    {card.banlist_info && (
                      <BanlistInfo>
                        <BanlistTitle>Banlist Status:</BanlistTitle>
                        <BanlistStatusContainer>
                          {card.banlist_info.ban_tcg && (
                            <BanlistStatus
                              $status={card.banlist_info.ban_tcg.toLowerCase()}
                            >
                              <span>TCG: {card.banlist_info.ban_tcg}</span>
                            </BanlistStatus>
                          )}
                          {card.banlist_info.ban_ocg && (
                            <BanlistStatus
                              $status={card.banlist_info.ban_ocg.toLowerCase()}
                            >
                              <span>OCG: {card.banlist_info.ban_ocg}</span>
                            </BanlistStatus>
                          )}
                        </BanlistStatusContainer>
                      </BanlistInfo>
                    )}

                    <CardDescription>
                      <DescriptionTitle>Card Effect:</DescriptionTitle>
                      <DescriptionText
                        dangerouslySetInnerHTML={getHighlightedCardText(
                          card.desc
                        )}
                      />
                    </CardDescription>
                  </>
                )}

                {activeTab === "sets" && (
                  <CardSetsContainer>
                    <h3>Card Sets</h3>
                    {card.card_sets && card.card_sets.length > 0 ? (
                      <SetsTable>
                        <thead>
                          <tr>
                            <th>Set Name</th>
                            <th>Set Code</th>
                            <th>Rarity</th>
                            <th>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {card.card_sets.map((set, index) => (
                            <tr key={index}>
                              <td>{set.set_name}</td>
                              <td>{set.set_code}</td>
                              <td>{set.set_rarity}</td>
                              <td>${set.set_price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </SetsTable>
                    ) : (
                      <NoDataMessage>
                        No set information available
                      </NoDataMessage>
                    )}
                  </CardSetsContainer>
                )}

                {activeTab === "rulings" && (
                  <RulingsContainer>
                    <h3>Card Rulings</h3>
                    <RulingsList>
                      <RulingItem>
                        <RulingTitle>General Rulings:</RulingTitle>
                        <RulingText>
                          Rulings data is not available in the API. For detailed
                          rulings, please check the official Yu-Gi-Oh! database
                          or Yugipedia.
                        </RulingText>
                      </RulingItem>
                    </RulingsList>
                    <RulingsDisclaimer>
                      Note: For official and up-to-date rulings, always refer to
                      the official Yu-Gi-Oh! database or contact a certified
                      judge.
                    </RulingsDisclaimer>
                  </RulingsContainer>
                )}

                {activeTab === "prices" && (
                  <PricesContainer>
                    <h3>Card Prices</h3>
                    {card.card_prices && card.card_prices.length > 0 ? (
                      <PricesTable>
                        <thead>
                          <tr>
                            <th>Marketplace</th>
                            <th>Price (USD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>TCGPlayer</td>
                            <td>${card.card_prices[0].tcgplayer_price}</td>
                          </tr>
                          <tr>
                            <td>Cardmarket</td>
                            <td>€{card.card_prices[0].cardmarket_price}</td>
                          </tr>
                          <tr>
                            <td>eBay</td>
                            <td>${card.card_prices[0].ebay_price}</td>
                          </tr>
                          <tr>
                            <td>Amazon</td>
                            <td>${card.card_prices[0].amazon_price}</td>
                          </tr>
                          <tr>
                            <td>CoolStuffInc</td>
                            <td>${card.card_prices[0].coolstuffinc_price}</td>
                          </tr>
                        </tbody>
                      </PricesTable>
                    ) : (
                      <NoDataMessage>
                        No price information available
                      </NoDataMessage>
                    )}
                    <PriceDisclaimer>
                      Note: Prices are approximate and subject to change. Last
                      updated: {new Date().toLocaleDateString()}
                    </PriceDisclaimer>
                  </PricesContainer>
                )}
              </TabContent>
            </Card>
          </CardInfoSection>
        </CardDetailGrid>

        {/* Related cards section */}
        {similarCards.length > 0 && (
          <RelatedCardsSection>
            <RelatedCardsTitle>Related Cards</RelatedCardsTitle>
            <RelatedCardsGrid>
              {similarCards.map((similarCard) => (
                <RelatedCardItem
                  key={similarCard.id}
                  onClick={() => navigate(`/card/${similarCard.id}`)}
                >
                  <RelatedCardImage
                    src={getCardImageUrl(similarCard.id, "small")}
                    alt={similarCard.name}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = CARD_BACK_IMAGE;
                    }}
                  />
                  <RelatedCardName>{similarCard.name}</RelatedCardName>
                </RelatedCardItem>
              ))}
            </RelatedCardsGrid>
          </RelatedCardsSection>
        )}
      </PageContainer>
    </AppLayout>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.background.card};
  border: none;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  font-weight: ${theme.typography.weight.medium};
  margin-bottom: ${theme.spacing.lg};
  transition: all 0.3s ease;
  box-shadow: ${theme.shadows.xs};

  &:hover {
    background: ${theme.colors.background.light};
    color: ${theme.colors.primary.main};
    transform: translateX(-8px);
    box-shadow: ${theme.shadows.sm}, 0 0 15px rgba(59, 130, 246, 0.2);
  }

  span {
    font-size: ${theme.typography.size.md};
  }

  @keyframes pulse {
    0% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(-3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  &:focus {
    outline: 2px solid ${theme.colors.primary.light};
    animation: pulse 1s infinite;
  }
`;

const CardDetailGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(250px, 1fr) 2fr;
  gap: ${theme.spacing.xl};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  animation: fadeIn 0.5s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const CardImageSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const CardImageContainer = styled.div`
  position: relative;
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  box-shadow: ${theme.shadows.md};
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: scale(1.03) rotate(1deg);
    box-shadow: ${theme.shadows.lg}, 0 0 20px rgba(59, 130, 246, 0.4);
  }
`;

const CardImage = styled.img`
  width: 100%;
  display: block;
  border-radius: ${theme.borderRadius.md};
`;

const FavoriteButton = styled.button<{ $isFavorite: boolean }>`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  background: ${({ $isFavorite }) =>
    $isFavorite ? theme.colors.warning.main : "rgba(0, 0, 0, 0.5)"};
  color: ${({ $isFavorite }) =>
    $isFavorite ? theme.colors.text.inverted : theme.colors.text.inverted};
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: ${({ $isFavorite }) => ($isFavorite ? 1 : 0.7)};
  transform: translateZ(0);

  &:hover {
    opacity: 1;
    transform: ${({ $isFavorite }) =>
      $isFavorite ? "scale(1.2) rotate(5deg)" : "scale(1.2)"};
    background: ${({ $isFavorite }) =>
      $isFavorite ? theme.colors.warning.dark : "rgba(0, 0, 0, 0.7)"};
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ExternalLinks = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.sm};
`;

const ExternalButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.background.card};
  color: ${theme.colors.text.secondary};
  border: none;
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  font-size: ${theme.typography.size.xs};
  transition: all 0.2s ease;
  text-decoration: none;

  &:hover {
    background: ${theme.colors.background.light};
    color: ${theme.colors.primary.main};
    transform: translateY(-2px);
  }
`;

const CardInfoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  animation: slideIn 0.5s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.border.default};
  margin-bottom: ${theme.spacing.md};
  overflow-x: auto;
  padding-bottom: 2px;

  &::-webkit-scrollbar {
    height: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.primary.light};
    border-radius: 3px;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: none;
  border: none;
  color: ${({ $active }) =>
    $active ? theme.colors.primary.main : theme.colors.text.secondary};
  font-weight: ${({ $active }) =>
    $active ? theme.typography.weight.bold : theme.typography.weight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 3px;
    background: ${({ $active }) =>
      $active ? theme.colors.primary.main : "transparent"};
    border-radius: 3px;
    transform: scaleX(${({ $active }) => ($active ? 1 : 0)});
    transform-origin: center;
    transition: transform 0.3s ease;
  }

  &:hover {
    color: ${theme.colors.primary.main};

    &:after {
      background: ${({ $active }) =>
        $active ? theme.colors.primary.main : theme.colors.primary.light};
      transform: scaleX(1);
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.primary.light};
  }
`;

const TabContent = styled.div`
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.xs};
  animation: fadeContent 0.5s ease;

  @keyframes fadeContent {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const CardHeader = styled.div`
  margin-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.light};
  padding-bottom: ${theme.spacing.md};
`;

const CardName = styled.h2`
  font-size: ${theme.typography.size.xl};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.xs};
  font-weight: ${theme.typography.weight.bold};
  line-height: 1.2;
`;

const TypeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.sm};
`;

const TypeBadge = styled.span<{ $color: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background-color: ${(props) => props.$color};
  color: white;
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.size.xs};
  font-weight: ${theme.typography.weight.medium};
  box-shadow: ${theme.shadows.xs};
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

const CardProperty = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} 0;
  border-bottom: 1px dashed ${theme.colors.border.light};
`;

const PropertyLabel = styled.span`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.secondary};
  min-width: 120px;
  font-size: ${theme.typography.size.sm};
`;

const PropertyValue = styled.span`
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
`;

const DescriptionTitle = styled.h3`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.sm};
  font-weight: ${theme.typography.weight.semibold};
`;

const DescriptionText = styled.div`
  font-size: ${theme.typography.size.md};
  line-height: 1.6;
  color: ${theme.colors.text.primary};

  .keyword-card-name {
    color: ${theme.colors.primary.main};
    font-weight: ${theme.typography.weight.semibold};
  }

  .keyword-restriction {
    color: ${theme.colors.error.main};
    font-weight: ${theme.typography.weight.medium};
  }

  .keyword-summon {
    color: ${theme.colors.success.main};
    font-weight: ${theme.typography.weight.medium};
  }

  .keyword-action {
    color: ${theme.colors.warning.main};
  }

  .keyword-location {
    color: ${theme.colors.info.main};
  }

  .keyword-stat {
    font-weight: ${theme.typography.weight.bold};
  }

  .keyword-attribute {
    color: ${theme.colors.secondary.main};
    font-weight: ${theme.typography.weight.medium};
  }
`;

const BanlistInfo = styled.div`
  background-color: ${theme.colors.background.light};
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  margin: ${theme.spacing.md} 0;
`;

const BanlistTitle = styled.h4`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.xs};
`;

const BanlistStatusContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const BanlistStatus = styled.div<{ $status: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${({ $status }) =>
    $status === "forbidden"
      ? theme.colors.error.main
      : $status === "limited"
      ? theme.colors.warning.main
      : $status === "semi-limited"
      ? theme.colors.info.main
      : theme.colors.success.main};
  color: white;
  font-size: ${theme.typography.size.xs};
  font-weight: ${theme.typography.weight.bold};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const SetsTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: ${theme.spacing.sm};
    background-color: ${theme.colors.background.light};
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.size.sm};
    font-weight: ${theme.typography.weight.semibold};
  }

  td {
    padding: ${theme.spacing.sm};
    border-bottom: 1px solid ${theme.colors.border.light};
    font-size: ${theme.typography.size.sm};
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:nth-child(even) {
    background-color: ${theme.colors.background.light};
  }

  tr:hover {
    background-color: ${theme.colors.background.hover};
  }
`;

const PricesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const PricesTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  box-shadow: ${theme.shadows.xs};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;

  th {
    text-align: left;
    padding: ${theme.spacing.md};
    background-color: ${theme.colors.background.light};
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.size.sm};
    font-weight: ${theme.typography.weight.semibold};
  }

  td {
    padding: ${theme.spacing.md};
    border-bottom: 1px solid ${theme.colors.border.light};
    font-size: ${theme.typography.size.md};
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:nth-child(even) {
    background-color: ${theme.colors.background.light};
  }

  tr:hover {
    background-color: ${theme.colors.background.hover};
  }

  td:last-child {
    font-weight: ${theme.typography.weight.semibold};
    color: ${theme.colors.success.main};
  }
`;

const NoDataMessage = styled.div`
  padding: ${theme.spacing.lg};
  text-align: center;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.md};
  font-style: italic;
  background-color: ${theme.colors.background.light};
  border-radius: ${theme.borderRadius.md};
`;

const RulingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const RulingsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const RulingItem = styled.div`
  background-color: ${theme.colors.background.light};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border-left: 4px solid ${theme.colors.info.main};
`;

const RulingTitle = styled.h4`
  margin: 0 0 ${theme.spacing.xs};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
  font-weight: ${theme.typography.weight.semibold};
`;

const RulingText = styled.p`
  margin: 0;
  font-size: ${theme.typography.size.md};
  line-height: 1.5;
  color: ${theme.colors.text.secondary};
`;

const RulingsDisclaimer = styled.div`
  font-size: ${theme.typography.size.xs};
  color: ${theme.colors.text.tertiary};
  font-style: italic;
  padding: ${theme.spacing.sm};
  background-color: ${theme.colors.background.light};
  border-radius: ${theme.borderRadius.md};
`;

const RelatedCardsSection = styled.div`
  margin-top: ${theme.spacing.xl};
  animation: fadeIn 1s ease-out;

  &:before {
    content: "";
    display: block;
    height: 3px;
    width: 60px;
    background: ${theme.colors.primary.main};
    margin-bottom: ${theme.spacing.md};
    border-radius: 3px;
  }
`;

const RelatedCardsTitle = styled.h3`
  font-size: ${theme.typography.size.lg};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.md};
  position: relative;
  display: inline-block;
`;

const RelatedCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${theme.spacing.md};

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
`;

const RelatedCardItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover {
    transform: translateY(-8px);

    img {
      box-shadow: ${theme.shadows.lg}, 0 5px 15px rgba(59, 130, 246, 0.3);
    }

    span {
      color: ${theme.colors.primary.main};
    }
  }
`;

const RelatedCardImage = styled.img`
  width: 100%;
  border-radius: ${theme.borderRadius.sm};
  box-shadow: ${theme.shadows.md};
  margin-bottom: ${theme.spacing.sm};
  transition: all 0.3s ease;
`;

const RelatedCardName = styled.span`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.primary};
  text-align: center;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
  color: ${theme.colors.text.secondary};
`;

const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: ${theme.colors.primary.main};
  animation: spin 1s ease infinite;
  margin-bottom: ${theme.spacing.md};

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: ${theme.colors.text.secondary};
  padding: ${theme.spacing.xl};

  button {
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    background-color: ${theme.colors.primary.main};
    color: white;
    border: none;
    border-radius: ${theme.borderRadius.md};
    margin-top: ${theme.spacing.lg};
    cursor: pointer;

    &:hover {
      background-color: ${theme.colors.primary.dark};
    }
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
`;

export default CardDetailPage;
