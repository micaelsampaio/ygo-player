import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styled from "styled-components";
import { YGODeckToImage } from "ygo-core-images-utils";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card } from "../UI";
import { YGOCardGrid } from "../UI/YGOCard";
import { ArrowLeft } from "lucide-react";

const DeckDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deckId } = useParams();
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>("");

  useEffect(() => {
    // Load the deck data
    if (deckId) {
      setLoading(true);
      try {
        // First try direct access with the key
        const storedDeck = localStorage.getItem(`deck_${deckId}`);

        if (storedDeck) {
          setDeck(JSON.parse(storedDeck));
          setFileName(deckId.replace(/\s+/g, "_").toLowerCase());
        } else {
          // If not found, search through all localStorage keys to find a deck with matching ID
          const found = findDeckById(deckId);
          if (found) {
            setDeck(found.deck);
            setFileName(found.name.replace(/\s+/g, "_").toLowerCase());
          }
        }
      } catch (error) {
        console.error("Error loading deck:", error);
      }
      setLoading(false);
    }
  }, [deckId]);

  // Helper function to search for a deck by ID
  const findDeckById = (id: string) => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("deck_")) {
        try {
          const deckData = localStorage.getItem(key);
          if (deckData) {
            const deck = JSON.parse(deckData);
            // Check if this deck has the ID we're looking for
            if (deck.id === id) {
              return { deck, name: key.replace("deck_", "") };
            }
          }
        } catch (error) {
          console.error(`Error checking deck ${key}:`, error);
        }
      }
    }
    return null;
  };

  const downloadDeckAsYdk = async () => {
    if (!deck || !deckId) return;

    const deckBuilder = new YGODeckToImage({
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });

    deckBuilder.downloadYdk({ fileName: `${fileName}.ydk` });
  };

  const downloadDeckAsPng = async () => {
    if (!deck || !deckId) return;

    const deckBuilder = new YGODeckToImage({
      name: deckId.replace("deck_", ""),
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });

    await deckBuilder.toImage({ fileName: `${fileName}.png`, download: true });
  };

  const handleEdit = () => {
    if (!deck) return;

    // First check if deck has a proper id
    if (deck.id) {
      // Use the deck's id directly as the edit parameter
      navigate(`/deckbuilder?edit=${deck.id}`);
      return;
    }

    // If deck has no id, try to get the actual deck id from the URL parameter
    if (deckId) {
      // If deckId is the full storage key (starts with deck_), use it directly
      if (deckId.startsWith("deck_")) {
        navigate(`/deckbuilder?edit=${deckId}`);
      } else {
        // Otherwise add the deck_ prefix
        navigate(`/deckbuilder?edit=deck_${deckId}`);
      }
    }
  };

  const handleDuel = () => {
    navigate(`/duel?deck=deck_${deckId}`);
  };

  const goBack = () => {
    navigate("/my/decks");
  };

  const getCardCountString = () => {
    if (!deck) return "";

    const mainCount = deck.mainDeck?.length || 0;
    const extraCount = deck.extraDeck?.length || 0;
    const sideCount = deck.sideDeck?.length || 0;

    return `${mainCount} Main | ${extraCount} Extra${
      sideCount > 0 ? ` | ${sideCount} Side` : ""
    }`;
  };

  if (!deck || !deckId) {
    return (
      <AppLayout>
        <PageContainer>
          <Card elevation="medium">
            <Card.Content>
              <EmptyState>
                <p>Deck not found</p>
                <Button variant="primary" onClick={goBack}>
                  Back to My Decks
                </Button>
              </EmptyState>
            </Card.Content>
          </Card>
        </PageContainer>
      </AppLayout>
    );
  }

  // Group cards by type for organized display
  const cardsByType = {
    monsters: deck.mainDeck.filter((card: any) =>
      card.type.includes("Monster")
    ),
    spells: deck.mainDeck.filter((card: any) => card.type.includes("Spell")),
    traps: deck.mainDeck.filter((card: any) => card.type.includes("Trap")),
    extra: deck.extraDeck || [],
    side: deck.sideDeck || [],
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <BackButton onClick={goBack}>
            <ArrowLeft size={16} />
            <span>Back to My Decks</span>
          </BackButton>
          <h1>{deck.name}</h1>
        </PageHeader>

        <Card elevation="medium" margin="0 0 24px 0">
          <Card.Content>
            <DeckMetaInfo>
              <DeckStats>
                <span className="deck-count">{getCardCountString()}</span>
                {deck.createdAt && (
                  <span className="deck-created">
                    Created: {new Date(deck.createdAt).toLocaleDateString()}
                  </span>
                )}
              </DeckStats>
              <ButtonContainer>
                <Button variant="primary" onClick={handleDuel}>
                  Duel
                </Button>
                <Button variant="secondary" onClick={handleEdit}>
                  Edit Deck
                </Button>
                <Button variant="tertiary" onClick={downloadDeckAsYdk}>
                  Download YDK
                </Button>
                <Button variant="tertiary" onClick={downloadDeckAsPng}>
                  Download PNG
                </Button>
              </ButtonContainer>
            </DeckMetaInfo>
          </Card.Content>
        </Card>

        {loading ? (
          <LoadingCard>
            <Card.Content>
              <LoadingText>Loading deck details...</LoadingText>
            </Card.Content>
          </LoadingCard>
        ) : (
          <>
            {/* Main Deck Section */}
            <DeckSectionCard elevation="low" margin="0 0 24px 0">
              <Card.Content>
                <SectionTitle>Main Deck ({deck.mainDeck.length})</SectionTitle>

                {/* Monsters Section */}
                {cardsByType.monsters.length > 0 && (
                  <CardTypeSection>
                    <SectionSubtitle>
                      Monsters ({cardsByType.monsters.length})
                    </SectionSubtitle>
                    <YGOCardGrid gap="10px">
                      {cardsByType.monsters.map((card: any, index: number) => (
                        <CardContainer key={`monster-${card.id}-${index}`}>
                          <CardImage
                            src={
                              card.card_images?.[0]?.image_url_small ||
                              `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                            }
                            alt={card.name}
                            title={card.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                "https://images.ygoprodeck.com/images/cards_small/back_high.jpg";
                            }}
                          />
                          <CardCountBadge>
                            {
                              deck.mainDeck.filter((c: any) => c.id === card.id)
                                .length
                            }
                            x
                          </CardCountBadge>
                        </CardContainer>
                      ))}
                    </YGOCardGrid>
                  </CardTypeSection>
                )}

                {/* Spells Section */}
                {cardsByType.spells.length > 0 && (
                  <CardTypeSection>
                    <SectionSubtitle>
                      Spells ({cardsByType.spells.length})
                    </SectionSubtitle>
                    <YGOCardGrid gap="10px">
                      {cardsByType.spells.map((card: any, index: number) => (
                        <CardContainer key={`spell-${card.id}-${index}`}>
                          <CardImage
                            src={
                              card.card_images?.[0]?.image_url_small ||
                              `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                            }
                            alt={card.name}
                            title={card.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                "https://images.ygoprodeck.com/images/cards_small/back_high.jpg";
                            }}
                          />
                          <CardCountBadge>
                            {
                              deck.mainDeck.filter((c: any) => c.id === card.id)
                                .length
                            }
                            x
                          </CardCountBadge>
                        </CardContainer>
                      ))}
                    </YGOCardGrid>
                  </CardTypeSection>
                )}

                {/* Traps Section */}
                {cardsByType.traps.length > 0 && (
                  <CardTypeSection>
                    <SectionSubtitle>
                      Traps ({cardsByType.traps.length})
                    </SectionSubtitle>
                    <YGOCardGrid gap="10px">
                      {cardsByType.traps.map((card: any, index: number) => (
                        <CardContainer key={`trap-${card.id}-${index}`}>
                          <CardImage
                            src={
                              card.card_images?.[0]?.image_url_small ||
                              `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                            }
                            alt={card.name}
                            title={card.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                "https://images.ygoprodeck.com/images/cards_small/back_high.jpg";
                            }}
                          />
                          <CardCountBadge>
                            {
                              deck.mainDeck.filter((c: any) => c.id === card.id)
                                .length
                            }
                            x
                          </CardCountBadge>
                        </CardContainer>
                      ))}
                    </YGOCardGrid>
                  </CardTypeSection>
                )}
              </Card.Content>
            </DeckSectionCard>

            {/* Extra Deck Section */}
            {cardsByType.extra.length > 0 && (
              <DeckSectionCard elevation="low" margin="0 0 24px 0">
                <Card.Content>
                  <SectionTitle className="extra-deck-title">
                    Extra Deck ({cardsByType.extra.length})
                  </SectionTitle>
                  <YGOCardGrid gap="10px">
                    {cardsByType.extra.map((card: any, index: number) => (
                      <CardContainer key={`extra-${card.id}-${index}`}>
                        <CardImage
                          className="extra-card"
                          src={
                            card.card_images?.[0]?.image_url_small ||
                            `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                          }
                          alt={card.name}
                          title={card.name}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://images.ygoprodeck.com/images/cards_small/back_high.jpg";
                          }}
                        />
                        <CardCountBadge>
                          {
                            deck.extraDeck.filter((c: any) => c.id === card.id)
                              .length
                          }
                          x
                        </CardCountBadge>
                      </CardContainer>
                    ))}
                  </YGOCardGrid>
                </Card.Content>
              </DeckSectionCard>
            )}

            {/* Side Deck Section */}
            {cardsByType.side.length > 0 && (
              <DeckSectionCard elevation="low">
                <Card.Content>
                  <SectionTitle className="side-deck-title">
                    Side Deck ({cardsByType.side.length})
                  </SectionTitle>
                  <YGOCardGrid gap="10px">
                    {cardsByType.side.map((card: any, index: number) => (
                      <CardContainer key={`side-${card.id}-${index}`}>
                        <CardImage
                          className="side-card"
                          src={
                            card.card_images?.[0]?.image_url_small ||
                            `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                          }
                          alt={card.name}
                          title={card.name}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://images.ygoprodeck.com/images/cards_small/back_high.jpg";
                          }}
                        />
                        <CardCountBadge>
                          {
                            deck.sideDeck.filter((c: any) => c.id === card.id)
                              .length
                          }
                          x
                        </CardCountBadge>
                      </CardContainer>
                    ))}
                  </YGOCardGrid>
                </Card.Content>
              </DeckSectionCard>
            )}
          </>
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

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  position: relative;

  h1 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["2xl"]};
    text-align: center;
    width: 100%;
  }
`;

const BackButton = styled.button`
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.primary.main};
  background: none;
  border: none;
  cursor: pointer;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.size.md};
  transition: color ${theme.transitions.default};

  &:hover {
    color: ${theme.colors.primary.dark};
  }
`;

const DeckMetaInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${theme.spacing.md};
  }
`;

const DeckStats = styled.div`
  display: flex;
  flex-direction: column;

  .deck-count {
    font-size: ${theme.typography.size.lg};
    color: ${theme.colors.text.primary};
    margin-bottom: ${theme.spacing.xs};
  }

  .deck-created {
    font-size: ${theme.typography.size.sm};
    color: ${theme.colors.text.secondary};
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const DeckSectionCard = styled(Card)`
  margin-bottom: ${theme.spacing.lg};
  overflow: visible;
`;

const SectionTitle = styled.h2`
  margin: 0 0 ${theme.spacing.md} 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.xl};
  font-weight: ${theme.typography.weight.semibold};
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 2px solid ${theme.colors.border.default};

  &.extra-deck-title {
    color: ${theme.colors.primary.dark};
  }

  &.side-deck-title {
    color: ${theme.colors.secondary.main};
  }
`;

const CardTypeSection = styled.div`
  margin-bottom: ${theme.spacing.lg};

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionSubtitle = styled.h3`
  margin: 0 0 ${theme.spacing.md} 0;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.medium};
`;

const CardContainer = styled.div`
  position: relative;
  border-radius: ${theme.borderRadius.sm};
  transition: transform ${theme.transitions.default};

  &:hover {
    transform: translateY(-5px);
    z-index: 1;
  }
`;

const CardImage = styled.img`
  width: 100%;
  border-radius: ${theme.borderRadius.sm};
  box-shadow: ${theme.shadows.sm};
  display: block;

  &.extra-card {
    border: 2px solid ${theme.colors.primary.main};
  }

  &.side-card {
    border: 2px solid ${theme.colors.secondary.main};
  }
`;

const CardCountBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.xs};
  right: ${theme.spacing.xs};
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: ${theme.typography.size.xs};
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: ${theme.typography.weight.semibold};
`;

const LoadingCard = styled(Card)`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const LoadingText = styled.div`
  font-size: ${theme.typography.size.lg};
  color: ${theme.colors.text.secondary};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xl} 0;
  text-align: center;

  p {
    font-size: ${theme.typography.size.lg};
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing.md};
  }
`;

export default DeckDetailPage;
