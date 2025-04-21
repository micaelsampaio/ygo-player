import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import styled from "styled-components";
import { Card } from "../../components/DeckBuilder/types";
import { YGODeckToImage } from "ygo-core-images-utils";

interface DeckData {
  name: string;
  mainDeck: Card[];
  extraDeck: Card[];
}

interface Collection {
  id: string;
  name: string;
}

const DeckDetailPage = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

  const [deck, setDeck] = useState<DeckData | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Extract tab from the URL or default to "overview"
    const path = location.pathname;
    if (path.endsWith("/collections")) return "collections";
    if (path.endsWith("/combos")) return "combos";
    if (path.endsWith("/replays")) return "replays";
    return "overview";
  });

  const [collections, setCollections] = useState<Collection[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [replays, setReplays] = useState<any[]>([]);

  // Load deck data
  useEffect(() => {
    if (deckId) {
      try {
        const deckData = JSON.parse(localStorage.getItem(deckId) || "{}");
        if (deckData.mainDeck) {
          setDeck(deckData);
        }
      } catch (error) {
        console.error("Error loading deck:", error);
      }
    }
  }, [deckId]);

  // Load related collections, combos and replays
  useEffect(() => {
    if (!deckId) return;

    // Load collections that contain this deck
    const allKeys = Object.keys(localStorage);
    const collectionKeys = allKeys.filter((key) => key.startsWith("c_"));

    const deckCollections = [];
    for (const key of collectionKeys) {
      try {
        const collection = JSON.parse(localStorage.getItem(key) || "{}");
        if (collection.deck?.name === deckId) {
          deckCollections.push({
            id: key,
            name: collection.name,
          });
        }
      } catch (error) {
        console.error(`Error parsing collection ${key}:`, error);
      }
    }
    setCollections(deckCollections);

    // Load replays that used this deck
    const replayKeys = allKeys.filter((key) => key.startsWith("replay_"));
    const deckReplays = [];

    for (const key of replayKeys) {
      try {
        const replay = JSON.parse(localStorage.getItem(key) || "{}");
        if (
          replay.players &&
          replay.players.some(
            (p: any) =>
              p.name === deckId ||
              JSON.stringify(p.mainDeck) === JSON.stringify(deck?.mainDeck)
          )
        ) {
          deckReplays.push({
            id: key,
            date: new Date(key.replace("replay_", "")).toLocaleDateString(),
            data: replay,
          });
        }
      } catch (error) {
        console.error(`Error parsing replay ${key}:`, error);
      }
    }
    setReplays(deckReplays);

    // For combos, we would need to implement this based on your combo data structure
    // This is a placeholder assuming combos are structured similarly to collections
    const deckCombos = [];
    // Implementation would depend on your data structure
    setCombos(deckCombos);
  }, [deckId, deck]);

  // Calculate card type statistics
  const deckStats = useMemo(() => {
    if (!deck) return { monsters: 0, spells: 0, traps: 0, extra: 0, total: 0 };

    const stats = {
      monsters: deck.mainDeck.filter((card) => card.type.includes("Monster"))
        .length,
      spells: deck.mainDeck.filter((card) => card.type.includes("Spell"))
        .length,
      traps: deck.mainDeck.filter((card) => card.type.includes("Trap")).length,
      extra: deck.extraDeck.length,
      total: deck.mainDeck.length + deck.extraDeck.length,
    };

    return stats;
  }, [deck]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    // Update URL based on selected tab
    if (tab === "overview") {
      navigate(`/my/decks/${deckId}`);
    } else {
      navigate(`/my/decks/${deckId}/${tab}`);
    }
  };

  const downloadDeckAsYdk = () => {
    if (!deck || !deckId) return;

    const fileName = deckId + ".ydk";
    const deckBuilder = new YGODeckToImage({
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });
    deckBuilder.downloadYdk({ fileName });
  };

  const downloadDeckAsPng = async () => {
    if (!deck || !deckId) return;

    const fileName = deckId + ".png";
    const deckBuilder = new YGODeckToImage({
      name: deckId.replace("deck_", ""),
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });

    await deckBuilder.toImage({ fileName, download: true });
  };

  if (!deck || !deckId) {
    return (
      <PageContainer>
        <p>Deck not found</p>
        <Button onClick={() => navigate("/my/decks")}>Back to My Decks</Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton onClick={() => navigate("/my/decks")}>
        ← Back to My Decks
      </BackButton>

      <DeckHeader>
        <h1>{deckId.replace("deck_", "")}</h1>
        <ButtonGroup>
          <Button onClick={() => navigate(`/duel?deck=${deckId}`)}>Duel</Button>
          <Button onClick={downloadDeckAsYdk}>Download YDK</Button>
          <Button onClick={downloadDeckAsPng}>Download PNG</Button>
          <Button onClick={() => navigate(`/deckbuilder?edit=${deckId}`)}>
            Edit
          </Button>
        </ButtonGroup>
      </DeckHeader>

      <StatsBar>
        <StatItem>
          <StatLabel>Total Cards</StatLabel>
          <StatValue>{deckStats.total}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Monsters</StatLabel>
          <StatValue>{deckStats.monsters}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Spells</StatLabel>
          <StatValue>{deckStats.spells}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Traps</StatLabel>
          <StatValue>{deckStats.traps}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Extra Deck</StatLabel>
          <StatValue>{deckStats.extra}</StatValue>
        </StatItem>
      </StatsBar>

      <TabsContainer>
        <Tab
          active={activeTab === "overview"}
          onClick={() => handleTabChange("overview")}
        >
          Overview
        </Tab>
        <Tab
          active={activeTab === "collections"}
          onClick={() => handleTabChange("collections")}
        >
          Collections
        </Tab>
        <Tab
          active={activeTab === "combos"}
          onClick={() => handleTabChange("combos")}
        >
          Combos
        </Tab>
        <Tab
          active={activeTab === "replays"}
          onClick={() => handleTabChange("replays")}
        >
          Replays
        </Tab>
      </TabsContainer>

      <TabContent>
        {activeTab === "overview" && (
          <TabPanel>
            <CardSection>
              <SectionTitle>Main Deck ({deck.mainDeck.length})</SectionTitle>
              <CardGrid>
                {deck.mainDeck.map((card, index) => (
                  <CardItem key={`${card.id}-${index}`}>
                    <CardImage
                      src={`${cdnUrl}/images/cards/${card.id}.jpg`}
                      alt={card.name}
                      onError={(e) => {
                        (
                          e.target as HTMLImageElement
                        ).src = `${cdnUrl}/images/cards/card_back.jpg`;
                      }}
                    />
                    <CardName>{card.name}</CardName>
                  </CardItem>
                ))}
              </CardGrid>
            </CardSection>

            {deck.extraDeck.length > 0 && (
              <CardSection>
                <SectionTitle>
                  Extra Deck ({deck.extraDeck.length})
                </SectionTitle>
                <CardGrid>
                  {deck.extraDeck.map((card, index) => (
                    <CardItem key={`extra-${card.id}-${index}`}>
                      <CardImage
                        src={`${cdnUrl}/images/cards/${card.id}.jpg`}
                        alt={card.name}
                        onError={(e) => {
                          (
                            e.target as HTMLImageElement
                          ).src = `${cdnUrl}/images/cards/card_back.jpg`;
                        }}
                      />
                      <CardName>{card.name}</CardName>
                    </CardItem>
                  ))}
                </CardGrid>
              </CardSection>
            )}
          </TabPanel>
        )}

        {activeTab === "collections" && (
          <TabPanel>
            {collections.length > 0 ? (
              <CollectionList>
                {collections.map((collection) => (
                  <CollectionItem key={collection.id}>
                    <Link
                      to={`/collections/${collection.id.replace("c_", "")}`}
                    >
                      {collection.name}
                    </Link>
                  </CollectionItem>
                ))}
              </CollectionList>
            ) : (
              <EmptyState>
                <p>This deck is not in any collections.</p>
                <Button onClick={() => navigate("/collections")}>
                  Create Collection
                </Button>
              </EmptyState>
            )}
          </TabPanel>
        )}

        {activeTab === "combos" && (
          <TabPanel>
            {combos.length > 0 ? (
              <div>Combos list goes here</div>
            ) : (
              <EmptyState>
                <p>No combos have been created with this deck.</p>
                <Button onClick={() => navigate("/spreadsheet")}>
                  Create Combo
                </Button>
              </EmptyState>
            )}
          </TabPanel>
        )}

        {activeTab === "replays" && (
          <TabPanel>
            {replays.length > 0 ? (
              <ReplayList>
                {replays.map((replay) => (
                  <ReplayItem key={replay.id}>
                    <ReplayTitle>{replay.id}</ReplayTitle>
                    <ReplayDate>{replay.date}</ReplayDate>
                    <ButtonGroup>
                      <Button
                        onClick={() => {
                          localStorage.setItem(
                            "duel-data",
                            localStorage.getItem(replay.id) || ""
                          );
                          navigate("/duel");
                        }}
                      >
                        Watch Replay
                      </Button>
                    </ButtonGroup>
                  </ReplayItem>
                ))}
              </ReplayList>
            ) : (
              <EmptyState>
                <p>No duels have been played with this deck.</p>
                <Button onClick={() => navigate(`/duel?deck=${deckId}`)}>
                  Duel Now
                </Button>
              </EmptyState>
            )}
          </TabPanel>
        )}
      </TabContent>
    </PageContainer>
  );
};

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  padding: 5px 0;
  margin-bottom: 20px;
  color: #0078d4;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    text-decoration: underline;
  }
`;

const DeckHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h1 {
    margin: 0;
    color: white;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: #2a2a2a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #444;
  }
`;

const StatsBar = styled.div`
  display: flex;
  background-color: #222;
  border-radius: 8px;
  margin-bottom: 24px;
  overflow: hidden;
`;

const StatItem = styled.div`
  flex: 1;
  padding: 15px;
  text-align: center;
  border-right: 1px solid #333;

  &:last-child {
    border-right: none;
  }
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #999;
  margin-bottom: 5px;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: white;
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #333;
  margin-bottom: 24px;
`;

const Tab = styled.div<{ active: boolean }>`
  padding: 12px 24px;
  cursor: pointer;
  color: ${(props) => (props.active ? "white" : "#999")};
  border-bottom: 3px solid
    ${(props) => (props.active ? "#0078d4" : "transparent")};
  font-weight: ${(props) => (props.active ? "bold" : "normal")};

  &:hover {
    color: white;
    background-color: #2a2a2a;
  }
`;

const TabContent = styled.div`
  min-height: 400px;
`;

const TabPanel = styled.div`
  padding: 20px 0;
`;

const CardSection = styled.section`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  color: white;
  margin-bottom: 15px;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 15px;
`;

const CardItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const CardImage = styled.img`
  width: 100%;
  border-radius: 5px;
  margin-bottom: 5px;
`;

const CardName = styled.div`
  font-size: 12px;
  color: #ccc;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const CollectionList = styled.ul`
  list-style: none;
  padding: 0;
`;

const CollectionItem = styled.li`
  padding: 15px;
  background-color: #2a2a2a;
  margin-bottom: 10px;
  border-radius: 8px;

  a {
    color: white;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const ReplayList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ReplayItem = styled.div`
  padding: 15px;
  background-color: #2a2a2a;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ReplayTitle = styled.div`
  flex: 1;
  color: white;
`;

const ReplayDate = styled.div`
  color: #999;
  margin-right: 20px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 50px;
  background-color: #2a2a2a;
  border-radius: 8px;
  color: white;
`;

export default DeckDetailPage;
