import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
  Target,
  Check,
  ArrowRight,
  Plus,
  Edit3,
  Trash2,
  ListChecks,
  BookOpen,
} from "lucide-react";
import theme from "../../styles/theme";
import { Button, Card as UICard } from "../UI";
import short from "short-uuid";

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
  deckId?: string; // Add deckId for deck targets
}

interface CollectionTargetsProps {
  onCreateTarget?: () => void;
}

const CollectionTargets: React.FC<CollectionTargetsProps> = ({
  onCreateTarget,
}) => {
  const [targets, setTargets] = useState<CollectionTarget[]>([]);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [selectedTargetType, setSelectedTargetType] = useState<"set" | "deck">(
    "set"
  );

  // Add a function to get the user's collection
  const getUserCollection = (): Record<string, number> => {
    const collectionData = localStorage.getItem("card_collection");
    return collectionData ? JSON.parse(collectionData) : {};
  };

  // Add a function to update progress for all targets
  const updateTargetsProgress = () => {
    const userCollection = getUserCollection();

    const updatedTargets = targets.map((target) => {
      if (target.type === "deck" && target.deckId) {
        // For deck targets, check each card in the deck against user's collection
        const deckData = JSON.parse(
          localStorage.getItem(target.deckId) || "{}"
        );
        const mainDeck = deckData.mainDeck || [];
        const extraDeck = deckData.extraDeck || [];
        const allDeckCards = [...mainDeck, ...extraDeck];

        let collectedCount = 0;

        // Count based on target type
        if (target.targetType === "one_of_each") {
          // Count unique card IDs that are in both the deck and collection
          const uniqueCardIds = new Set(allDeckCards.map((card) => card.id));
          uniqueCardIds.forEach((cardId) => {
            if (userCollection[cardId] && userCollection[cardId] > 0) {
              collectedCount++;
            }
          });
        } else if (target.targetType === "playset") {
          // For each card, check if user has 3 copies
          const cardCounts: Record<string, number> = {};
          allDeckCards.forEach((card) => {
            cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;
          });

          Object.entries(cardCounts).forEach(([cardId, neededCount]) => {
            const userHas = userCollection[cardId] || 0;
            const playsetCount = Math.min(neededCount, 3); // Playset is 3 of each card max
            if (userHas >= playsetCount) {
              collectedCount += playsetCount;
            } else {
              collectedCount += userHas;
            }
          });
        } else if (target.targetType === "rare_only") {
          // Count only rare cards (we'd need rarity information here)
          // For now, assume all cards are counted
          allDeckCards.forEach((card) => {
            const cardId = card.id;
            if (userCollection[cardId] && userCollection[cardId] > 0) {
              collectedCount++;
            }
          });
        } else {
          // Custom or default: count each card instance
          allDeckCards.forEach((card) => {
            const cardId = card.id;
            if (userCollection[cardId] && userCollection[cardId] > 0) {
              collectedCount++;
            }
          });
        }

        return {
          ...target,
          progress: collectedCount,
          lastUpdated: new Date().toISOString().split("T")[0],
        };
      } else {
        // Set targets or other types - simple logic, can be enhanced later
        // Placeholder: right now, we're just returning the same progress
        return target;
      }
    });

    setTargets(updatedTargets);
    localStorage.setItem(
      "cardCollectionTargets",
      JSON.stringify(updatedTargets)
    );
  };

  useEffect(() => {
    const storedTargets = localStorage.getItem("cardCollectionTargets");
    if (storedTargets) {
      setTargets(JSON.parse(storedTargets));
    }
  }, []);

  useEffect(() => {
    if (targets.length > 0) {
      localStorage.setItem("cardCollectionTargets", JSON.stringify(targets));
    }

    // When targets are loaded, update their progress
    updateTargetsProgress();
  }, [targets.length]); // Only run when targets array length changes

  // Set up a listener for collection changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "card_collection") {
        updateTargetsProgress();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [targets]); // Re-add listener when targets change

  const openCreationModal = () => {
    setShowCreationModal(true);
    if (onCreateTarget) onCreateTarget();
  };

  const closeCreationModal = () => {
    setShowCreationModal(false);
  };

  const createTarget = (
    targetData: Omit<
      CollectionTarget,
      "id" | "createdAt" | "lastUpdated" | "progress"
    >
  ) => {
    const currentDate = new Date().toISOString().split("T")[0];

    const newTarget: CollectionTarget = {
      id: `target-${short.generate()}`,
      name: targetData.name,
      type: targetData.type,
      description: targetData.description || "",
      progress: 0,
      total: targetData.total,
      targetType: targetData.targetType,
      createdAt: currentDate,
      lastUpdated: currentDate,
      deckId: targetData.deckId, // Include deckId for deck targets
    };

    setTargets([...targets, newTarget]);
    closeCreationModal();
  };

  const handleDeleteTarget = (id: string) => {
    if (window.confirm("Are you sure you want to delete this target?")) {
      const updatedTargets = targets.filter((target) => target.id !== id);
      setTargets(updatedTargets);

      if (updatedTargets.length === 0) {
        localStorage.removeItem("cardCollectionTargets");
      }
    }
  };

  const getTargetTypeLabel = (type: string): string => {
    switch (type) {
      case "one_of_each":
        return "One of each card";
      case "playset":
        return "Three of each card";
      case "rare_only":
        return "Rare cards only";
      case "custom":
        return "Custom selection";
      default:
        return type;
    }
  };

  const getTargetIcon = (type: string) => {
    if (type === "set") {
      return <BookOpen size={20} />;
    }
    return <ListChecks size={20} />;
  };

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <Target size={20} />
          <h2>Collection Targets</h2>
        </HeaderTitle>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={openCreationModal}
        >
          New Target
        </Button>
      </Header>
      <Description>
        Track your progress toward completing sets or decks. Set custom goals
        like collecting one of each card, full playsets, or just the rare cards.
      </Description>

      <TargetsList>
        {targets.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <Target size={48} />
            </EmptyIcon>
            <EmptyText>No collection targets yet</EmptyText>
            <EmptySubtext>
              Click "New Target" to start tracking your collection goals
            </EmptySubtext>
          </EmptyState>
        ) : (
          targets.map((target) => (
            <TargetCard key={target.id}>
              <TargetHeader>
                <TargetTypeIcon type={target.type}>
                  {getTargetIcon(target.type)}
                </TargetTypeIcon>
                <TargetInfo>
                  <TargetName>{target.name}</TargetName>
                  <TargetType>
                    {target.type === "set" ? "Card Set" : "Deck"}
                  </TargetType>
                </TargetInfo>
                <TargetActions>
                  <IconButton title="Edit target">
                    <Edit3 size={16} />
                  </IconButton>
                  <IconButton
                    title="Delete target"
                    onClick={() => handleDeleteTarget(target.id)}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </TargetActions>
              </TargetHeader>

              <TargetDescription>{target.description}</TargetDescription>

              <TargetMeta>
                <TargetMetaItem>
                  <MetaLabel>Target Type:</MetaLabel>
                  <MetaValue>{getTargetTypeLabel(target.targetType)}</MetaValue>
                </TargetMetaItem>
                <TargetMetaItem>
                  <MetaLabel>Last Updated:</MetaLabel>
                  <MetaValue>{target.lastUpdated}</MetaValue>
                </TargetMetaItem>
              </TargetMeta>

              <ProgressContainer>
                <ProgressInfo>
                  <ProgressText>
                    <strong>{target.progress}</strong> of{" "}
                    <strong>{target.total}</strong> cards
                  </ProgressText>
                  <ProgressPercentage>
                    {Math.round((target.progress / target.total) * 100)}%
                  </ProgressPercentage>
                </ProgressInfo>
                <ProgressBar>
                  <ProgressFill
                    percentage={(target.progress / target.total) * 100}
                  />
                </ProgressBar>
              </ProgressContainer>

              <ViewDetailsButton>
                <span>View Details</span>
                <ArrowRight size={16} />
              </ViewDetailsButton>
            </TargetCard>
          ))
        )}

        <AddTargetCard onClick={openCreationModal}>
          <PlusIcon>
            <Plus size={24} />
          </PlusIcon>
          <AddTargetText>Add New Collection Target</AddTargetText>
          <AddTargetSubtext>
            Track your progress towards completing a set or deck
          </AddTargetSubtext>
        </AddTargetCard>
      </TargetsList>
    </Container>
  );
};

const Container = styled.div`
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  box-shadow: ${theme.shadows.sm};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  h2 {
    margin: 0;
    font-size: ${theme.typography.size.xl};
    color: ${theme.colors.text.primary};
  }
`;

const Description = styled.p`
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.lg};
  line-height: 1.5;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${theme.spacing.xl} 0;
  grid-column: 1 / -1;
`;

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${theme.colors.background.default};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.md};
`;

const EmptyText = styled.div`
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.sm};
`;

const EmptySubtext = styled.div`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
  max-width: 300px;
`;

const TargetsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${theme.spacing.lg};
`;

const TargetCard = styled(UICard.Content)`
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background.paper};
  padding: ${theme.spacing.md};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${theme.shadows.md};
  }
`;

const TargetHeader = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
`;

const TargetTypeIcon = styled.div<{ type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.md};
  background: ${(props) =>
    props.type === "set"
      ? `${theme.colors.primary.main}15`
      : `${theme.colors.secondary.main}15`};
  color: ${(props) =>
    props.type === "set"
      ? theme.colors.primary.main
      : theme.colors.secondary.main};
  flex-shrink: 0;
`;

const TargetInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TargetName = styled.div`
  font-weight: ${theme.typography.weight.semibold};
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
`;

const TargetType = styled.div`
  font-size: ${theme.typography.size.xs};
  color: ${theme.colors.text.secondary};
`;

const TargetActions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: ${theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: ${theme.colors.background.hover};
    color: ${theme.colors.primary.main};
  }
`;

const TargetDescription = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.md};
  flex-grow: 1;
`;

const TargetMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.md};
`;

const TargetMetaItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${theme.typography.size.xs};
`;

const MetaLabel = styled.span`
  color: ${theme.colors.text.secondary};
`;

const MetaValue = styled.span`
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.weight.medium};
`;

const ProgressContainer = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.xs};
  font-size: ${theme.typography.size.sm};
`;

const ProgressText = styled.div`
  color: ${theme.colors.text.secondary};

  strong {
    color: ${theme.colors.text.primary};
  }
`;

const ProgressPercentage = styled.div`
  color: ${theme.colors.primary.main};
  font-weight: ${theme.typography.weight.semibold};
`;

const ProgressBar = styled.div`
  height: 8px;
  background: ${theme.colors.background.default};
  border-radius: ${theme.borderRadius.full};
  overflow: hidden;
`;

const ProgressFill = styled.div<{ percentage: number }>`
  height: 100%;
  width: ${(props) => `${props.percentage}%`};
  background: ${theme.colors.primary.main};
  border-radius: ${theme.borderRadius.full};
  transition: width 0.3s ease;
`;

const ViewDetailsButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} 0;
  border: none;
  background: transparent;
  color: ${theme.colors.primary.main};
  font-size: ${theme.typography.size.sm};
  font-weight: ${theme.typography.weight.medium};
  width: 100%;
  cursor: pointer;
  border-radius: ${theme.borderRadius.md};
  transition: background-color 0.2s ease;

  &:hover {
    background: ${theme.colors.background.hover};
  }
`;

const AddTargetCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${theme.spacing.lg};
  border: 2px dashed ${theme.colors.border.main};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background.default};
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;

  &:hover {
    border-color: ${theme.colors.primary.main};
    background: ${theme.colors.background.hover};
  }
`;

const PlusIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${theme.colors.background.paper};
  color: ${theme.colors.primary.main};
  margin-bottom: ${theme.spacing.md};
`;

const AddTargetText = styled.div`
  font-weight: ${theme.typography.weight.medium};
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.xs};
`;

const AddTargetSubtext = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
`;

export default CollectionTargets;
