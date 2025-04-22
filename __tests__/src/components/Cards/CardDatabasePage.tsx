import React, { useState } from "react";
import styled from "styled-components";
import AppLayout from "../Layout/AppLayout";
import SearchPanel from "../DeckBuilder/components/Search/SearchPanel";
import { Card as CardType } from "../DeckBuilder/types";
import theme from "../../styles/theme";
import Card from "../UI/Card";

const CardDatabasePage: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

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
          <h1>Card Database</h1>
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
              <Card elevation="low">
                <Card.Content>
                  <CardDetailsLayout>
                    <CardImageContainer>
                      <CardImage
                        src={
                          selectedCard.card_images?.[0]?.image_url ||
                          `https://images.ygoprodeck.com/images/cards/${selectedCard.id}.jpg`
                        }
                        alt={selectedCard.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src =
                            "https://images.ygoprodeck.com/images/cards_small/back_high.jpg";
                        }}
                      />
                    </CardImageContainer>

                    <CardInfo>
                      <CardName>{selectedCard.name}</CardName>

                      <CardTypeText>
                        [{selectedCard.type}]
                        {selectedCard.race && ` / ${selectedCard.race}`}
                        {selectedCard.attribute &&
                          ` / ${selectedCard.attribute}`}
                      </CardTypeText>

                      {(selectedCard.atk !== undefined ||
                        selectedCard.def !== undefined) && (
                        <CardStats>
                          {selectedCard.level && (
                            <span>Level: {selectedCard.level}</span>
                          )}
                          {selectedCard.atk !== undefined && (
                            <span>ATK: {selectedCard.atk}</span>
                          )}
                          {selectedCard.def !== undefined && (
                            <span>DEF: {selectedCard.def}</span>
                          )}
                        </CardStats>
                      )}

                      <CardDescription>{selectedCard.desc}</CardDescription>

                      {selectedCard.card_sets && (
                        <CardSets>
                          <h4>Card Sets</h4>
                          <ul>
                            {selectedCard.card_sets
                              .slice(0, 5)
                              .map((set, index) => (
                                <li key={index}>
                                  {set.set_name} ({set.set_rarity})
                                </li>
                              ))}
                            {selectedCard.card_sets.length > 5 && (
                              <li>
                                ...and {selectedCard.card_sets.length - 5} more
                                sets
                              </li>
                            )}
                          </ul>
                        </CardSets>
                      )}
                    </CardInfo>
                  </CardDetailsLayout>
                </Card.Content>
              </Card>
            ) : (
              <EmptyState>
                <p>Select a card from the search panel to view details</p>
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
  grid-template-columns: 300px 1fr;
  gap: ${theme.spacing.xl};

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const CardImageContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const CardImage = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
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
`;

const CardTypeText = styled.div`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.secondary};
`;

const CardStats = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  color: ${theme.colors.text.secondary};
`;

const CardDescription = styled.p`
  white-space: pre-wrap;
  line-height: 1.5;
  color: ${theme.colors.text.primary};
`;

const CardSets = styled.div`
  h4 {
    margin-top: 0;
    margin-bottom: ${theme.spacing.sm};
    color: ${theme.colors.text.primary};
  }

  ul {
    margin: 0;
    padding-left: ${theme.spacing.lg};
    color: ${theme.colors.text.secondary};
  }
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
  padding: ${theme.spacing.lg};

  p {
    margin: ${theme.spacing.xs} 0;
  }
`;

export default CardDatabasePage;
