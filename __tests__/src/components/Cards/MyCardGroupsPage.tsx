import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Card } from "../DeckBuilder/types";
import SearchPanel from "../DeckBuilder/components/Search/SearchPanel";
import { useCardGroups } from "./hooks/useCardGroups";

const MyCardGroupsPage = () => {
  const navigate = useNavigate();
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
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

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
  const handleAddCardToGroup = (card: Card) => {
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
  const handleCardSelect = (card: Card) => {
    setSelectedCard(card);
  };

  return (
    <PageContainer>
      <Header>
        <h1>My Card Groups</h1>
        <ButtonGroup>
          <Button onClick={() => setIsEditingGroups(!isEditingGroups)}>
            {isEditingGroups ? "Done" : "Manage Groups"}
          </Button>
        </ButtonGroup>
      </Header>

      <MainContentContainer>
        <GroupsPanel>
          <GroupsHeading>
            <h3>Card Groups</h3>
            {isEditingGroups && (
              <GroupActions>
                <GroupInput
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="New group name"
                />
                <ActionButton onClick={handleCreateGroup}>Create</ActionButton>
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
                {group.name} ({group.cards ? group.cards.length : 0})
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
        </GroupsPanel>

        <GroupContentPanel>
          {!selectedCardGroup ? (
            <EmptyState>
              <p>Please select or create a card group</p>
            </EmptyState>
          ) : selectedCardGroup.cards && selectedCardGroup.cards.length > 0 ? (
            <>
              <GroupHeader>
                <h2>{selectedCardGroup.name}</h2>
                <span>{selectedCardGroup.cards.length} cards</span>
              </GroupHeader>
              <CardGrid>
                {selectedCardGroup.cards.map((card) => (
                  <DeckCardContainer key={card.id}>
                    <CardImage
                      src={
                        card.card_images?.[0]?.image_url ||
                        `https://images.ygoprodeck.com/images/cards/${card.id}.jpg`
                      }
                      alt={card.name}
                      className="deck-card"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          "https://images.ygoprodeck.com/images/cards_small/back_high.jpg";
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
        </GroupContentPanel>

        <SearchPanelContainer>
          <h3>Card Search</h3>
          <SearchPanel
            onCardSelect={handleCardSelect}
            onCardAdd={handleAddCardToGroup}
            hideAddToDeck={!selectedCardGroup}
          />
        </SearchPanelContainer>
      </MainContentContainer>
    </PageContainer>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 1800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;

  h1 {
    margin: 0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button<{ primary?: boolean }>`
  padding: 8px 16px;
  background-color: ${(props) => (props.primary ? "#0078d4" : "#2a2a2a")};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => (props.primary ? "#0056b3" : "#444")};
  }
`;

// Use the same three-panel layout as DeckBuilder
const MainContentContainer = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 400px;
  gap: 20px;
  margin-top: 20px;
`;

// This represents the "decks-panel" in DeckBuilder
const GroupsPanel = styled.div`
  background: #f7f7f7;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: 85vh;
  overflow-y: auto;
`;

// This represents the "editor-panel" in DeckBuilder
const GroupContentPanel = styled.div`
  background: #f7f7f7;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: 85vh;
  overflow-y: auto;
`;

// This represents the "search-panel" in DeckBuilder
const SearchPanelContainer = styled.div`
  background: #f7f7f7;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: 85vh;
  overflow-y: auto;

  h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
  }
`;

const GroupsHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  h3 {
    margin: 0;
    color: #333;
  }
`;

const GroupActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const GroupInput = styled.input`
  padding: 8px 12px;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const GroupTabsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
`;

const GroupTab = styled.div<{ active: boolean }>`
  padding: 8px 16px;
  background-color: ${(props) => (props.active ? "#2196f3" : "#f0f0f0")};
  color: ${(props) => (props.active ? "white" : "#333")};
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:hover {
    background-color: ${(props) => (props.active ? "#1976d2" : "#e0e0e0")};
  }
`;

const DeleteGroupButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => (props.color ? props.color : "white")};
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;

  &:hover {
    color: #ff4444;
  }
`;

const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    color: #333;
  }

  span {
    background-color: #2196f3;
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 14px;
  }
`;

// Updated to match the deck builder style
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  padding: 0.5rem;
  min-height: 150px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  border: 1px solid #ddd;
`;

// This matches the deck-card-container style from DeckBuilder
const DeckCardContainer = styled.div`
  position: relative;
  width: 100%;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
    z-index: 2;
  }
`;

// Updated to match the deck builder's deck-card style
const CardImage = styled.img`
  width: 100%;
  border-radius: 4px;
  cursor: pointer;
  display: block;
`;

// This matches the remove-card style from DeckBuilder
const RemoveButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.8);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 4;

  ${DeckCardContainer}:hover & {
    opacity: 1;
  }

  &:hover {
    background: rgba(255, 0, 0, 1);
  }
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #1976d2;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #666;
  min-height: 300px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  padding: 20px;

  p {
    margin: 5px 0;
  }
`;

export default MyCardGroupsPage;
