import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Navigate, useNavigate } from "react-router-dom";
import {
  PlusCircle,
  Filter,
  Grid,
  List,
  Save,
  Database,
  Eye,
  Lock,
  Target,
} from "lucide-react";
import AppLayout from "../Layout/AppLayout";
import { isUserLoggedIn } from "../../utils/token-utils";
import theme from "../../styles/theme";
import { Button, Card } from "../UI";
import EmptyCollectionState from "./EmptyCollectionState";
import CardCollectionGrid from "./CardCollectionGrid";
import CollectionSidebar from "./CollectionSidebar";
import LoginPrompt from "./LoginPrompt";
import CollectionTargets from "./CollectionTargets";
import CreateTargetDialog from "./CreateTargetDialog";
import CollectionImportExport from "./CollectionImportExport";
import { CardCSVData } from "./utils/csv-utils";
import { toast } from "react-hot-toast";

// Define types for our card collection
interface CardItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  set: string;
  condition: string;
  quantity: number;
  price?: number;
  notes?: string;
  dateAdded: string;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  value?: number;
  lastModified: string;
}

interface CollectionTarget {
  id: string;
  name: string;
  type: "set" | "deck";
  description: string;
  progress: number;
  total: number;
  targetType: "one_of_each" | "playset" | "rare_only" | "custom";
  createdAt: string;
  lastUpdated: string;
}

const CardCollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [targets, setTargets] = useState<CollectionTarget[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"collections" | "targets">(
    "collections"
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateTargetOpen, setIsCreateTargetOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check if user is logged in
    setIsLoggedIn(isUserLoggedIn());

    // Load data
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load collections (replace with API in production)
        setTimeout(() => {
          setCollections([
            {
              id: "main",
              name: "Main Collection",
              description: "My primary card collection",
              cardCount: 237,
              value: 1250.75,
              lastModified: "2025-05-10",
            },
            {
              id: "tradables",
              name: "Cards for Trade",
              description: "Cards I'm willing to trade",
              cardCount: 45,
              value: 320.5,
              lastModified: "2025-05-08",
            },
          ]);

          // Load saved targets from localStorage
          loadTargets();

          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error("Error loading collection data:", error);
        setIsLoading(false);
      }
    };

    if (isLoggedIn) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Load saved targets from localStorage
  const loadTargets = () => {
    try {
      const savedTargets = localStorage.getItem("cardCollectionTargets");
      if (savedTargets) {
        setTargets(JSON.parse(savedTargets));
      }
    } catch (error) {
      console.error("Error loading targets:", error);
    }
  };

  // Save targets to localStorage
  const saveTargets = (updatedTargets: CollectionTarget[]) => {
    try {
      localStorage.setItem(
        "cardCollectionTargets",
        JSON.stringify(updatedTargets)
      );
    } catch (error) {
      console.error("Error saving targets:", error);
      toast.error("Failed to save collection targets");
    }
  };

  useEffect(() => {
    // Load cards for the active collection
    const loadCollectionCards = async () => {
      if (!activeCollection) return;

      setIsLoading(true);
      try {
        // Replace with actual API call
        setTimeout(() => {
          // Sample card data
          const sampleCards: CardItem[] = Array(20)
            .fill(null)
            .map((_, index) => ({
              id: `card-${index}`,
              name: `Sample Card ${index + 1}`,
              imageUrl: `${
                import.meta.env.VITE_YGO_CDN_URL
              }/images/cards/sample-${(index % 5) + 1}.jpg`,
              rarity: [
                "Common",
                "Rare",
                "Super Rare",
                "Ultra Rare",
                "Secret Rare",
              ][Math.floor(Math.random() * 5)],
              set: ["LART", "ETCO", "TOCH", "ROTD", "PHRA"][
                Math.floor(Math.random() * 5)
              ],
              condition: ["Mint", "Near Mint", "Excellent", "Good", "Played"][
                Math.floor(Math.random() * 5)
              ],
              quantity: Math.floor(Math.random() * 4) + 1,
              price: parseFloat((Math.random() * 50 + 0.99).toFixed(2)),
              notes: index % 3 === 0 ? "First edition" : undefined,
              dateAdded: new Date(Date.now() - Math.random() * 10000000000)
                .toISOString()
                .split("T")[0],
            }));

          setCards(sampleCards);
          setIsLoading(false);
        }, 600);
      } catch (error) {
        console.error("Error loading cards:", error);
        setIsLoading(false);
      }
    };

    if (activeCollection) {
      loadCollectionCards();
    }
  }, [activeCollection]);

  const handleCollectionSelect = (collectionId: string) => {
    setActiveCollection(collectionId);
    setActiveTab("collections");
  };

  const handleCreateCollection = () => {
    // Open dialog to create new collection
    console.log("Create new collection");
    // This would open a modal/dialog to create a new collection
  };

  const handleCreateTarget = () => {
    setIsCreateTargetOpen(true);
  };

  const handleSaveTarget = (targetData: CollectionTarget) => {
    const updatedTargets = [...targets, targetData];
    setTargets(updatedTargets);
    saveTargets(updatedTargets);

    // Debug: Verify localStorage was updated correctly
    console.log("Saving targets to localStorage:", updatedTargets);
    console.log(
      "localStorage contents after save:",
      localStorage.getItem("cardCollectionTargets")
    );

    toast.success(`Created new target: ${targetData.name}`);
  };

  const handleViewTargetDetails = (targetId: string) => {
    navigate(`/my/cards/collection/targets/${targetId}`);
  };

  // Handler for importing cards from CSV
  const handleImportCards = (
    importedCards: CardCSVData[],
    collectionId: string
  ) => {
    // In a real app, this would call an API endpoint to save the imported cards
    console.log(
      `Importing ${importedCards.length} cards to collection ${collectionId}`
    );

    // For now, just update the UI if the active collection is the one being imported to
    if (activeCollection === collectionId) {
      // Convert imported cards to CardItem format
      const newCards = importedCards.map((importedCard) => ({
        id: importedCard.id,
        name: importedCard.name,
        imageUrl: `${
          import.meta.env.VITE_YGO_CDN_URL
        }/images/cards/default.jpg`, // Placeholder image
        rarity: importedCard.rarity,
        set: importedCard.set,
        condition: importedCard.condition,
        quantity: importedCard.quantity,
        price: importedCard.price,
        notes: importedCard.notes,
        dateAdded: importedCard.dateAdded,
      }));

      setCards((prev) => [...prev, ...newCards]);

      // Update collection stats
      setCollections((prev) =>
        prev.map((collection) => {
          if (collection.id === collectionId) {
            const updatedCardCount =
              collection.cardCount + importedCards.length;
            const importedValue = importedCards.reduce(
              (total, card) => total + (card.price || 0) * card.quantity,
              0
            );
            const updatedValue = (collection.value || 0) + importedValue;

            return {
              ...collection,
              cardCount: updatedCardCount,
              value: updatedValue,
              lastModified: new Date().toISOString().split("T")[0],
            };
          }
          return collection;
        })
      );

      toast.success(
        `Successfully imported ${importedCards.length} cards to your collection!`
      );
    }
  };

  if (!isLoggedIn) {
    return (
      <AppLayout>
        <LoginPrompt />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <div>
            <PageTitle>TCG Card Collection</PageTitle>
            <PageDescription>
              Manage and track your physical card collection
            </PageDescription>
          </div>
          <HeaderActions>
            <TabSelector>
              <TabButton
                active={activeTab === "collections"}
                onClick={() => setActiveTab("collections")}
              >
                <Database size={16} />
                Collections
              </TabButton>
              <TabButton
                active={activeTab === "targets"}
                onClick={() => setActiveTab("targets")}
              >
                <Target size={16} />
                Targets
              </TabButton>
            </TabSelector>

            {activeTab === "collections" && (
              <>
                <ViewToggle>
                  <ToggleButton
                    active={viewMode === "grid"}
                    onClick={() => setViewMode("grid")}
                    title="Grid View"
                  >
                    <Grid size={18} />
                  </ToggleButton>
                  <ToggleButton
                    active={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                    title="List View"
                  >
                    <List size={18} />
                  </ToggleButton>
                </ViewToggle>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreateCollection}
                  icon={<PlusCircle size={16} />}
                >
                  New Collection
                </Button>
              </>
            )}

            {activeTab === "targets" && (
              <Button
                variant="primary"
                size="md"
                onClick={handleCreateTarget}
                icon={<PlusCircle size={16} />}
              >
                New Target
              </Button>
            )}
          </HeaderActions>
        </PageHeader>

        {activeTab === "collections" ? (
          <ContentWrapper>
            <CollectionSidebar
              collections={collections}
              activeCollectionId={activeCollection}
              onSelectCollection={handleCollectionSelect}
              onCreateCollection={handleCreateCollection}
              isLoading={isLoading}
            />

            <MainContent>
              {isLoading ? (
                <LoadingState>Loading your collection...</LoadingState>
              ) : activeCollection ? (
                <>
                  <CollectionHeader>
                    <div>
                      <h2>
                        {
                          collections.find((c) => c.id === activeCollection)
                            ?.name
                        }
                      </h2>
                      <CollectionStats>
                        <StatItem>{cards.length} cards</StatItem>
                        {collections.find((c) => c.id === activeCollection)
                          ?.value && (
                          <StatItem>
                            $
                            {collections
                              .find((c) => c.id === activeCollection)
                              ?.value?.toFixed(2)}{" "}
                            estimated value
                          </StatItem>
                        )}
                      </CollectionStats>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <CollectionImportExport
                        collections={collections}
                        activeCollection={
                          collections.find((c) => c.id === activeCollection) ||
                          null
                        }
                        cards={cards}
                        onImportCards={handleImportCards}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Filter size={14} />}
                        style={{ marginRight: "8px" }}
                      >
                        Filter
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Save size={14} />}
                      >
                        Save
                      </Button>
                    </div>
                  </CollectionHeader>

                  <CardCollectionGrid cards={cards} viewMode={viewMode} />
                </>
              ) : (
                <EmptyCollectionState
                  onCreateCollection={handleCreateCollection}
                />
              )}
            </MainContent>
          </ContentWrapper>
        ) : (
          <TargetsWrapper>
            <CollectionTargets
              targets={targets}
              onCreateTarget={handleCreateTarget}
              onViewTarget={handleViewTargetDetails}
            />
          </TargetsWrapper>
        )}
      </PageContainer>

      <CreateTargetDialog
        isOpen={isCreateTargetOpen}
        onClose={() => setIsCreateTargetOpen(false)}
        onSave={handleSaveTarget}
      />
    </AppLayout>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
  min-height: calc(100vh - 64px - 300px); // Account for header and footer
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

const PageTitle = styled.h1`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size["2xl"]};
`;

const PageDescription = styled.p`
  margin: ${theme.spacing.xs} 0 0;
  color: ${theme.colors.text.secondary};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;
`;

const ContentWrapper = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  min-height: 600px;
`;

const TargetsWrapper = styled.div`
  min-height: 600px;
`;

const MainContent = styled.div`
  flex: 1;
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.sm};
  padding: ${theme.spacing.lg};
`;

const CollectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.lg};

  h2 {
    margin: 0 0 ${theme.spacing.xs} 0;
    font-size: ${theme.typography.size.xl};
  }
`;

const CollectionStats = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
`;

const StatItem = styled.span`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

const ViewToggle = styled.div`
  display: flex;
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
`;

const ToggleButton = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) =>
    props.active ? theme.colors.primary.main : theme.colors.background.paper};
  color: ${(props) =>
    props.active ? theme.colors.text.inverse : theme.colors.text.secondary};
  border: none;
  padding: ${theme.spacing.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.active ? theme.colors.primary.dark : theme.colors.background.hover};
  }
`;

const TabSelector = styled.div`
  display: flex;
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
`;

const TabButton = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${(props) =>
    props.active ? theme.colors.primary.main : theme.colors.background.paper};
  color: ${(props) =>
    props.active ? theme.colors.text.inverse : theme.colors.text.secondary};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.active ? theme.colors.primary.dark : theme.colors.background.hover};
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: ${theme.colors.text.secondary};
`;

export default CardCollectionPage;
