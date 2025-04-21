import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { YGODeckToImage } from "ygo-core-images-utils";
import { useDeckGroups } from "../DeckBuilder/hooks/useDeckGroups";
import { Deck, DeckGroup } from "../DeckBuilder/types";

const MyDecksPage = () => {
  const navigate = useNavigate();
  const {
    deckGroups,
    selectedDeckGroup,
    setSelectedDeckGroup,
    createDeckGroup,
    updateDeckGroup,
    deleteDeckGroup,
    moveDeckToGroup,
    getDecksInGroup,
  } = useDeckGroups();

  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [displayedDecks, setDisplayedDecks] = useState<Deck[]>([]);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [selectedDecks, setSelectedDecks] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");

  // Load all decks on component mount
  useEffect(() => {
    loadAllDecks();
  }, []);

  // Update displayed decks when selected group changes
  useEffect(() => {
    if (!selectedDeckGroup) {
      setDisplayedDecks(allDecks);
    } else {
      const groupDecks = getDecksInGroup(selectedDeckGroup.id);
      setDisplayedDecks(groupDecks);
    }
  }, [selectedDeckGroup, allDecks]);

  const loadAllDecks = () => {
    const decks: Deck[] = [];
    const allKeys = Object.keys(localStorage);
    const deckKeys = allKeys.filter(
      (key) => key.startsWith("deck_") && !key.includes("deck_groups")
    );

    for (const key of deckKeys) {
      try {
        const deckData = JSON.parse(localStorage.getItem(key) || "{}");
        if (deckData.mainDeck) {
          // Make sure each deck has an id for proper handling
          if (!deckData.id) {
            deckData.id = key;
          }

          // Set a name if missing
          if (!deckData.name) {
            deckData.name = key.replace("deck_", "");
          }

          decks.push(deckData);
        }
      } catch (error) {
        console.error(`Error parsing deck ${key}:`, error);
      }
    }

    setAllDecks(decks);

    // Default to showing all decks initially
    setDisplayedDecks(decks);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = createDeckGroup(newGroupName);
    if (newGroup) {
      setSelectedDeckGroup(newGroup);
      setNewGroupName("");
    }
  };

  const handleDeleteGroup = (group: DeckGroup) => {
    if (group.id === "default") {
      alert("Cannot delete the default group");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete the group "${group.name}"?`
      )
    ) {
      const success = deleteDeckGroup(group.id);
      if (success) {
        setSelectedDeckGroup(null);
      }
    }
  };

  const handleSelectGroup = (group: DeckGroup | null) => {
    setSelectedDeckGroup(group);
  };

  const toggleDeckSelection = (deckId: string) => {
    const newSelection = new Set(selectedDecks);

    if (newSelection.has(deckId)) {
      newSelection.delete(deckId);
    } else {
      newSelection.add(deckId);
    }

    setSelectedDecks(newSelection);
  };

  const moveSelectedDecksToGroup = (targetGroupId: string) => {
    if (selectedDecks.size === 0) return;

    selectedDecks.forEach((deckId) => {
      moveDeckToGroup(deckId, targetGroupId);
    });

    // Reload decks to reflect changes
    loadAllDecks();
    setSelectedDecks(new Set());
  };

  const deleteDeck = (deck: Deck) => {
    const deckId = deck.id || `deck_${deck.name}`;
    if (confirm(`Are you sure you want to delete ${deck.name}?`)) {
      localStorage.removeItem(deckId);

      // Refresh the deck lists
      setAllDecks((prevDecks) => prevDecks.filter((d) => d.id !== deckId));
    }
  };

  const downloadDeckAsYdk = (deck: Deck) => {
    const fileName = deck.name + ".ydk";

    const deckBuilder = new YGODeckToImage({
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });
    deckBuilder.downloadYdk({ fileName });
  };

  const downloadDeckAsPng = async (deck: Deck) => {
    const fileName = deck.name + ".png";

    const deckBuilder = new YGODeckToImage({
      name: deck.name,
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });

    await deckBuilder.toImage({ fileName, download: true });
  };

  // Filter out the default "All Decks" group from the display
  // since we already have a separate tab for it
  const displayedGroups = deckGroups.filter(
    (group) => !(group.id === "default" && group.name === "All Decks")
  );

  return (
    <PageContainer>
      <Header>
        <h1>My Decks</h1>
        <ButtonGroup>
          <Button onClick={() => navigate("/deckbuilder")}>
            Create New Deck
          </Button>
          <Button onClick={() => navigate("/deck")}>Import Deck</Button>
          <Button onClick={() => setIsEditingGroups(!isEditingGroups)}>
            {isEditingGroups ? "Done" : "Manage Groups"}
          </Button>
        </ButtonGroup>
      </Header>

      <GroupsContainer>
        <GroupsHeading>
          <h3>Deck Groups</h3>
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
          {/* Add "All" option */}
          <GroupTab
            active={!selectedDeckGroup}
            onClick={() => handleSelectGroup(null)}
          >
            All Decks ({allDecks.length})
          </GroupTab>

          {displayedGroups.map((group) => (
            <GroupTab
              key={group.id}
              active={selectedDeckGroup?.id === group.id}
              onClick={() => handleSelectGroup(group)}
            >
              {group.name} ({getDecksInGroup(group.id).length})
              {isEditingGroups && group.id !== "default" && (
                <DeleteGroupButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group);
                  }}
                >
                  ×
                </DeleteGroupButton>
              )}
            </GroupTab>
          ))}
        </GroupTabsContainer>

        {isEditingGroups && selectedDecks.size > 0 && (
          <MoveToGroupPanel>
            <span>{selectedDecks.size} deck(s) selected</span>
            <MoveToGroupSelect
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  moveSelectedDecksToGroup(e.target.value);
                }
              }}
            >
              <option value="" disabled>
                Move to group...
              </option>
              {deckGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </MoveToGroupSelect>
          </MoveToGroupPanel>
        )}
      </GroupsContainer>

      {displayedDecks.length === 0 ? (
        <EmptyState>
          {allDecks.length === 0 ? (
            <>
              <p>You don't have any decks yet.</p>
              <Button onClick={() => navigate("/deckbuilder")}>
                Create Your First Deck
              </Button>
            </>
          ) : (
            <p>
              No decks in this group. Select a different group or add decks to
              this group.
            </p>
          )}
        </EmptyState>
      ) : (
        <DeckGrid>
          {displayedDecks.map((deck) => (
            <DeckCard
              key={deck.id || `deck_${deck.name}`}
              selected={selectedDecks.has(deck.id || `deck_${deck.name}`)}
              onClick={() =>
                isEditingGroups
                  ? toggleDeckSelection(deck.id || `deck_${deck.name}`)
                  : null
              }
            >
              {isEditingGroups && (
                <SelectCheckbox
                  type="checkbox"
                  checked={selectedDecks.has(deck.id || `deck_${deck.name}`)}
                  onChange={() =>
                    toggleDeckSelection(deck.id || `deck_${deck.name}`)
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <DeckTitle>{deck.name}</DeckTitle>
              <DeckMeta>
                <MetaItem>Main: {deck.mainDeck.length}</MetaItem>
                <MetaItem>Extra: {deck.extraDeck.length}</MetaItem>
                {deck.groupId && (
                  <GroupBadge>
                    {deckGroups.find((g) => g.id === deck.groupId)?.name ||
                      "Unknown Group"}
                  </GroupBadge>
                )}
              </DeckMeta>

              <ButtonGroup>
                <Button
                  primary
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/my/decks/${deck.id || `deck_${deck.name}`}`);
                  }}
                >
                  View Details
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/duel?deck=${deck.id || `deck_${deck.name}`}`);
                  }}
                >
                  Duel
                </Button>
              </ButtonGroup>

              <ActionBar>
                <ActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadDeckAsPng(deck);
                  }}
                >
                  🖼️ PNG
                </ActionButton>
                <ActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadDeckAsYdk(deck);
                  }}
                >
                  📂 YDK
                </ActionButton>
                <ActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDeck(deck);
                  }}
                >
                  🗑️ Delete
                </ActionButton>
              </ActionBar>
            </DeckCard>
          ))}
        </DeckGrid>
      )}
    </PageContainer>
  );
};

// Styled components remain the same
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
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

const GroupsContainer = styled.div`
  margin-bottom: 30px;
`;

const GroupsHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  h3 {
    margin: 0;
  }
`;

const GroupActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const GroupInput = styled.input`
  padding: 8px 12px;
  background-color: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
`;

const GroupTabsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
`;

const GroupTab = styled.div<{ active: boolean }>`
  padding: 8px 16px;
  background-color: ${(props) => (props.active ? "#0078d4" : "#2a2a2a")};
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  position: relative;

  &:hover {
    background-color: ${(props) => (props.active ? "#0056b3" : "#444")};
  }
`;

const DeleteGroupButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  font-weight: bold;
  margin-left: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;

  &:hover {
    color: #ff4444;
  }
`;

const MoveToGroupPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background-color: #2a2a2a;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const MoveToGroupSelect = styled.select`
  padding: 8px 12px;
  background-color: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 4px;
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

const DeckGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const DeckCard = styled.div<{ selected?: boolean }>`
  background-color: ${(props) => (props.selected ? "#193c5a" : "#2a2a2a")};
  border: ${(props) =>
    props.selected ? "2px solid #0078d4" : "2px solid transparent"};
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  position: relative;
  cursor: ${(props) => (props.selected !== undefined ? "pointer" : "default")};

  &:hover {
    background-color: ${(props) => (props.selected ? "#193c5a" : "#333")};
  }
`;

const SelectCheckbox = styled.input`
  position: absolute;
  top: 15px;
  right: 15px;
  width: 20px;
  height: 20px;
  cursor: pointer;
`;

const DeckTitle = styled.h3`
  margin: 0;
  color: white;
`;

const DeckMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const MetaItem = styled.span`
  font-size: 12px;
  color: #ccc;
`;

const GroupBadge = styled.span`
  padding: 2px 8px;
  background-color: #0078d4;
  color: white;
  border-radius: 10px;
  font-size: 12px;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

const ActionButton = styled.button`
  padding: 5px 10px;
  background-color: transparent;
  color: #ccc;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    background-color: #333;
    color: white;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 50px;
  background-color: #2a2a2a;
  border-radius: 8px;
  color: white;
`;

export default MyDecksPage;
