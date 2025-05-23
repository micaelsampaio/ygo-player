import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { YGODeckToImage } from "ygo-core-images-utils";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card, Tabs, Tab } from "../UI";
import { YGOCardGrid } from "../UI/YGOCard";
import {
  ArrowLeft,
  Share2,
  Download,
  Edit3,
  Zap,
  Image,
  Check,
} from "lucide-react";
import CoverCardModal from "../MyDecks/CoverCardModal";
import CardModal from "../DeckBuilder/components/CardModal/CardModal";
import DrawSimulator from "../DeckBuilder/components/DrawSimulator";
import DeckAnalytics from "../DeckBuilder/components/DeckAnalysis";
import ViewSidePatterns from "../DeckBuilder/components/ViewSidePatterns"; // Import the ViewSidePatterns component
import { useDeckAnalytics } from "../DeckBuilder/hooks/useDeckAnalytics";
import DeckActions from "../shared/DeckActions"; // Fixed import path
import { createPortal } from "react-dom"; // Import createPortal
import "../DeckBuilder/components/DrawSimulator/DrawSimulator.css";
import "../DeckBuilder/components/DeckAnalysis/styles/DeckAnalytics.css";
import "../DeckBuilder/components/ViewSidePatterns/ViewSidePatterns.css"; // Import the CSS for ViewSidePatterns
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../utils/cardImages";
import { APIService } from "../../services/api-service";
import { DeckReplaysTab } from "./DeckReplaysTab";
import { useDeckGroups } from "../DeckBuilder/hooks/useDeckGroups";

const DeckDetailPage = () => {
  const navigate = useNavigate();
  const { deckId } = useParams();
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>("");
  const [activeTab, setActiveTab] = useState("main");
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [coverCardId, setCoverCardId] = useState<number | undefined>(undefined);
  const [coverCardDetails, setCoverCardDetails] = useState<any>(null);
  const [previewCard, setPreviewCard] = useState<any>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [shareTooltipVisible, setShareTooltipVisible] = useState(false);
  const [deckAnalytics, setDeckAnalytics] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { analyzeDeck } = useDeckAnalytics();

  const [isDeckMenuVisible, setIsDeckMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const deckActionsRef = useRef<HTMLDivElement>(null);
  const { deckGroups, moveDeckToGroup, createDeckGroup, updateDeckGroup } =
    useDeckGroups();
  const [isMoveGroupMenuOpen, setIsMoveGroupMenuOpen] = useState(false);

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        deckActionsRef.current &&
        !deckActionsRef.current.contains(e.target as Node) &&
        isDeckMenuVisible
      ) {
        setIsDeckMenuVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDeckMenuVisible]);

  // Handle card click with navigation option
  const handleCardClick = (card: any, e?: React.MouseEvent) => {
    // If Ctrl/Cmd key is pressed, navigate to card details
    if (e && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigate(`/cards/database/card/${card.id}`);
    } else {
      // Otherwise, show the card modal
      setPreviewCard(card);
      setIsCardModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsCardModalOpen(false);
  };

  useEffect(() => {
    // Load the deck data
    if (deckId) {
      const loadDeck = async () => {
        setLoading(true);
        try {
          // First try direct access with the key
          let deckData = localStorage.getItem(`deck_${deckId}`);
          let parsedDeck = null;

          if (deckData) {
            parsedDeck = JSON.parse(deckData);
          } else {
            parsedDeck = await APIService.getDeckByIdWithCardsData(deckId);
          }

          if (parsedDeck) {
            // Debug the loaded deck and specifically check for notes
            console.log("Loaded deck data:", {
              id: parsedDeck.id,
              name: parsedDeck.name,
              hasNotes: !!parsedDeck.notes,
              notes: parsedDeck.notes
                ? parsedDeck.notes.substring(0, 50) + "..."
                : "none",
            });

            setDeck(parsedDeck);
            setCoverCardId(parsedDeck.coverCardId);
            setFileName(deckId.replace(/\s+/g, "_").toLowerCase());
          } else {
            // If not found, search through all localStorage keys to find a deck with matching ID
            const found = findDeckById(deckId);
            if (found) {
              console.log("Found deck by ID search:", {
                id: found.deck.id,
                name: found.deck.name,
                hasNotes: !!found.deck.notes,
                notes: found.deck.notes
                  ? found.deck.notes.substring(0, 50) + "..."
                  : "none",
              });

              setDeck(found.deck);
              setCoverCardId(found.deck.coverCardId);
              setFileName(found.name.replace(/\s+/g, "_").toLowerCase());
            }
          }
        } catch (error) {
          console.error("Error loading deck:", error);
        }
        setLoading(false);
      };

      loadDeck();
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
      cdnUrl: import.meta.env.VITE_YGO_CDN_URL,
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

  const handleDuel = async () => {
    try {
      navigate(`/pre-duel?deck1=${deckId}`);
    } catch (error) {
      console.error("Failed to start duel with deck:", error);
      alert(
        `Failed to start duel: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const goBack = () => {
    navigate("/my/decks");
  };

  const getCardCountString = () => {
    if (!deck) return "";

    const mainCount = deck.mainDeck?.length || 0;
    const extraCount = deck.extraDeck?.length || 0;
    const sideCount = deck.sideDeck?.length || 0;

    return `${mainCount} Main | ${extraCount} Extra${sideCount > 0 ? ` | ${sideCount} Side` : ""
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
        : getCardImageUrl(0); // Default card back image with ID 0
    }

    return getCardImageUrl(coverCardId);
  };

  const generateYdkeUrl = (deck: any) => {
    if (!deck) return "";

    // Convert deck cards to YDKE format
    const encodeCards = (cards: any[]) => {
      if (!cards || cards.length === 0) return "";

      // Extract card IDs
      const cardIds = cards.map((card) => card.id);

      // Create buffer for all cards (4 bytes per card ID)
      const buffer = new Uint8Array(cardIds.length * 4);
      const dataView = new DataView(buffer.buffer);

      // Write each card ID as a 4-byte integer (little-endian)
      cardIds.forEach((id, index) => {
        dataView.setUint32(index * 4, id, true); // true for little-endian
      });

      // Base64 encode the buffer
      const binary = Array.from(buffer)
        .map((byte) => String.fromCharCode(byte))
        .join("");

      return btoa(binary);
    };

    const main = encodeCards(deck.mainDeck || []);
    const extra = encodeCards(deck.extraDeck || []);
    const side = encodeCards(deck.sideDeck || []);

    console.log("Encoded deck parts:", { main, extra, side });

    const ydkeUrl = `ydke://${main}!${extra}!${side}!`;
    return ydkeUrl;
  };

  const getShareUrl = (deck: any) => {
    if (!deck) return "";

    const baseUrl = window.location.origin;
    const ydkeUrl = generateYdkeUrl(deck);
    const encodedName = encodeURIComponent(deck.name || "Shared_Deck");

    // Include additional parameters - deck notes and cover card ID
    let shareUrl = `${baseUrl}/my/decks/public/${encodedName}?data=${encodeURIComponent(
      ydkeUrl
    )}`;

    // Add notes if available - make sure they're properly encoded
    if (deck.notes && deck.notes.trim() !== "") {
      // Encode notes properly to handle special characters and line breaks
      const encodedNotes = encodeURIComponent(deck.notes);
      shareUrl += `&notes=${encodedNotes}`;
      console.log("Sharing notes:", {
        original: deck.notes.substring(0, 50) + "...",
        encoded: encodedNotes.substring(0, 100) + "...",
      });
    }

    // Add cover card ID if available
    if (deck.coverCardId) {
      shareUrl += `&cover=${deck.coverCardId}`;
    }

    return shareUrl;
  };

  const handleShareDeck = async () => {
    if (!deck) return;

    try {
      const shareUrl = getShareUrl(deck);
      console.log("Share URL:", shareUrl);

      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
      setShareTooltipVisible(true);

      // Hide the tooltip after 2 seconds
      setTimeout(() => {
        setShareStatus("idle");
        setShareTooltipVisible(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy share URL:", error);
      setShareStatus("error");
      setShareTooltipVisible(true);

      setTimeout(() => {
        setShareStatus("idle");
        setShareTooltipVisible(false);
      }, 2000);
    }
  };

  const isReplaysTabVisible = activeTab === "replays";

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
                    target.src = getCardImageUrl(0); // Default card back image with ID 0
                  }}
                />
              </CoverCardWrapper>

              <DeckInfoSection>
                <DeckMetaInfo>
                  <DeckStats>
                    <div className="deck-count-wrapper">
                      <span className="deck-count">{getCardCountString()}</span>
                      <DeckOptionsButton
                        onClick={(e) => {
                          e.stopPropagation();

                          // Calculate the correct position for the context menu
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPosition({
                            x: Math.min(
                              rect.right + 10,
                              window.innerWidth - 300
                            ),
                            y: rect.top,
                          });

                          setIsDeckMenuVisible(true);
                        }}
                        title="Deck options"
                      >
                        ⋮
                      </DeckOptionsButton>
                    </div>
                    {deck.createdAt && (
                      <span className="deck-created">
                        Created: {new Date(deck.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </DeckStats>
                </DeckMetaInfo>

                <CardDetailsSection>
                  <CardDetailHeader>
                    <CardDetailTitle>Cover Card</CardDetailTitle>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <ChangeCoverButton
                        onClick={() => setIsCoverModalOpen(true)}
                      >
                        <Image size={14} /> Change
                      </ChangeCoverButton>
                    </div>
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
                  <ActionButton variant="ghost" onClick={handleShareDeck}>
                    <ShareButtonContent>
                      {shareStatus === "copied" ? (
                        <Check size={16} />
                      ) : (
                        <Share2 size={16} />
                      )}{" "}
                      Share
                      {shareTooltipVisible && (
                        <ShareTooltip status={shareStatus}>
                          {shareStatus === "copied"
                            ? "Copied to clipboard!"
                            : "Failed to copy"}
                        </ShareTooltip>
                      )}
                    </ShareButtonContent>
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
                <Tab value="simulator" label="Draw Simulator" />
                <Tab value="analytics" label="Deck Analytics" />
                <Tab value="notes" label="Notes" />
                <Tab value="replays" label="Replays" />
                <Tab value="sidePatterns" label="Side Patterns" />{" "}
                {/* Add Side Patterns tab */}
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
                                  onClick={(e) => handleCardClick(card, e)}
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
                                  onClick={(e) => handleCardClick(card, e)}
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
                                onClick={(e) => handleCardClick(card, e)}
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
                            onClick={(e) => handleCardClick(card, e)}
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
                                onClick={(e) => handleCardClick(card, e)}
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

                {/* Draw Simulator Section */}
                {activeTab === "simulator" && (
                  <TabSection>
                    <DrawSimulator deck={deck} onCardSelect={handleCardClick} />
                  </TabSection>
                )}

                {/* Analytics Section */}
                {activeTab === "analytics" && (
                  <TabSection>
                    <DeckAnalytics
                      analytics={deckAnalytics}
                      deck={deck}
                      isVisible={activeTab === "analytics"}
                      isLoading={isAnalyzing}
                      isEnhanced={false}
                      onToggleEnhanced={() => { }}
                    />
                  </TabSection>
                )}

                {/* Notes Section */}
                {activeTab === "notes" && (
                  <TabSection>
                    {deck.notes ? (
                      <NotesContent>
                        <NotesText>{deck.notes}</NotesText>
                      </NotesContent>
                    ) : (
                      <EmptyNotesSection>
                        <p>No notes have been added to this deck.</p>
                        <EditNotesButton
                          variant="secondary"
                          onClick={handleEdit}
                        >
                          <Edit3 size={16} /> Add Notes in Deck Builder
                        </EditNotesButton>
                      </EmptyNotesSection>
                    )}
                  </TabSection>
                )}

                {/* Replays Section */}
                <TabSection
                  style={{ display: isReplaysTabVisible ? "block" : "none" }}
                >
                  <DeckReplaysTab
                    visible={isReplaysTabVisible}
                    deckId={deck?.id}
                  />
                </TabSection>

                {/* Side Patterns Section */}
                {activeTab === "sidePatterns" && (
                  <TabSection>
                    <ViewSidePatterns deck={deck} />
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

      {/* Deck Actions Context Menu */}
      {isDeckMenuVisible &&
        deck &&
        createPortal(
          <ContextMenuContainer
            className="deck-context-menu"
            style={{
              top: `${menuPosition.y}px`,
              left: `${menuPosition.x}px`,
            }}
            ref={deckActionsRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Use the DeckActions component directly without its button */}
            <DeckActions
              deck={deck}
              onImportDeck={(importedDeck) => {
                setDeck(importedDeck);
                localStorage.setItem(
                  `deck_${deckId}`,
                  JSON.stringify(importedDeck)
                );
                setIsDeckMenuVisible(false);
              }}
              onRenameDeck={(newName) => {
                const updatedDeck = { ...deck, name: newName };
                localStorage.setItem(
                  `deck_${deckId}`,
                  JSON.stringify(updatedDeck)
                );
                setDeck(updatedDeck);
                setIsDeckMenuVisible(false);
              }}
              onClearDeck={() => {
                const clearedDeck = {
                  ...deck,
                  mainDeck: [],
                  extraDeck: [],
                  sideDeck: [],
                };
                localStorage.setItem(
                  `deck_${deckId}`,
                  JSON.stringify(clearedDeck)
                );
                setDeck(clearedDeck);
                setIsDeckMenuVisible(false);
              }}
              onCopyDeck={(deckToCopy) => {
                const copyName = `${deck.name} (Copy)`;
                const newDeck = {
                  ...deck,
                  id: `deck_${copyName.replace(/\s+/g, "_").toLowerCase()}`,
                  name: copyName,
                };

                localStorage.setItem(
                  `deck_${copyName.replace(/\s+/g, "_").toLowerCase()}`,
                  JSON.stringify(newDeck)
                );
                navigate(`/my/decks/${newDeck.id}`);
                setIsDeckMenuVisible(false);
              }}
              onDeleteDeck={(deckToDelete) => {
                localStorage.removeItem(`deck_${deckId}`);
                navigate("/my/decks");
                setIsDeckMenuVisible(false);
              }}
              onCreateCollection={(deck) => {
                // Create a collection from this deck
                alert("Collection creation from deck is not implemented yet");
                setIsDeckMenuVisible(false);
              }}
              showDropdownImmediately={true}
              deckGroups={deckGroups}
              onMoveDeckToGroup={(groupId) => {
                const updatedDeck = { ...deck, groupId };
                localStorage.setItem(
                  `deck_${deckId}`,
                  JSON.stringify(updatedDeck)
                );
                setDeck(updatedDeck);
                setIsDeckMenuVisible(false);
              }}
            />
          </ContextMenuContainer>,
          document.body
        )}
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
  position: relative;
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

const DeckOptionsButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.lg};
  cursor: pointer;
  padding: ${theme.spacing.xs};
  border-radius: ${theme.borderRadius.sm};
  transition: background-color ${theme.transitions.default};

  &:hover {
    background-color: ${theme.colors.background.card};
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
  background-color: ${theme.colors.background.paper};
  color: ${theme.colors.text.secondary};
  border-radius: ${theme.borderRadius.full};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.size.sm};
  border: 1px solid ${theme.colors.border.light};
`;

const DeckStats = styled.div`
  display: flex;
  flex-direction: column;

  .deck-count-wrapper {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
  }

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
  background-color: ${theme.colors.background.paper};
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
  background-color: ${theme.colors.background.paper};
  padding: ${theme.spacing.xs} ${theme.spacing.xs};
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
    background-color: ${theme.colors.background.paper};
    color: ${theme.colors.text.primary};
    padding: ${theme.spacing.xs} ${theme.spacing.xs};
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
    background: ${theme.colors.background.paper};
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
  transition: color ${theme.transitions.default},
    background ${theme.transitions.default};
  border-radius: ${theme.borderRadius.sm};
  margin-left: auto;

  &:hover {
    color: ${theme.colors.primary.dark};
    background-color: ${theme.colors.background.card};
    text-decoration: none;
  }
`;

const NotesContent = styled.div`
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.paper};
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
    background: ${theme.colors.background.paper};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.primary.light};
    border-radius: 4px;
  }
`;

const NotesText = styled.div`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const NoNotesText = styled.div`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
  text-align: center;
  padding: ${theme.spacing.md} 0;
  font-style: italic;
`;

const EmptyNotesSection = styled.div`
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

const EditNotesButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
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
  display: flex;
  flex-wrap: wrap;
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

const ShareButtonContent = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const ShareTooltip = styled.div<{ status: string }>`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: ${(props) =>
    props.status === "copied"
      ? theme.colors.success.main
      : theme.colors.error.main};
  color: white;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.size.sm};
  pointer-events: none;
  box-shadow: ${theme.shadows.md};
  animation: fadeInOut 2s ease-in-out;

  &:after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px;
    border-style: solid;
    border-color: ${(props) =>
    props.status === "copied"
      ? theme.colors.success.main
      : theme.colors.error.main}
      transparent transparent transparent;
  }

  @keyframes fadeInOut {
    0% {
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
`;

const ContextMenuContainer = styled.div`
  position: absolute;
  z-index: 1000;
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.light};
`;

export default DeckDetailPage;
