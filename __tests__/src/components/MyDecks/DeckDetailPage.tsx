import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styled from "styled-components";
import { YGODeckToImage } from "ygo-core-images-utils";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card, Tabs, Tab } from "../UI";
import { YGOCardGrid } from "../UI/YGOCard";
import {
  ArrowLeft,
  Share2,
  Edit,
  Download,
  Edit3,
  Zap,
  Clock,
  Users,
  Image,
} from "lucide-react";
import CoverCardModal from "../MyDecks/CoverCardModal";
import CardModal from "../DeckBuilder/components/CardModal/CardModal";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../utils/cardImages";

const DeckDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deckId } = useParams();
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>("");
  const [activeTab, setActiveTab] = useState("main");
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [coverCardId, setCoverCardId] = useState<number | undefined>(undefined);
  const [coverCardDetails, setCoverCardDetails] = useState<any>(null);

  // Add state for card preview modal
  const [previewCard, setPreviewCard] = useState<any>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const handleCardClick = (card: any) => {
    setPreviewCard(card);
    setIsCardModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCardModalOpen(false);
  };

  useEffect(() => {
    // Load the deck data
    if (deckId) {
      setLoading(true);
      try {
        // First try direct access with the key
        const storedDeck = localStorage.getItem(`deck_${deckId}`);

        if (storedDeck) {
          const parsedDeck = JSON.parse(storedDeck);
          setDeck(parsedDeck);
          setCoverCardId(parsedDeck.coverCardId);
          setFileName(deckId.replace(/\s+/g, "_").toLowerCase());
        } else {
          // If not found, search through all localStorage keys to find a deck with matching ID
          const found = findDeckById(deckId);
          if (found) {
            setDeck(found.deck);
            setCoverCardId(found.deck.coverCardId);
            setFileName(found.name.replace(/\s+/g, "_").toLowerCase());
          }
        }
      } catch (error) {
        console.error("Error loading deck:", error);
      }
      setLoading(false);
    }
  }, [deckId]);

  // Update cover card details whenever coverCardId changes
  useEffect(() => {
    if (!deck || !coverCardId) {
      setCoverCardDetails(null);
      return;
    }

    // Find the card in the deck with the matching ID
    const coverCard = [
      ...deck.mainDeck,
      ...(deck.extraDeck || []),
      ...(deck.sideDeck || []),
    ].find((card) => card.id === coverCardId);

    setCoverCardDetails(coverCard || null);
  }, [coverCardId, deck]);

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

  const handleSelectCoverCard = (cardId: number) => {
    if (!deck || !deckId) return;

    setCoverCardId(cardId);

    // Update the deck in localStorage with the new cover card
    const updatedDeck = { ...deck, coverCardId: cardId };
    localStorage.setItem(`deck_${deckId}`, JSON.stringify(updatedDeck));
    setDeck(updatedDeck);

    // Update cover card details
    const coverCard = [
      ...deck.mainDeck,
      ...(deck.extraDeck || []),
      ...(deck.sideDeck || []),
    ].find((card) => card.id === cardId);

    setCoverCardDetails(coverCard || null);
  };

  const getCoverCardImage = () => {
    if (!deck || !coverCardId) {
      // Return the first monster card as default if no cover card is set
      const firstMonster = deck?.mainDeck?.find((card: any) =>
        card.type?.includes("Monster")
      );

      // If we're using a default monster as cover card, update the coverCardDetails
      if (firstMonster && !coverCardDetails) {
        setCoverCardDetails(firstMonster);
      }

      return firstMonster
        ? getCardImageUrl(firstMonster.id)
        : getCardImageUrl(); // Default card back image
    }

    return getCardImageUrl(coverCardId);
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

        <DeckHeaderCard elevation="medium" margin="0 0 24px 0">
          <Card.Content>
            <DeckHeaderLayout>
              <CoverCardWrapper>
                <CoverCardImage
                  src={getCoverCardImage()}
                  alt="Cover Card"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getCardImageUrl(); // Default card back image
                  }}
                />
              </CoverCardWrapper>

              <DeckInfoSection>
                <DeckMetaInfo>
                  <DeckStats>
                    <span className="deck-count">{getCardCountString()}</span>
                    {deck.createdAt && (
                      <span className="deck-created">
                        Created: {new Date(deck.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </DeckStats>
                  <DeckTags>
                    {deck.archetype && <DeckTag>{deck.archetype}</DeckTag>}
                    {deck.type && <DeckTag>{deck.type}</DeckTag>}
                  </DeckTags>
                </DeckMetaInfo>

                <CardDetailsSection>
                  <CardDetailHeader>
                    <CardDetailTitle>Cover Card</CardDetailTitle>
                    <ChangeCoverButton
                      onClick={() => setIsCoverModalOpen(true)}
                    >
                      <Image size={14} /> Change
                    </ChangeCoverButton>
                  </CardDetailHeader>

                  {coverCardId && coverCardDetails ? (
                    <CardDetails>
                      <CardName>{coverCardDetails.name}</CardName>
                      <CardType>
                        {coverCardDetails.type}
                        {coverCardDetails.attribute && (
                          <span> • {coverCardDetails.attribute}</span>
                        )}
                        {coverCardDetails.race && (
                          <span> • {coverCardDetails.race}</span>
                        )}
                      </CardType>

                      {(coverCardDetails.level ||
                        coverCardDetails.level === 0) && (
                        <CardStat>Level: {coverCardDetails.level}</CardStat>
                      )}

                      {(coverCardDetails.atk !== undefined ||
                        coverCardDetails.def !== undefined) && (
                        <CardStats>
                          {coverCardDetails.atk !== undefined && (
                            <span>ATK: {coverCardDetails.atk}</span>
                          )}
                          {coverCardDetails.def !== undefined && (
                            <span>DEF: {coverCardDetails.def}</span>
                          )}
                        </CardStats>
                      )}

                      {coverCardDetails.desc && (
                        <CardDescription>
                          {coverCardDetails.desc}
                        </CardDescription>
                      )}
                    </CardDetails>
                  ) : (
                    <NoCardSelected>No cover card selected</NoCardSelected>
                  )}
                </CardDetailsSection>

                <ButtonContainer>
                  <ActionButton variant="primary" onClick={handleDuel}>
                    <Zap size={16} /> Duel
                  </ActionButton>
                  <ActionButton variant="secondary" onClick={handleEdit}>
                    <Edit3 size={16} /> Edit
                  </ActionButton>
                  <ActionButton variant="tertiary" onClick={downloadDeckAsYdk}>
                    <Download size={16} /> YDK
                  </ActionButton>
                  <ActionButton variant="tertiary" onClick={downloadDeckAsPng}>
                    <Image size={16} /> PNG
                  </ActionButton>
                  <ActionButton variant="ghost" onClick={() => {}}>
                    <Share2 size={16} /> Share
                  </ActionButton>
                </ButtonContainer>
              </DeckInfoSection>
            </DeckHeaderLayout>
          </Card.Content>
        </DeckHeaderCard>

        {loading ? (
          <LoadingCard>
            <Card.Content>
              <LoadingIndicator>
                <div className="spinner"></div>
                <LoadingText>Loading deck details...</LoadingText>
              </LoadingIndicator>
            </Card.Content>
          </LoadingCard>
        ) : (
          <DeckContentCard elevation="low">
            <Card.Content>
              <StyledTabs
                value={activeTab}
                onChange={(value) => setActiveTab(value)}
              >
                <Tab
                  value="main"
                  label={`Main Deck (${deck.mainDeck.length})`}
                />
                {cardsByType.extra.length > 0 && (
                  <Tab
                    value="extra"
                    label={`Extra Deck (${cardsByType.extra.length})`}
                  />
                )}
                <Tab
                  value="side"
                  label={`Side Deck (${cardsByType.side.length})`}
                />
              </StyledTabs>

              <TabContent>
                {/* Main Deck Section */}
                {activeTab === "main" && (
                  <TabSection>
                    {/* Monsters Section */}
                    {cardsByType.monsters.length > 0 && (
                      <CardTypeSection>
                        <SectionSubtitle>
                          Monsters ({cardsByType.monsters.length})
                        </SectionSubtitle>
                        <YGOCardGrid gap="10px">
                          {cardsByType.monsters.map(
                            (card: any, index: number) => (
                              <CardContainer
                                key={`monster-${card.id}-${index}`}
                              >
                                <CardImage
                                  src={
                                    card.card_images?.[0]?.image_url_small ||
                                    getCardImageUrl(card.id, "small")
                                  }
                                  alt={card.name}
                                  title={card.name}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = CARD_BACK_IMAGE;
                                  }}
                                  onClick={() => handleCardClick(card)}
                                />
                                <CardCountBadge>
                                  {
                                    deck.mainDeck.filter(
                                      (c: any) => c.id === card.id
                                    ).length
                                  }
                                  x
                                </CardCountBadge>
                              </CardContainer>
                            )
                          )}
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
                          {cardsByType.spells.map(
                            (card: any, index: number) => (
                              <CardContainer key={`spell-${card.id}-${index}`}>
                                <CardImage
                                  src={
                                    card.card_images?.[0]?.image_url_small ||
                                    getCardImageUrl(card.id, "small")
                                  }
                                  alt={card.name}
                                  title={card.name}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = CARD_BACK_IMAGE;
                                  }}
                                  onClick={() => handleCardClick(card)}
                                />
                                <CardCountBadge>
                                  {
                                    deck.mainDeck.filter(
                                      (c: any) => c.id === card.id
                                    ).length
                                  }
                                  x
                                </CardCountBadge>
                              </CardContainer>
                            )
                          )}
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
                                  getCardImageUrl(card.id, "small")
                                }
                                alt={card.name}
                                title={card.name}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = CARD_BACK_IMAGE;
                                }}
                                onClick={() => handleCardClick(card)}
                              />
                              <CardCountBadge>
                                {
                                  deck.mainDeck.filter(
                                    (c: any) => c.id === card.id
                                  ).length
                                }
                                x
                              </CardCountBadge>
                            </CardContainer>
                          ))}
                        </YGOCardGrid>
                      </CardTypeSection>
                    )}
                  </TabSection>
                )}

                {/* Extra Deck Section */}
                {activeTab === "extra" && cardsByType.extra.length > 0 && (
                  <TabSection>
                    <SectionSubtitle>
                      Extra Deck Cards ({cardsByType.extra.length})
                    </SectionSubtitle>
                    <YGOCardGrid gap="10px">
                      {cardsByType.extra.map((card: any, index: number) => (
                        <CardContainer key={`extra-${card.id}-${index}`}>
                          <CardImage
                            className="extra-card"
                            src={
                              card.card_images?.[0]?.image_url_small ||
                              getCardImageUrl(card.id, "small")
                            }
                            alt={card.name}
                            title={card.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = CARD_BACK_IMAGE;
                            }}
                            onClick={() => handleCardClick(card)}
                          />
                          <CardCountBadge>
                            {
                              deck.extraDeck.filter(
                                (c: any) => c.id === card.id
                              ).length
                            }
                            x
                          </CardCountBadge>
                        </CardContainer>
                      ))}
                    </YGOCardGrid>
                  </TabSection>
                )}

                {/* Side Deck Section */}
                {activeTab === "side" && (
                  <TabSection>
                    {cardsByType.side.length > 0 ? (
                      <>
                        <SectionSubtitle>
                          Side Deck Cards ({cardsByType.side.length})
                        </SectionSubtitle>
                        <YGOCardGrid gap="10px">
                          {cardsByType.side.map((card: any, index: number) => (
                            <CardContainer key={`side-${card.id}-${index}`}>
                              <CardImage
                                className="side-card"
                                src={
                                  card.card_images?.[0]?.image_url_small ||
                                  getCardImageUrl(card.id, "small")
                                }
                                alt={card.name}
                                title={card.name}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = CARD_BACK_IMAGE;
                                }}
                                onClick={() => handleCardClick(card)}
                              />
                              <CardCountBadge>
                                {
                                  deck.sideDeck.filter(
                                    (c: any) => c.id === card.id
                                  ).length
                                }
                                x
                              </CardCountBadge>
                            </CardContainer>
                          ))}
                        </YGOCardGrid>
                      </>
                    ) : (
                      <EmptySideDeck>
                        <p>This deck doesn't have any side deck cards.</p>
                        <EditSideButton
                          variant="secondary"
                          onClick={handleEdit}
                        >
                          <Edit3 size={16} /> Edit Side Deck
                        </EditSideButton>
                      </EmptySideDeck>
                    )}
                  </TabSection>
                )}
              </TabContent>
            </Card.Content>
          </DeckContentCard>
        )}
      </PageContainer>

      {/* Cover Card Modal */}
      <CoverCardModal
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        deck={deck}
        onSelectCoverCard={handleSelectCoverCard}
        currentCoverId={coverCardId}
      />

      {/* Card Preview Modal */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={handleCloseModal}
        card={previewCard}
      />
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

const DeckHeaderCard = styled(Card)`
  margin-bottom: ${theme.spacing.lg};
`;

const DeckHeaderLayout = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: ${theme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CoverCardWrapper = styled.div`
  width: 100%;
  max-width: 250px;
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  box-shadow: ${theme.shadows.md};
`;

const CoverCardImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
  border-radius: ${theme.borderRadius.md};
  transition: transform ${theme.transitions.default};

  &:hover {
    transform: scale(1.02);
  }
`;

const DeckInfoSection = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  gap: ${theme.spacing.lg};
`;

const DeckMetaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${theme.spacing.md};
  }
`;

const DeckTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const DeckTag = styled.span`
  background-color: ${theme.colors.background.light};
  color: ${theme.colors.text.secondary};
  border-radius: ${theme.borderRadius.full};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.size.sm};
  border: 1px solid ${theme.colors.border.light};
`;

const DeckStats = styled.div`
  display: flex;
  flex-direction: column;

  .deck-count {
    font-size: ${theme.typography.size.lg};
    color: ${theme.colors.text.primary};
    margin-bottom: ${theme.spacing.xs};
    font-weight: ${theme.typography.weight.semibold};
  }

  .deck-created {
    font-size: ${theme.typography.size.sm};
    color: ${theme.colors.text.secondary};
  }
`;

const CardDetailsSection = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.light};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.md};
  box-shadow: ${theme.shadows.xs};
`;

const CardDetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xs};
  padding-bottom: ${theme.spacing.xs};
  border-bottom: 1px solid ${theme.colors.border.light};
`;

const CardDetailTitle = styled.div`
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
`;

const CardDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} 0;
`;

const CardName = styled.div`
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.lg};
`;

const CardType = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xs};
`;

const CardStat = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.primary};
  background-color: ${theme.colors.background.light};
  padding: ${theme.spacing.xxs} ${theme.spacing.xs};
  border-radius: ${theme.borderRadius.sm};
  display: inline-block;
  margin-right: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.xs};
  border: 1px solid ${theme.colors.border.light};
`;

const CardStats = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.xs};

  span {
    background-color: ${theme.colors.background.light};
    color: ${theme.colors.text.primary};
    padding: ${theme.spacing.xxs} ${theme.spacing.xs};
    border-radius: ${theme.borderRadius.sm};
    font-weight: ${theme.typography.weight.medium};
    border: 1px solid ${theme.colors.border.light};
  }
`;

const CardDescription = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.primary};
  line-height: 1.4;
  border-top: 1px solid ${theme.colors.border.light};
  padding-top: ${theme.spacing.xs};
  margin-top: ${theme.spacing.xs};
  max-height: 120px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${theme.colors.background.light};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.primary.light};
    border-radius: 4px;
  }
`;

const NoCardSelected = styled.div`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
  text-align: center;
  padding: ${theme.spacing.md} 0;
  font-style: italic;
`;

const ChangeCoverButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: ${theme.spacing.xs};
  background: none;
  color: ${theme.colors.primary.main};
  border: none;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.size.sm};
  cursor: pointer;
  transition: color ${theme.transitions.default}, background ${theme.transitions.default};
  border-radius: ${theme.borderRadius.sm};
  margin-left: auto;
  
  &:hover {
    color: ${theme.colors.primary.dark};
    background-color: ${theme.colors.background.card};
    text-decoration: none;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: flex-start;
  }
`;

const ActionButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  svg {
    margin-right: 2px;
  }
`;

const DeckContentCard = styled(Card)`
  margin-bottom: ${theme.spacing.lg};
`;

const StyledTabs = styled(Tabs)`
  margin-bottom: ${theme.spacing.md};
`;

const TabContent = styled.div`
  padding-top: ${theme.spacing.md};
`;

const TabSection = styled.div`
  animation: fadeIn 0.3s ease-in-out;

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
  transition: transform ${theme.transitions.default},
    box-shadow ${theme.transitions.default};

  &:hover {
    transform: translateY(-5px);
    box-shadow: ${theme.shadows.md};
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

const LoadingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top: 4px solid ${theme.colors.primary.main};
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
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

const EmptySideDeck = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xl} 0;
  text-align: center;

  p {
    font-size: ${theme.typography.size.md};
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing.md};
  }
`;

const EditSideButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

export default DeckDetailPage;
