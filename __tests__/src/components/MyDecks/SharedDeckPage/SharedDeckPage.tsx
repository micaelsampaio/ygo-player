import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import theme from "../../../styles/theme";
import AppLayout from "../../Layout/AppLayout";
import { Button, Card, Tabs, Tab } from "../../UI";
import { YGOCardGrid } from "../../UI/YGOCard";
import { ArrowLeft, Download, Import } from "lucide-react";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../../utils/cardImages";
import { YGODeckToImage } from "ygo-core-images-utils";

interface Card {
  id: number;
  name?: string;
  type?: string;
  attribute?: string;
  race?: string;
  level?: number;
  atk?: number;
  def?: number;
  desc?: string;
  [key: string]: any;
}

interface SharedDeckData {
  name: string;
  mainDeck: Card[];
  extraDeck: Card[];
  sideDeck: Card[];
  notes?: string;
  coverCardId?: number;
}

const SharedDeckPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deckName } = useParams<{ deckName: string }>();
  const [deck, setDeck] = useState<SharedDeckData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState("main");
  const [importStatus, setImportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [importMessage, setImportMessage] = useState<string>("");
  const [decodingError, setDecodingError] = useState<string>("");

  useEffect(() => {
    // Get the YDKE URL from query parameters
    const searchParams = new URLSearchParams(location.search);
    const ydkeData = searchParams.get("data");

    if (ydkeData) {
      parseYdkeUrl(ydkeData);
    } else {
      setLoading(false);
      setDecodingError("No deck data found in the URL");
    }
  }, [location]);

  // Parse YDKE URL format
  const parseYdkeUrl = async (ydkeData: string) => {
    try {
      setLoading(true);
      console.log("Parsing YDKE URL:", ydkeData);

      // Get additional parameters from the URL
      const searchParams = new URLSearchParams(location.search);
      const notes = searchParams.get("notes");
      const coverCardId = searchParams.get("cover");

      // YDKE format: ydke://[main]![extra]![side]!
      let ydkeUrl = ydkeData;
      if (!ydkeUrl.startsWith("ydke://")) {
        ydkeUrl = decodeURIComponent(ydkeUrl);
      }

      // Remove the ydke:// prefix if present
      if (ydkeUrl.startsWith("ydke://")) {
        ydkeUrl = ydkeUrl.substring(7);
      }

      console.log("Processing URL:", ydkeUrl);

      // Split the URL into main, extra, and side deck parts
      const parts = ydkeUrl.split("!");
      const mainData = parts[0] || "";
      const extraData = parts.length > 1 ? parts[1] : "";
      const sideData = parts.length > 2 ? parts[2] : "";

      console.log("Deck parts:", { mainData, extraData, sideData });

      // Parse card IDs from each section
      const mainDeckIds = decodeYdkeData(mainData);
      const extraDeckIds = decodeYdkeData(extraData);
      const sideDeckIds = decodeYdkeData(sideData);

      console.log("Decoded IDs:", {
        main: mainDeckIds.length,
        extra: extraDeckIds.length,
        side: sideDeckIds.length,
      });

      // Convert card IDs to card objects
      const mainDeck = await getCardsFromIds(mainDeckIds);
      const extraDeck = await getCardsFromIds(extraDeckIds);
      const sideDeck = await getCardsFromIds(sideDeckIds);

      console.log("Decoded cards:", {
        main: mainDeck.length,
        extra: extraDeck.length,
        side: sideDeck.length,
      });

      const decodedDeck: SharedDeckData = {
        name: deckName ? decodeURIComponent(deckName) : "Shared Deck",
        mainDeck,
        extraDeck,
        sideDeck,
      };

      // Add notes if present - using decodeURIComponent properly
      if (notes) {
        try {
          // Double decoding to handle potential multiple encoding
          let decodedNotes = decodeURIComponent(notes);
          // Try a second decode if it still looks encoded
          if (decodedNotes.includes("%")) {
            try {
              decodedNotes = decodeURIComponent(decodedNotes);
            } catch (e) {
              // If second decode fails, keep the first decode result
              console.log("Second notes decode failed, using first result");
            }
          }
          decodedDeck.notes = decodedNotes;
          console.log(
            "Decoded notes successfully:",
            decodedDeck.notes?.substring(0, 50) + "..."
          );
        } catch (e) {
          console.error("Error decoding notes:", e);
        }
      }

      // Add cover card ID if present
      if (coverCardId) {
        try {
          const coverIdNum = parseInt(coverCardId, 10);
          if (!isNaN(coverIdNum)) {
            decodedDeck.coverCardId = coverIdNum;
          }
        } catch (e) {
          console.error("Error parsing cover card ID:", e);
        }
      }

      setDeck(decodedDeck);
    } catch (error) {
      console.error("Error parsing YDKE URL:", error);
      setDecodingError(
        error instanceof Error ? error.message : "Failed to parse deck data"
      );
    } finally {
      setLoading(false);
    }
  };

  // Decode YDKE base64 data to array of card IDs
  const decodeYdkeData = (data: string): number[] => {
    if (!data) return [];

    try {
      // Decode base64 to binary
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Each card ID is 4 bytes (32 bits)
      const cardIds = [];
      const view = new DataView(bytes.buffer);

      for (let i = 0; i < bytes.length; i += 4) {
        if (i + 4 <= bytes.length) {
          // Little-endian integer
          const cardId = view.getUint32(i, true);
          cardIds.push(cardId);
        }
      }

      return cardIds;
    } catch (error) {
      console.error("Error decoding YDKE data:", error);
      return [];
    }
  };

  // Get card data from card IDs
  const getCardsFromIds = async (ids: number[]): Promise<Card[]> => {
    if (ids.length === 0) return [];

    const uniqueIds = [...new Set(ids)]; // Remove duplicates for fetching
    const cards: Card[] = [];
    let cardDataMap: Record<number, Card> = {};

    // Try to load card data from cache or fetch it
    try {
      let cardData = localStorage.getItem("card_data");

      if (!cardData) {
        // Try to use the global cards data if available
        const globalData = localStorage.getItem("data/cards.json");
        if (globalData) {
          cardData = globalData;
        } else {
          // If no card data is available, try to fetch it
          try {
            const response = await fetch("/data/cards.json");
            if (response.ok) {
              cardData = await response.text();
              localStorage.setItem("card_data", cardData);
            }
          } catch (err) {
            console.error("Failed to fetch card data:", err);
          }
        }
      }

      if (cardData) {
        const parsedData = JSON.parse(cardData);
        if (Array.isArray(parsedData)) {
          cardDataMap = parsedData.reduce(
            (acc: Record<number, Card>, card: Card) => {
              acc[card.id] = card;
              return acc;
            },
            {}
          );
        }
      }
    } catch (error) {
      console.error("Error loading card data:", error);
    }

    // For each unique ID, get the card data and add it to the deck the correct number of times
    for (let id of ids) {
      const card = cardDataMap[id] || {
        id,
        name: `Card #${id}`,
        type: "Unknown",
        desc: "Card data not available",
      };

      cards.push({ ...card });
    }

    return cards;
  };

  // Get the cover card details
  const getCoverCardDetails = (): Card | null => {
    if (!deck || !deck.coverCardId) return null;

    // Find the card in the deck with the matching ID
    const coverCard = [
      ...deck.mainDeck,
      ...(deck.extraDeck || []),
      ...(deck.sideDeck || []),
    ].find((card) => card.id === deck.coverCardId);

    return coverCard || null;
  };

  // Get cover card image, or default to first monster
  const getCoverCardImage = () => {
    const coverCardDetails = getCoverCardDetails();

    if (!deck || !coverCardDetails) {
      // Return the first monster card as default if no cover card is set
      const firstMonster = deck?.mainDeck?.find((card: Card) =>
        card.type?.toLowerCase().includes("monster")
      );

      return firstMonster
        ? getCardImageUrl(firstMonster.id)
        : getCardImageUrl(); // Default card back image
    }

    return getCardImageUrl(coverCardDetails.id);
  };

  const handleImportDeck = () => {
    if (!deck) return;

    try {
      // Generate a unique ID for the imported deck
      const importId = `deck_imported_${Date.now()}`;

      const importedDeck = {
        ...deck,
        id: importId,
        importedAt: new Date().toISOString(),
        importedFrom: "shared_link",
      };

      // Save the deck to localStorage
      localStorage.setItem(importId, JSON.stringify(importedDeck));

      setImportStatus("success");
      setImportMessage(
        `Deck "${deck.name}" successfully imported to your collection!`
      );

      // Reset import status after 3 seconds
      setTimeout(() => {
        setImportStatus("idle");
        // Navigate to the imported deck
        navigate(`/my/decks/${importId}`);
      }, 3000);
    } catch (error) {
      console.error("Error importing deck:", error);
      setImportStatus("error");
      setImportMessage("Failed to import deck. Please try again.");

      setTimeout(() => {
        setImportStatus("idle");
      }, 3000);
    }
  };

  const downloadDeckAsYdk = () => {
    if (!deck) return;

    const fileName = deck.name + ".ydk";

    const deckBuilder = new YGODeckToImage({
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });
    deckBuilder.downloadYdk({ fileName });
  };

  const goBack = () => {
    navigate(-1);
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

  if (loading) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingCard elevation="medium">
            <Card.Content>
              <LoadingIndicator>
                <div className="spinner"></div>
                <LoadingText>Loading shared deck...</LoadingText>
              </LoadingIndicator>
            </Card.Content>
          </LoadingCard>
        </PageContainer>
      </AppLayout>
    );
  }

  if (!deck || decodingError) {
    return (
      <AppLayout>
        <PageContainer>
          <Card elevation="medium">
            <Card.Content>
              <EmptyState>
                <p>
                  Error loading shared deck.{" "}
                  {decodingError || "The link may be invalid or expired."}
                </p>
                <Button variant="primary" onClick={goBack}>
                  Go Back
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
    monsters: deck.mainDeck.filter((card: Card) =>
      card.type?.toLowerCase().includes("monster")
    ),
    spells: deck.mainDeck.filter((card: Card) =>
      card.type?.toLowerCase().includes("spell")
    ),
    traps: deck.mainDeck.filter((card: Card) =>
      card.type?.toLowerCase().includes("trap")
    ),
    unknown: deck.mainDeck.filter(
      (card: Card) =>
        !card.type ||
        (!card.type.toLowerCase().includes("monster") &&
          !card.type.toLowerCase().includes("spell") &&
          !card.type.toLowerCase().includes("trap"))
    ),
    extra: deck.extraDeck || [],
    side: deck.sideDeck || [],
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <BackButton onClick={goBack}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </BackButton>
          <h1>Shared Deck: {deck.name}</h1>
        </PageHeader>

        {importStatus !== "idle" && (
          <ImportNotification $status={importStatus}>
            {importMessage}
          </ImportNotification>
        )}

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
                    <span className="deck-shared">Shared Deck</span>
                  </DeckStats>
                </DeckMetaInfo>

                <CardDetailsSection>
                  <CardDetailHeader>
                    <CardDetailTitle>Cover Card</CardDetailTitle>
                  </CardDetailHeader>

                  {deck.coverCardId && getCoverCardDetails() ? (
                    <CardDetails>
                      <CardName>{getCoverCardDetails()?.name}</CardName>
                      <CardType>
                        {getCoverCardDetails()?.type}
                        {getCoverCardDetails()?.attribute && (
                          <span> • {getCoverCardDetails()?.attribute}</span>
                        )}
                        {getCoverCardDetails()?.race && (
                          <span> • {getCoverCardDetails()?.race}</span>
                        )}
                      </CardType>

                      {(getCoverCardDetails()?.level ||
                        getCoverCardDetails()?.level === 0) && (
                        <CardStat>
                          Level: {getCoverCardDetails()?.level}
                        </CardStat>
                      )}

                      {(getCoverCardDetails()?.atk !== undefined ||
                        getCoverCardDetails()?.def !== undefined) && (
                        <CardStats>
                          {getCoverCardDetails()?.atk !== undefined && (
                            <span>ATK: {getCoverCardDetails()?.atk}</span>
                          )}
                          {getCoverCardDetails()?.def !== undefined && (
                            <span>DEF: {getCoverCardDetails()?.def}</span>
                          )}
                        </CardStats>
                      )}

                      {getCoverCardDetails()?.desc && (
                        <CardDescription>
                          {getCoverCardDetails()?.desc}
                        </CardDescription>
                      )}
                    </CardDetails>
                  ) : (
                    <NoCardSelected>No cover card selected</NoCardSelected>
                  )}
                </CardDetailsSection>

                <ButtonContainer>
                  <ActionButton variant="primary" onClick={handleImportDeck}>
                    <Import size={16} /> Import to My Decks
                  </ActionButton>
                  <ActionButton variant="tertiary" onClick={downloadDeckAsYdk}>
                    <Download size={16} /> Download as YDK
                  </ActionButton>
                </ButtonContainer>
              </DeckInfoSection>
            </DeckHeaderLayout>
          </Card.Content>
        </DeckHeaderCard>

        <DeckContentCard elevation="low">
          <Card.Content>
            <StyledTabs
              value={activeTab}
              onChange={(value) => setActiveTab(value)}
            >
              <Tab value="main" label={`Main Deck (${deck.mainDeck.length})`} />
              {cardsByType.extra.length > 0 && (
                <Tab
                  value="extra"
                  label={`Extra Deck (${cardsByType.extra.length})`}
                />
              )}
              {cardsByType.side.length > 0 && (
                <Tab
                  value="side"
                  label={`Side Deck (${cardsByType.side.length})`}
                />
              )}
              <Tab value="notes" label="Notes" />
            </StyledTabs>

            <TabContent>
              {/* Main Deck Section */}
              {activeTab === "main" && (
                <TabSection>
                  {deck.mainDeck.length === 0 ? (
                    <EmptyDeckMessage>No cards in main deck</EmptyDeckMessage>
                  ) : (
                    <>
                      {/* Monsters Section */}
                      {cardsByType.monsters.length > 0 && (
                        <CardTypeSection>
                          <SectionSubtitle>
                            Monsters ({cardsByType.monsters.length})
                          </SectionSubtitle>
                          <YGOCardGrid gap="10px">
                            {cardsByType.monsters.map(
                              (card: Card, index: number) => (
                                <CardContainer
                                  key={`monster-${card.id}-${index}`}
                                >
                                  <CardImage
                                    src={getCardImageUrl(card.id, "small")}
                                    alt={card.name || `Card #${card.id}`}
                                    title={card.name || `Card #${card.id}`}
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.src = CARD_BACK_IMAGE;
                                    }}
                                  />
                                  <CardCountBadge>
                                    {
                                      deck.mainDeck.filter(
                                        (c: Card) => c.id === card.id
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
                              (card: Card, index: number) => (
                                <CardContainer
                                  key={`spell-${card.id}-${index}`}
                                >
                                  <CardImage
                                    src={getCardImageUrl(card.id, "small")}
                                    alt={card.name || `Card #${card.id}`}
                                    title={card.name || `Card #${card.id}`}
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.src = CARD_BACK_IMAGE;
                                    }}
                                  />
                                  <CardCountBadge>
                                    {
                                      deck.mainDeck.filter(
                                        (c: Card) => c.id === card.id
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
                            {cardsByType.traps.map(
                              (card: Card, index: number) => (
                                <CardContainer key={`trap-${card.id}-${index}`}>
                                  <CardImage
                                    src={getCardImageUrl(card.id, "small")}
                                    alt={card.name || `Card #${card.id}`}
                                    title={card.name || `Card #${card.id}`}
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.src = CARD_BACK_IMAGE;
                                    }}
                                  />
                                  <CardCountBadge>
                                    {
                                      deck.mainDeck.filter(
                                        (c: Card) => c.id === card.id
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

                      {/* Unknown Card Types Section */}
                      {cardsByType.unknown.length > 0 && (
                        <CardTypeSection>
                          <SectionSubtitle>
                            Other Cards ({cardsByType.unknown.length})
                          </SectionSubtitle>
                          <YGOCardGrid gap="10px">
                            {cardsByType.unknown.map(
                              (card: Card, index: number) => (
                                <CardContainer
                                  key={`unknown-${card.id}-${index}`}
                                >
                                  <CardImage
                                    src={getCardImageUrl(card.id, "small")}
                                    alt={card.name || `Card #${card.id}`}
                                    title={card.name || `Card #${card.id}`}
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.src = CARD_BACK_IMAGE;
                                    }}
                                  />
                                  <CardCountBadge>
                                    {
                                      deck.mainDeck.filter(
                                        (c: Card) => c.id === card.id
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
                    </>
                  )}
                </TabSection>
              )}

              {/* Extra Deck Section */}
              {activeTab === "extra" && (
                <TabSection>
                  {cardsByType.extra.length === 0 ? (
                    <EmptyDeckMessage>No cards in extra deck</EmptyDeckMessage>
                  ) : (
                    <>
                      <SectionSubtitle>
                        Extra Deck Cards ({cardsByType.extra.length})
                      </SectionSubtitle>
                      <YGOCardGrid gap="10px">
                        {cardsByType.extra.map((card: Card, index: number) => (
                          <CardContainer key={`extra-${card.id}-${index}`}>
                            <CardImage
                              className="extra-card"
                              src={getCardImageUrl(card.id, "small")}
                              alt={card.name || `Card #${card.id}`}
                              title={card.name || `Card #${card.id}`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = CARD_BACK_IMAGE;
                              }}
                            />
                            <CardCountBadge>
                              {
                                deck.extraDeck.filter(
                                  (c: Card) => c.id === card.id
                                ).length
                              }
                              x
                            </CardCountBadge>
                          </CardContainer>
                        ))}
                      </YGOCardGrid>
                    </>
                  )}
                </TabSection>
              )}

              {/* Side Deck Section */}
              {activeTab === "side" && (
                <TabSection>
                  {cardsByType.side.length === 0 ? (
                    <EmptyDeckMessage>No cards in side deck</EmptyDeckMessage>
                  ) : (
                    <>
                      <SectionSubtitle>
                        Side Deck Cards ({cardsByType.side.length})
                      </SectionSubtitle>
                      <YGOCardGrid gap="10px">
                        {cardsByType.side.map((card: Card, index: number) => (
                          <CardContainer key={`side-${card.id}-${index}`}>
                            <CardImage
                              className="side-card"
                              src={getCardImageUrl(card.id, "small")}
                              alt={card.name || `Card #${card.id}`}
                              title={card.name || `Card #${card.id}`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = CARD_BACK_IMAGE;
                              }}
                            />
                            <CardCountBadge>
                              {
                                deck.sideDeck.filter(
                                  (c: Card) => c.id === card.id
                                ).length
                              }
                              x
                            </CardCountBadge>
                          </CardContainer>
                        ))}
                      </YGOCardGrid>
                    </>
                  )}
                </TabSection>
              )}

              {/* Notes Section */}
              {activeTab === "notes" && (
                <TabSection>
                  {deck.notes ? (
                    <NotesContent>{deck.notes}</NotesContent>
                  ) : (
                    <EmptyDeckMessage>
                      No notes available for this deck
                    </EmptyDeckMessage>
                  )}
                </TabSection>
              )}
            </TabContent>
          </Card.Content>
        </DeckContentCard>
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

const ImportNotification = styled.div<{ $status: string }>`
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  background-color: ${(props) =>
    props.$status === "success"
      ? theme.colors.success.light
      : theme.colors.error.light};
  color: ${(props) =>
    props.$status === "success"
      ? theme.colors.success.dark
      : theme.colors.error.dark};
  border-radius: ${theme.borderRadius.md};
  border-left: 4px solid
    ${(props) =>
      props.$status === "success"
        ? theme.colors.success.main
        : theme.colors.error.main};
  animation: fadeIn 0.3s ease-in;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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

  .deck-shared {
    font-size: ${theme.typography.size.sm};
    color: ${theme.colors.text.secondary};
    display: flex;
    align-items: center;
    gap: ${theme.spacing.xs};
  }
`;

const CardDetailsSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.light};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.xs};
`;

const CardDetailHeader = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const CardDetailTitle = styled.h3`
  margin: 0;
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.weight.semibold};
`;

const CardDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const CardName = styled.div`
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.text.primary};
`;

const CardType = styled.div`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
`;

const CardStat = styled.div`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
`;

const CardStats = styled.div`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
  display: flex;
  gap: ${theme.spacing.md};
`;

const CardDescription = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  white-space: pre-wrap;
`;

const NoCardSelected = styled.div`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
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

const EmptyDeckMessage = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.text.secondary};
  font-style: italic;
`;

const NotesContent = styled.div`
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.light};
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
  line-height: 1.6;
  white-space: pre-wrap;
  border: 1px solid ${theme.colors.border.light};
  box-shadow: ${theme.shadows.xs};
  max-height: 500px;
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

export default SharedDeckPage;
