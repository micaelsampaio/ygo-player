import React, { useState } from "react";
import styled from "styled-components";
import AppLayout from "../Layout/AppLayout";
import SearchPanel from "../DeckBuilder/components/Search/SearchPanel";
import { Card as CardType } from "../DeckBuilder/types";
import theme from "../../styles/theme";
import Card from "../UI/Card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info, ExternalLink } from "lucide-react";
import { getCardImageUrl, getCardBackImageUrl } from "../../utils/cardImages";

const CardDatabasePage: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const navigate = useNavigate();

  // Handle card selection from the search panel
  const handleCardSelect = (card: CardType) => {
    setSelectedCard(card);
  };

  // Empty function for card add (not needed in card database)
  const handleCardAdd = () => {};

  // Empty function for favorite toggle (not implemented in this view)
  const handleToggleFavorite = () => {};

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <HeaderLeftSection>
            <BackButton onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </BackButton>
            <h1>Card Database</h1>
          </HeaderLeftSection>
          <HeaderRightSection>
            <InfoTip>
              <InfoIcon>
                <Info size={16} />
              </InfoIcon>
              <span>Browse and search for all Yu-Gi-Oh! cards</span>
            </InfoTip>
          </HeaderRightSection>
        </PageHeader>

        <MainContentContainer>
          <SearchPanelContainer>
            <Card>
              <Card.Content>
                <h3>Card Search</h3>
                <SearchPanel
                  onCardSelect={handleCardSelect}
                  onCardAdd={handleCardAdd}
                  onToggleFavorite={handleToggleFavorite}
                  hideAddToDeck={true}
                />
              </Card.Content>
            </Card>
          </SearchPanelContainer>

          <CardDetailsContainer>
            {selectedCard ? (
              <Card elevation="medium">
                <Card.Content>
                  <CardDetailsLayout>
                    <CardImageContainer>
                      <CardImage
                        src={
                          selectedCard.card_images?.[0]?.image_url ||
                          getCardImageUrl(selectedCard.id, "normal")
                        }
                        alt={selectedCard.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getCardBackImageUrl();
                        }}
                      />
                      <CardImageOverlay>
                        <ViewFullDetailsLink
                          href={`/card/${selectedCard.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/card/${selectedCard.id}`);
                          }}
                        >
                          <ExternalLink size={16} />
                          View Full Details
                        </ViewFullDetailsLink>
                      </CardImageOverlay>
                    </CardImageContainer>

                    <CardInfo>
                      <CardName>{selectedCard.name}</CardName>

                      <CardTypeText>
                        <CardTypeLabel>{selectedCard.type}</CardTypeLabel>
                        {selectedCard.race && (
                          <CardAttributeLabel>
                            {selectedCard.race}
                          </CardAttributeLabel>
                        )}
                        {selectedCard.attribute && (
                          <AttributeBadge attribute={selectedCard.attribute}>
                            {selectedCard.attribute}
                          </AttributeBadge>
                        )}
                      </CardTypeText>

                      {(selectedCard.atk !== undefined ||
                        selectedCard.def !== undefined ||
                        selectedCard.level) && (
                        <CardStats>
                          {selectedCard.level && (
                            <CardStatItem>
                              <CardStatLabel>Level</CardStatLabel>
                              <CardStatValue>
                                {selectedCard.level}
                              </CardStatValue>
                            </CardStatItem>
                          )}
                          {selectedCard.atk !== undefined && (
                            <CardStatItem>
                              <CardStatLabel>ATK</CardStatLabel>
                              <CardStatValue>{selectedCard.atk}</CardStatValue>
                            </CardStatItem>
                          )}
                          {selectedCard.def !== undefined && (
                            <CardStatItem>
                              <CardStatLabel>DEF</CardStatLabel>
                              <CardStatValue>{selectedCard.def}</CardStatValue>
                            </CardStatItem>
                          )}
                        </CardStats>
                      )}

                      <CardDescriptionContainer>
                        <CardDescriptionTitle>Card Text</CardDescriptionTitle>
                        <CardDescription>{selectedCard.desc}</CardDescription>
                      </CardDescriptionContainer>

                      {selectedCard.card_sets && (
                        <CardSets>
                          <CardSetsTitle>Appears In</CardSetsTitle>
                          <CardSetsList>
                            {selectedCard.card_sets
                              .slice(0, 5)
                              .map((set, index) => (
                                <CardSetItem key={index}>
                                  <CardSetName>{set.set_name}</CardSetName>
                                  <CardSetRarity>
                                    {set.set_rarity}
                                  </CardSetRarity>
                                </CardSetItem>
                              ))}
                            {selectedCard.card_sets.length > 5 && (
                              <CardSetItem>
                                <CardSetName>
                                  ...and {selectedCard.card_sets.length - 5}{" "}
                                  more sets
                                </CardSetName>
                              </CardSetItem>
                            )}
                          </CardSetsList>
                        </CardSets>
                      )}
                    </CardInfo>
                  </CardDetailsLayout>
                </Card.Content>
              </Card>
            ) : (
              <EmptyState>
                <EmptyStateIcon>🔍</EmptyStateIcon>
                <p>Select a card from the search panel to view details</p>
                <EmptyStateSubtext>
                  Search by name, type, attribute, or effect text
                </EmptyStateSubtext>
              </EmptyState>
            )}
          </CardDetailsContainer>
        </MainContentContainer>
      </PageContainer>
    </AppLayout>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 1800px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};

  h1 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["3xl"]};
  }
`;

const HeaderLeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const HeaderRightSection = styled.div`
  display: flex;
  align-items: center;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background.card};
  border: none;
  border-radius: ${theme.borderRadius.md};
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.background.dark};
    transform: translateX(-2px);
  }
`;

const InfoTip = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

const InfoIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.primary.main};
`;

const MainContentContainer = styled.div`
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: ${theme.spacing.lg};
  height: calc(100vh - 200px);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SearchPanelContainer = styled.div`
  max-height: 100%;
  overflow-y: auto;

  h3 {
    margin-top: 0;
    margin-bottom: ${theme.spacing.md};
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size.lg};
  }
`;

const CardDetailsContainer = styled.div`
  max-height: 100%;
  overflow-y: auto;
`;

const CardDetailsLayout = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: ${theme.spacing.xl};

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const CardImageContainer = styled.div`
  display: flex;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border-radius: ${theme.borderRadius.md};
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.02);
    box-shadow: ${theme.shadows.lg};

    & > div {
      opacity: 1;
    }
  }
`;

const CardImage = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
`;

const CardImageOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0) 100%
  );
  padding: ${theme.spacing.lg} ${theme.spacing.sm} ${theme.spacing.sm};
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  justify-content: center;
`;

const ViewFullDetailsLink = styled.a`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  color: white;
  text-decoration: none;
  font-size: ${theme.typography.size.sm};
  font-weight: ${theme.typography.weight.medium};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  background-color: rgba(255, 255, 255, 0.2);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
`;

const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const CardName = styled.h2`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size["2xl"]};
  border-bottom: 2px solid ${theme.colors.border.default};
  padding-bottom: ${theme.spacing.sm};
  animation: slideInRight 0.5s ease forwards;

  @keyframes slideInRight {
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

const CardTypeText = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  animation: fadeIn 0.5s ease forwards 0.2s;
  opacity: 0;

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`;

const CardTypeLabel = styled.span`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.secondary};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background-color: ${theme.colors.background.light};
  border-radius: ${theme.borderRadius.sm};
`;

const CardAttributeLabel = styled.span`
  color: ${theme.colors.text.secondary};
  font-weight: ${theme.typography.weight.medium};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background-color: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.sm};
`;

const AttributeBadge = styled.span<{ attribute: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-weight: ${theme.typography.weight.semibold};
  font-size: ${theme.typography.size.sm};
  color: white;
  background-color: ${({ attribute }) => {
    switch (attribute.toLowerCase()) {
      case "dark":
        return "#6c3c92";
      case "light":
        return "#FFBD00";
      case "earth":
        return "#8D5C38";
      case "water":
        return "#3498DB";
      case "fire":
        return "#E74C3C";
      case "wind":
        return "#2ECC71";
      case "divine":
        return "#FFD700";
      default:
        return theme.colors.primary.main;
    }
  }};
`;

const CardStats = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  color: ${theme.colors.text.secondary};
  animation: fadeIn 0.5s ease forwards 0.3s;
  opacity: 0;
`;

const CardStatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  background-color: ${theme.colors.background.light};
`;

const CardStatLabel = styled.span`
  font-size: ${theme.typography.size.xs};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xs};
`;

const CardStatValue = styled.span`
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.text.primary};
`;

const CardDescriptionContainer = styled.div`
  animation: fadeIn 0.5s ease forwards 0.4s;
  opacity: 0;
`;

const CardDescriptionTitle = styled.h4`
  margin: 0 0 ${theme.spacing.sm};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
  font-weight: ${theme.typography.weight.medium};
`;

const CardDescription = styled.p`
  white-space: pre-wrap;
  line-height: 1.6;
  color: ${theme.colors.text.primary};
  background-color: ${theme.colors.background.light};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border-left: 4px solid ${theme.colors.primary.main};
  max-height: 300px;
  overflow-y: auto;
  font-size: ${theme.typography.size.sm};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${theme.colors.background.paper};
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${theme.colors.border.default};
    border-radius: 20px;
  }
`;

const CardSets = styled.div`
  animation: fadeIn 0.5s ease forwards 0.5s;
  opacity: 0;
`;

const CardSetsTitle = styled.h4`
  margin: 0 0 ${theme.spacing.sm};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.md};
  font-weight: ${theme.typography.weight.medium};
`;

const CardSetsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const CardSetItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.background.light};

  &:nth-child(odd) {
    background-color: ${theme.colors.background.card};
  }
`;

const CardSetName = styled.span`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.primary};
`;

const CardSetRarity = styled.span`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.primary.main};
  font-weight: ${theme.typography.weight.medium};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: ${theme.colors.text.secondary};
  min-height: 300px;
  background-color: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xl};

  p {
    margin: ${theme.spacing.md} 0;
    font-size: ${theme.typography.size.lg};
  }
`;

const EmptyStateIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
`;

const EmptyStateSubtext = styled.p`
  color: ${theme.colors.text.tertiary};
  font-size: ${theme.typography.size.sm} !important;
`;

export default CardDatabasePage;
