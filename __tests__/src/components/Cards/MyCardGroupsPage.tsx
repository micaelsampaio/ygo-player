import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { Card as CardType } from "../DeckBuilder/types";
import SearchPanel from "../DeckBuilder/components/Search/SearchPanel";
import { useCardGroups } from "./hooks/useCardGroups";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card, TextField, Badge } from "../UI";
import { getCardImageUrl, getCardBackImageUrl } from "../../utils/cardImages";

const MyCardGroupsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cardGroups,
    selectedCardGroup,
    setSelectedCardGroup,
    createCardGroup,
    updateCardGroup,
    deleteCardGroup,
    addCardToGroup,
    removeCardFromGroup,
  } = useCardGroups();

  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  // Effect to handle URL parameters for pre-selecting a group
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const groupIdParam = params.get("group");

    if (groupIdParam && cardGroups.length > 0) {
      const targetGroup = cardGroups.find((group) => group.id === groupIdParam);
      if (targetGroup) {
        setSelectedCardGroup(targetGroup);
        // If we're coming from another page to edit this group, automatically enable editing mode
        setIsEditingGroups(true);
      }
    }
  }, [location.search, cardGroups]);

  // Handle creating a new card group
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = createCardGroup(newGroupName);
    if (newGroup) {
      setSelectedCardGroup(newGroup);
      setNewGroupName("");
    }
  };

  // Handle deleting a card group
  const handleDeleteGroup = (groupId: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete this group? This will remove the group but not the cards.`
      )
    ) {
      const success = deleteCardGroup(groupId);
      if (success) {
        setSelectedCardGroup(null);
      }
    }
  };

  // Handle adding a card to the selected group
  const handleAddCardToGroup = (card: CardType) => {
    if (!selectedCardGroup) {
      alert("Please select a group first");
      return;
    }

    const success = addCardToGroup(selectedCardGroup.id, card);
    if (success) {
      alert(`Added ${card.name} to ${selectedCardGroup.name}`);
    } else {
      alert(`${card.name} is already in this group`);
    }
  };

  // Handle removing a card from the selected group
  const handleRemoveCardFromGroup = (cardId: number) => {
    if (!selectedCardGroup) return;

    if (window.confirm("Remove this card from the group?")) {
      removeCardFromGroup(selectedCardGroup.id, cardId);
    }
  };

  // Handle card selection
  const handleCardSelect = (card: CardType) => {
    setSelectedCard(card);
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>My Card Groups</h1>
          <Button
            variant={isEditingGroups ? "primary" : "tertiary"}
            size="md"
            className="btn-icon"
            onClick={() => setIsEditingGroups(!isEditingGroups)}
          >
            <GroupsIcon>📁</GroupsIcon>
            {isEditingGroups ? "Done" : "Manage Groups"}
          </Button>
        </PageHeader>

        <MainContentContainer>
          <GroupsPanel>
            <Card>
              <Card.Content>
                <GroupsHeading>
                  <h3>Card Groups</h3>
                  {isEditingGroups && (
                    <GroupActions>
                      <TextField
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="New group name"
                        variant="outline"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleCreateGroup}
                      >
                        Create
                      </Button>
                    </GroupActions>
                  )}
                </GroupsHeading>

                <GroupTabsContainer>
                  {cardGroups.map((group) => (
                    <GroupTab
                      key={group.id}
                      active={selectedCardGroup?.id === group.id}
                      onClick={() => setSelectedCardGroup(group)}
                    >
                      <GroupTabContent>
                        <span>{group.name}</span>
                        <Badge variant="secondary" size="sm">
                          {group.cards ? group.cards.length : 0}
                        </Badge>
                      </GroupTabContent>
                      {isEditingGroups && (
                        <DeleteGroupButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                        >
                          ×
                        </DeleteGroupButton>
                      )}
                    </GroupTab>
                  ))}
                </GroupTabsContainer>
              </Card.Content>
            </Card>
          </GroupsPanel>

          <GroupContentPanel>
            <Card elevation="low">
              <Card.Content>
                {!selectedCardGroup ? (
                  <EmptyState>
                    <p>Please select or create a card group</p>
                  </EmptyState>
                ) : selectedCardGroup.cards &&
                  selectedCardGroup.cards.length > 0 ? (
                  <>
                    <GroupHeader>
                      <h2>{selectedCardGroup.name}</h2>
                      <Badge variant="primary" size="lg">
                        {selectedCardGroup.cards.length} cards
                      </Badge>
                    </GroupHeader>
                    <CardGrid>
                      {selectedCardGroup.cards.map((card) => (
                        <DeckCardContainer key={card.id}>
                          <CardImage
                            src={
                              card.card_images?.[0]?.image_url ||
                              getCardImageUrl(card.id, "normal")
                            }
                            alt={card.name}
                            className="deck-card"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = getCardBackImageUrl();
                            }}
                            onClick={() => handleCardSelect(card)}
                          />
                          <RemoveButton
                            className="remove-card"
                            onClick={() => handleRemoveCardFromGroup(card.id)}
                          >
                            &times;
                          </RemoveButton>
                        </DeckCardContainer>
                      ))}
                    </CardGrid>
                  </>
                ) : (
                  <EmptyState>
                    <p>This group has no cards yet.</p>
                    <p>Search for cards and add them to this group.</p>
                  </EmptyState>
                )}
              </Card.Content>
            </Card>
          </GroupContentPanel>

          <SearchPanelContainer>
            <Card>
              <Card.Content>
                <h3>Card Search</h3>
                <SearchPanel
                  onCardSelect={handleCardSelect}
                  onCardAdd={handleAddCardToGroup}
                  hideAddToDeck={!selectedCardGroup}
                />
              </Card.Content>
            </Card>
          </SearchPanelContainer>
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

// Use the same three-panel layout as DeckBuilder
const MainContentContainer = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 400px;
  gap: ${theme.spacing.lg};
  height: calc(100vh - 200px);
`;

// Left panel for groups
const GroupsPanel = styled.div`
  max-height: 100%;
  overflow-y: auto;
`;

// Middle panel for group content
const GroupContentPanel = styled.div`
  max-height: 100%;
  overflow-y: auto;
`;

// Right panel for search
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

const GroupsHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};

  h3 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size.lg};
  }
`;

const GroupActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const GroupTabsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const GroupTab = styled.div<{ active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${(props) =>
    props.active ? theme.colors.primary.main : theme.colors.background.card};
  color: ${(props) =>
    props.active ? theme.colors.text.inverse : theme.colors.text.primary};
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  transition: background-color ${theme.transitions.default};
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:hover {
    background-color: ${(props) =>
      props.active ? theme.colors.primary.dark : theme.colors.background.dark};
  }
`;

const GroupTabContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: ${theme.spacing.sm};
`;

const DeleteGroupButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.inverse};
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.bold};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${theme.spacing.xs};

  &:hover {
    color: ${theme.colors.error.main};
  }
`;

const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};

  h2 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size.xl};
  }
`;

// Updated card grid
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  min-height: 150px;
  background-color: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.default};
`;

// Card container
const DeckCardContainer = styled.div`
  position: relative;
  width: 100%;
  transition: transform ${theme.transitions.default};

  &:hover {
    transform: scale(1.05);
    z-index: 2;
  }
`;

// Card image
const CardImage = styled.img`
  width: 100%;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  display: block;
`;

// Remove button
const RemoveButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${theme.colors.error.main};
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.typography.size.sm};
  opacity: 0;
  transition: opacity ${theme.transitions.default};
  z-index: 4;

  ${DeckCardContainer}:hover & {
    opacity: 1;
  }

  &:hover {
    background: ${theme.colors.error.dark};
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

const GroupsIcon = styled.span`
  margin-right: ${theme.spacing.xs};
`;

export default MyCardGroupsPage;
