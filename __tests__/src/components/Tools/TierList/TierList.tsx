import React, { useState, useCallback } from "react";
import styled from "styled-components";
import theme from "../../../styles/theme";
import AppLayout from "../../Layout/AppLayout";
import { Card, Button } from "../../UI";
import { CardArtZoom } from "../../shared/CardArtZoom";
import SearchPanel from "../../DeckBuilder/components/Search/SearchPanel";
import { Card as CardType } from "../../DeckBuilder/types";
import { getCardImageUrl } from "../../../utils/cardImages";

// Define tier levels with their colors
const tierLevels = [
  { id: "S", color: "#FF5252", label: "S Tier" }, // Red
  { id: "A", color: "#FF9800", label: "A Tier" }, // Orange
  { id: "B", color: "#FFEB3B", label: "B Tier" }, // Yellow
  { id: "C", color: "#4CAF50", label: "C Tier" }, // Green
  { id: "D", color: "#2196F3", label: "D Tier" }, // Blue
  { id: "F", color: "#9C27B0", label: "F Tier" }, // Purple
];

interface TierCard extends CardType {
  tierId?: string;
}

interface TierAssignments {
  [key: string]: TierCard[];
}

const TierList: React.FC = () => {
  // State for tracking the view mode (full card or art only)
  const [showArtOnly, setShowArtOnly] = useState(true);

  // State for tier assignments - cards organized by tier
  const [tierAssignments, setTierAssignments] = useState<TierAssignments>(() =>
    tierLevels.reduce((acc, tier) => {
      acc[tier.id] = [];
      return acc;
    }, {} as TierAssignments)
  );

  // State for selected card from search
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  // Handle assigning a card to a tier
  const assignCardToTier = useCallback(
    (card: CardType, tierId: string) => {
      // First, remove the card from any tier it might be in
      const updatedAssignments = { ...tierAssignments };

      // Check all tiers to find and remove the card
      Object.keys(updatedAssignments).forEach((tier) => {
        updatedAssignments[tier] = updatedAssignments[tier].filter(
          (c) => c.id !== card.id
        );
      });

      // Add card to the selected tier
      updatedAssignments[tierId] = [
        ...updatedAssignments[tierId],
        { ...card, tierId },
      ];
      setTierAssignments(updatedAssignments);
    },
    [tierAssignments]
  );

  // Handle removing a card from a tier
  const removeCardFromTier = useCallback((card: TierCard, tierId: string) => {
    setTierAssignments((prev) => ({
      ...prev,
      [tierId]: prev[tierId].filter((c) => c.id !== card.id),
    }));
  }, []);

  // Handle selecting a card from search
  const handleCardSelect = (card: CardType) => {
    setSelectedCard(card);
  };

  // Handle adding a card to the tier list
  const handleCardAdd = (card: CardType) => {
    // Default behavior: Add to S tier when directly added
    assignCardToTier(card, "S");
  };

  // Handle toggle favorite (empty implementation, required by SearchPanel)
  const handleToggleFavorite = () => {};

  // Clear all tier assignments and reset
  const resetTierList = () => {
    setTierAssignments(
      tierLevels.reduce((acc, tier) => {
        acc[tier.id] = [];
        return acc;
      }, {} as TierAssignments)
    );
  };

  // Toggle between full card view and art-only view
  const toggleViewMode = () => {
    setShowArtOnly(!showArtOnly);
  };

  // Export as image functionality (placeholder)
  const exportAsImage = () => {
    alert("Export functionality would be implemented here");
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>Yu-Gi-Oh! Tier List Maker</h1>
          <p>Create and organize card tier lists</p>
        </PageHeader>

        <ContentSection>
          {/* View Mode Toggle */}
          <ViewModeToggle>
            <ViewModeLabel>View Mode:</ViewModeLabel>
            <ViewModeButton
              onClick={toggleViewMode}
              variant={showArtOnly ? "primary" : "tertiary"}
            >
              {showArtOnly ? "Card Art Only" : "Full Card"}
            </ViewModeButton>
          </ViewModeToggle>

          {/* Tier List Display */}
          <TierListContainer>
            {tierLevels.map((tier) => (
              <TierRow key={tier.id}>
                <TierLabel style={{ backgroundColor: tier.color }}>
                  {tier.id}
                </TierLabel>
                <TierCardsContainer>
                  {tierAssignments[tier.id].map((card) => (
                    <CardItem
                      key={card.id}
                      onClick={() => removeCardFromTier(card, tier.id)}
                    >
                      {showArtOnly ? (
                        <CardArtZoom cardId={card.id} size={80} />
                      ) : (
                        <CardImage
                          src={getCardImageUrl(card, "small")}
                          alt={card.name || `Card #${card.id}`}
                        />
                      )}
                    </CardItem>
                  ))}
                </TierCardsContainer>
              </TierRow>
            ))}
          </TierListContainer>

          {/* Action Buttons */}
          <ActionsBar>
            <Button onClick={resetTierList} variant="tertiary">
              Reset Tier List
            </Button>
            <Button onClick={exportAsImage} variant="primary">
              Export as Image
            </Button>
          </ActionsBar>

          {/* Card Selection Section */}
          <CardSelectionSection>
            <Card elevation="low">
              <Card.Content>
                <h2>Search Cards</h2>
                <SearchPanel
                  onCardSelect={handleCardSelect}
                  onCardAdd={handleCardAdd}
                  onToggleFavorite={handleToggleFavorite}
                />

                {selectedCard && (
                  <SelectedCardSection>
                    <h3>Selected Card</h3>
                    <SelectedCardContainer>
                      <SelectedCardImage>
                        {showArtOnly ? (
                          <CardArtZoom cardId={selectedCard.id} size={120} />
                        ) : (
                          <CardImage
                            src={getCardImageUrl(selectedCard, "small")}
                            alt={
                              selectedCard.name || `Card #${selectedCard.id}`
                            }
                          />
                        )}
                      </SelectedCardImage>
                      <SelectedCardDetails>
                        <CardName>{selectedCard.name}</CardName>
                        <TierButtons>
                          {tierLevels.map((tier) => (
                            <TierButton
                              key={tier.id}
                              style={{ backgroundColor: tier.color }}
                              onClick={() =>
                                assignCardToTier(selectedCard, tier.id)
                              }
                            >
                              {tier.id}
                            </TierButton>
                          ))}
                        </TierButtons>
                      </SelectedCardDetails>
                    </SelectedCardContainer>
                  </SelectedCardSection>
                )}
              </Card.Content>
            </Card>
          </CardSelectionSection>
        </ContentSection>
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
  text-align: center;
  margin-bottom: ${theme.spacing.xl};

  h1 {
    margin-bottom: ${theme.spacing.sm};
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["2xl"]};
  }

  p {
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.size.lg};
  }
`;

const ContentSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const ViewModeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  align-self: flex-end;
`;

const ViewModeLabel = styled.span`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.md};
`;

const ViewModeButton = styled(Button)`
  min-width: 120px;
`;

const TierListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const TierRow = styled.div`
  display: flex;
  height: 120px;
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  border: 1px solid ${theme.colors.border.light};
`;

const TierLabel = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  font-size: 24px;
  font-weight: ${theme.typography.weight.bold};
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

const TierCardsContainer = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  background-color: ${theme.colors.background.paper};
  overflow-y: auto;
`;

const CardItem = styled.div`
  width: 80px;
  height: 116px;
  cursor: pointer;
  transition: transform 0.2s;
  border-radius: ${theme.borderRadius.sm};
  overflow: hidden;
  box-shadow: ${theme.shadows.sm};

  &:hover {
    transform: scale(1.1);
    box-shadow: ${theme.shadows.md};
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ActionsBar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
`;

const CardSelectionSection = styled.div``;

const CardName = styled.span`
  font-size: ${theme.typography.size.sm};
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.primary};
  text-align: center;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: ${theme.spacing.xs};
`;

const TierButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  margin-top: ${theme.spacing.xs};
`;

const TierButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  font-weight: ${theme.typography.weight.bold};
  color: white;
  cursor: pointer;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.1);
  }
`;

const SelectedCardSection = styled.div`
  margin-top: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.border.light};
  padding-top: ${theme.spacing.md};
`;

const SelectedCardContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
`;

const SelectedCardImage = styled.div`
  width: 120px;
  flex-shrink: 0;
`;

const SelectedCardDetails = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  align-items: center;
`;

export default TierList;
