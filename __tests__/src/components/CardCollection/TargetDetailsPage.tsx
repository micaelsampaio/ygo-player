import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
  ArrowLeft,
  Filter,
  Download,
  List,
  Grid,
  CheckCircle,
  Circle,
  Loader,
  Edit3,
} from "lucide-react";
import theme from "../../styles/theme";
import { Button } from "../UI";
import AppLayout from "../Layout/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { isUserLoggedIn } from "../../utils/token-utils";

interface CardItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  set: string;
  setCode?: string;
  condition?: string;
  quantity?: number;
  acquired: boolean;
}

interface TargetDetails {
  id: string;
  name: string;
  type: "set" | "deck";
  description: string;
  progress: number;
  total: number;
  targetType: "one_of_each" | "playset" | "rare_only" | "custom";
  createdAt: string;
  lastUpdated: string;
  cards: CardItem[];
}

const TargetDetailsPage: React.FC = () => {
  const { targetId } = useParams<{ targetId: string }>();
  const navigate = useNavigate();
  const [target, setTarget] = useState<TargetDetails | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterMode, setFilterMode] = useState<"all" | "acquired" | "missing">(
    "all"
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isUserLoggedIn()) {
      // Redirect to login prompt
      navigate("/my/cards/collection");
      return;
    }

    // Simulate loading target data
    setIsLoading(true);

    // This would be an API call in a real implementation
    setTimeout(() => {
      // Sample data
      const sampleTarget: TargetDetails = {
        id: targetId || "target-1",
        name: "Legend of Blue Eyes White Dragon",
        type: "set",
        description: "Complete playsets of LOB",
        progress: 42,
        total: 126,
        targetType: "playset",
        createdAt: "2025-03-15",
        lastUpdated: "2025-05-10",
        cards: Array(60)
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
            set: "Legend of Blue Eyes White Dragon",
            setCode: "LOB",
            acquired: Math.random() > 0.3, // 70% chance of card being acquired
            quantity: Math.floor(Math.random() * 3) + 1,
          })),
      };

      setTarget(sampleTarget);
      setIsLoading(false);
    }, 800);
  }, [targetId, navigate]);

  const getDisplayCards = () => {
    if (!target) return [];

    return target.cards.filter((card) => {
      if (filterMode === "all") return true;
      if (filterMode === "acquired") return card.acquired;
      if (filterMode === "missing") return !card.acquired;
      return true;
    });
  };

  const handleCardToggle = (cardId: string) => {
    if (!target) return;

    const updatedCards = target.cards.map((card) => {
      if (card.id === cardId) {
        return { ...card, acquired: !card.acquired };
      }
      return card;
    });

    const acquiredCount = updatedCards.filter((card) => card.acquired).length;

    setTarget({
      ...target,
      cards: updatedCards,
      progress: acquiredCount,
      lastUpdated: new Date().toISOString().split("T")[0],
    });
  };

  const toggleFilterMode = (mode: "all" | "acquired" | "missing") => {
    setFilterMode(mode);
  };

  const displayCards = getDisplayCards();

  if (!target) {
    return (
      <AppLayout>
        {isLoading ? (
          <LoadingContainer>
            <Loader size={48} className="animate-spin" />
            <LoadingText>Loading target details...</LoadingText>
          </LoadingContainer>
        ) : (
          <ErrorContainer>
            <h2>Target not found</h2>
            <p>
              The collection target you're looking for doesn't exist or was
              deleted.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate("/my/cards/collection")}
            >
              Return to Collections
            </Button>
          </ErrorContainer>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container>
        <BackButton onClick={() => navigate("/my/cards/collection")}>
          <ArrowLeft size={18} />
          <span>Back to Collections</span>
        </BackButton>

        <Header>
          <div>
            <TargetType>
              {target.type === "set" ? "Card Set Target" : "Deck Target"}
            </TargetType>
            <PageTitle>{target.name}</PageTitle>
            <TargetDescription>{target.description}</TargetDescription>
          </div>

          <ActionButtons>
            <Button variant="secondary" size="sm" icon={<Edit3 size={16} />}>
              Edit Target
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={16} />}>
              Export
            </Button>
          </ActionButtons>
        </Header>

        <ProgressSection>
          <ProgressInfo>
            <ProgressStats>
              <StatsItem>
                <StatsLabel>Progress</StatsLabel>
                <StatsValue>
                  {target.progress} / {target.total} cards
                </StatsValue>
              </StatsItem>
              <StatsItem>
                <StatsLabel>Completion</StatsLabel>
                <StatsValue>
                  {Math.round((target.progress / target.total) * 100)}%
                </StatsValue>
              </StatsItem>
              <StatsItem>
                <StatsLabel>Target Type</StatsLabel>
                <StatsValue>
                  {target.targetType === "one_of_each" && "One of each"}
                  {target.targetType === "playset" && "Playset (3x)"}
                  {target.targetType === "rare_only" && "Rare cards only"}
                  {target.targetType === "custom" && "Custom selection"}
                </StatsValue>
              </StatsItem>
              <StatsItem>
                <StatsLabel>Last Updated</StatsLabel>
                <StatsValue>{target.lastUpdated}</StatsValue>
              </StatsItem>
            </ProgressStats>

            <ProgressBar>
              <ProgressFill
                percentage={(target.progress / target.total) * 100}
              />
            </ProgressBar>
          </ProgressInfo>
        </ProgressSection>

        <ControlsSection>
          <FilterButtons>
            <FilterButton
              active={filterMode === "all"}
              onClick={() => toggleFilterMode("all")}
            >
              All Cards
            </FilterButton>
            <FilterButton
              active={filterMode === "acquired"}
              onClick={() => toggleFilterMode("acquired")}
            >
              Acquired
            </FilterButton>
            <FilterButton
              active={filterMode === "missing"}
              onClick={() => toggleFilterMode("missing")}
            >
              Missing
            </FilterButton>
          </FilterButtons>

          <ViewControls>
            <Button
              variant="secondary"
              size="sm"
              icon={<Filter size={14} />}
              style={{ marginRight: "8px" }}
            >
              Filter
            </Button>

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
          </ViewControls>
        </ControlsSection>

        {displayCards.length === 0 ? (
          <EmptyState>
            <p>No cards match your current filter.</p>
          </EmptyState>
        ) : (
          <>
            {viewMode === "grid" ? (
              <CardGrid>
                {displayCards.map((card) => (
                  <CardGridItem
                    key={card.id}
                    onClick={() => handleCardToggle(card.id)}
                  >
                    <CardImageContainer>
                      <CardImage src={card.imageUrl} alt={card.name} />
                      <AcquiredStatus acquired={card.acquired}>
                        {card.acquired ? (
                          <CheckCircle size={24} />
                        ) : (
                          <Circle size={24} />
                        )}
                      </AcquiredStatus>
                    </CardImageContainer>
                    <CardInfo>
                      <CardName>{card.name}</CardName>
                      <CardMeta>
                        <RarityBadge rarity={card.rarity}>
                          {card.rarity}
                        </RarityBadge>
                        {card.acquired && card.quantity && (
                          <QuantityBadge>{card.quantity}x</QuantityBadge>
                        )}
                      </CardMeta>
                    </CardInfo>
                  </CardGridItem>
                ))}
              </CardGrid>
            ) : (
              <CardList>
                <ListHeader>
                  <HeaderCell width="40px"></HeaderCell>
                  <HeaderCell width="60px"></HeaderCell>
                  <HeaderCell flex={1}>Card Name</HeaderCell>
                  <HeaderCell width="120px">Rarity</HeaderCell>
                  <HeaderCell width="80px">Status</HeaderCell>
                  <HeaderCell width="80px">Quantity</HeaderCell>
                </ListHeader>
                {displayCards.map((card) => (
                  <ListRow
                    key={card.id}
                    onClick={() => handleCardToggle(card.id)}
                  >
                    <Cell width="40px">
                      <StatusIcon acquired={card.acquired}>
                        {card.acquired ? (
                          <CheckCircle size={18} />
                        ) : (
                          <Circle size={18} />
                        )}
                      </StatusIcon>
                    </Cell>
                    <Cell width="60px">
                      <SmallCardImage src={card.imageUrl} alt={card.name} />
                    </Cell>
                    <Cell flex={1}>{card.name}</Cell>
                    <Cell width="120px">
                      <RarityBadge rarity={card.rarity}>
                        {card.rarity}
                      </RarityBadge>
                    </Cell>
                    <Cell width="80px">
                      <StatusText acquired={card.acquired}>
                        {card.acquired ? "Acquired" : "Missing"}
                      </StatusText>
                    </Cell>
                    <Cell width="80px">
                      {card.acquired ? `${card.quantity}x` : "-"}
                    </Cell>
                  </ListRow>
                ))}
              </CardList>
            )}
          </>
        )}
      </Container>
    </AppLayout>
  );
};

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.md};
  padding: ${theme.spacing.sm} 0;
  cursor: pointer;
  margin-bottom: ${theme.spacing.md};

  &:hover {
    color: ${theme.colors.primary.main};
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.lg};
`;

const TargetType = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.primary.main};
  font-weight: ${theme.typography.weight.medium};
  margin-bottom: ${theme.spacing.xs};
`;

const PageTitle = styled.h1`
  margin: 0 0 ${theme.spacing.xs} 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size["2xl"]};
`;

const TargetDescription = styled.p`
  color: ${theme.colors.text.secondary};
  margin: 0;
  max-width: 600px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const ProgressSection = styled.div`
  margin-bottom: ${theme.spacing.xl};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.sm};
`;

const ProgressInfo = styled.div``;

const ProgressStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.md};
`;

const StatsItem = styled.div`
  min-width: 140px;
`;

const StatsLabel = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  margin-bottom: 2px;
`;

const StatsValue = styled.div`
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.semibold};
  color: ${theme.colors.text.primary};
`;

const ProgressBar = styled.div`
  height: 10px;
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

const ControlsSection = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.lg};
`;

const FilterButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const FilterButton = styled.button<{ active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${(props) =>
    props.active ? theme.colors.primary.main : "transparent"};
  color: ${(props) =>
    props.active ? theme.colors.text.inverse : theme.colors.text.secondary};
  border: 1px solid
    ${(props) =>
      props.active ? theme.colors.primary.main : theme.colors.border.main};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.size.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.active ? theme.colors.primary.main : theme.colors.background.hover};
    border-color: ${(props) =>
      props.active ? theme.colors.primary.main : theme.colors.primary.main};
  }
`;

const ViewControls = styled.div`
  display: flex;
  align-items: center;
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

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: ${theme.spacing.md};
`;

const CardGridItem = styled.div`
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${theme.shadows.md};
  }
`;

const CardImageContainer = styled.div`
  position: relative;
  padding-top: 140%;
  border-radius: ${theme.borderRadius.md} ${theme.borderRadius.md} 0 0;
  overflow: hidden;
`;

const CardImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
`;

const AcquiredStatus = styled.div<{ acquired: boolean }>`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${(props) =>
    props.acquired ? "rgba(0, 200, 83, 0.9)" : "rgba(255, 255, 255, 0.9)"};
  color: ${(props) => (props.acquired ? "#fff" : theme.colors.text.secondary)};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const CardInfo = styled.div`
  padding: ${theme.spacing.sm};
  background: ${theme.colors.background.paper};
  border: 1px solid ${theme.colors.border.light};
  border-top: none;
  border-radius: 0 0 ${theme.borderRadius.md} ${theme.borderRadius.md};
`;

const CardName = styled.div`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.xs};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: ${theme.typography.size.sm};
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const RarityBadge = styled.span<{ rarity: string }>`
  font-size: ${theme.typography.size.xs};
  padding: 1px 6px;
  border-radius: ${theme.borderRadius.sm};
  background: ${(props) => {
    switch (props.rarity) {
      case "Common":
        return "#f0f0f0";
      case "Rare":
        return "#a0cfff";
      case "Super Rare":
        return "#95ff95";
      case "Ultra Rare":
        return "#ffdf95";
      case "Secret Rare":
        return "#ff9e9e";
      default:
        return "#f0f0f0";
    }
  }};
  color: ${(props) => {
    switch (props.rarity) {
      case "Common":
        return theme.colors.text.secondary;
      default:
        return "rgba(0, 0, 0, 0.7)";
    }
  }};
`;

const QuantityBadge = styled.span`
  font-size: ${theme.typography.size.xs};
  background: ${theme.colors.background.default};
  padding: 1px 6px;
  border-radius: ${theme.borderRadius.sm};
  color: ${theme.colors.text.secondary};
`;

const CardList = styled.div`
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
`;

const ListHeader = styled.div`
  display: flex;
  background: ${theme.colors.background.default};
  border-bottom: 1px solid ${theme.colors.border.light};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.secondary};
`;

const ListRow = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.border.light};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.typography.size.sm};
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${theme.colors.background.hover};
  }
`;

const HeaderCell = styled.div<{ width?: string; flex?: number }>`
  ${(props) => (props.width ? `width: ${props.width};` : "")}
  ${(props) => (props.flex ? `flex: ${props.flex};` : "")}
  padding: 0 ${theme.spacing.xs};
  display: flex;
  align-items: center;
`;

const Cell = styled.div<{ width?: string; flex?: number }>`
  ${(props) => (props.width ? `width: ${props.width};` : "")}
  ${(props) => (props.flex ? `flex: ${props.flex};` : "")}
  padding: 0 ${theme.spacing.xs};
  display: flex;
  align-items: center;
  color: ${theme.colors.text.primary};
`;

const SmallCardImage = styled.img`
  width: 40px;
  height: 56px;
  object-fit: cover;
  border-radius: ${theme.borderRadius.sm};
`;

const StatusIcon = styled.div<{ acquired: boolean }>`
  color: ${(props) =>
    props.acquired ? theme.colors.success.main : theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatusText = styled.span<{ acquired: boolean }>`
  color: ${(props) =>
    props.acquired ? theme.colors.success.main : theme.colors.warning.main};
  font-weight: ${theme.typography.weight.medium};
  font-size: ${theme.typography.size.xs};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: ${theme.spacing.md};
  color: ${theme.colors.text.secondary};
`;

const LoadingText = styled.div`
  font-size: ${theme.typography.size.lg};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl} 0;

  h2 {
    color: ${theme.colors.text.primary};
    margin-bottom: ${theme.spacing.md};
  }

  p {
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing.lg};
  }
`;

const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  padding: ${theme.spacing.xl} 0;
  color: ${theme.colors.text.secondary};
`;

export default TargetDetailsPage;
