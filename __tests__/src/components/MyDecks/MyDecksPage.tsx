import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { YGODeckToImage } from "ygo-core-images-utils";
import { useDeckGroups } from "../DeckBuilder/hooks/useDeckGroups";
import { Deck, DeckGroup } from "../DeckBuilder/types";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card, Badge, TextField, Select } from "../UI";
import { syncDecksWithFolder } from "../../utils/deckFileSystem";
import { Logger } from "../../utils/logger";

const logger = Logger.createLogger("MyDecksPage");

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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

  const handleSyncDecks = async () => {
    try {
      setIsSyncing(true);
      setSyncResult(null);

      logger.info("Syncing decks...");
      const result = await syncDecksWithFolder(allDecks, "", "export", "ydk");

      if (result.errors.length > 0) {
        setSyncResult({
          success: false,
          message: `Exported ${result.exported.length} decks with ${result.errors.length} errors.`,
        });
        logger.error("Sync errors:", result.errors);
      } else {
        setSyncResult({
          success: true,
          message: `Successfully exported ${result.exported.length} decks.`,
        });
        logger.info("Sync successful:", result);
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to sync decks.",
      });
      logger.error("Sync error:", error);
    } finally {
      setIsSyncing(false);

      // Clear the result message after 5 seconds
      setTimeout(() => {
        setSyncResult(null);
      }, 5000);
    }
  };

  const handleCreateNewDeck = () => {
    // Generate a UUID for the new deck
    const newDeckId = `deck_${crypto.randomUUID()}`;

    // Create a basic deck structure
    const newDeck = {
      id: newDeckId, // Store the full ID including "deck_" prefix
      name: `New Deck ${allDecks.length + 1}`,
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      createdAt: new Date().toISOString(),
      groupId: selectedDeckGroup?.id || "default",
    };

    // Save the new deck to localStorage
    localStorage.setItem(newDeckId, JSON.stringify(newDeck));

    // Navigate to deck builder with the new deck selected
    navigate(`/deckbuilder?edit=${newDeckId}`);
  };

  // Filter out the default "All Decks" group from the display
  // since we already have a separate tab for it
  const displayedGroups = deckGroups.filter(
    (group) => !(group.id === "default" && group.name === "All Decks")
  );

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>My Decks</h1>
          <HeaderActions>
            <Button variant="primary" onClick={handleCreateNewDeck}>
              Create New Deck
            </Button>
            <Button variant="tertiary" onClick={() => navigate("/deck")}>
              Import Deck
            </Button>
            <Button
              variant="secondary"
              onClick={handleSyncDecks}
              disabled={isSyncing || allDecks.length === 0}
            >
              {isSyncing ? "Syncing..." : "Sync Decks"}
            </Button>
            <Button
              variant={isEditingGroups ? "primary" : "secondary"}
              onClick={() => setIsEditingGroups(!isEditingGroups)}
            >
              {isEditingGroups ? "Done" : "Manage Groups"}
            </Button>
          </HeaderActions>
        </PageHeader>

        {syncResult && (
          <SyncNotification $success={syncResult.success}>
            {syncResult.message}
          </SyncNotification>
        )}

        <Card elevation="low" margin="0 0 24px 0">
          <Card.Content>
            <GroupsHeading>
              <h2>Deck Groups</h2>
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
                    size="md"
                    onClick={handleCreateGroup}
                  >
                    Create
                  </Button>
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
                <Select
                  options={deckGroups.map((group) => ({
                    value: group.id,
                    label: group.name,
                  }))}
                  onChange={(value) => {
                    if (value) {
                      moveSelectedDecksToGroup(value);
                    }
                  }}
                  placeholder="Move to group..."
                />
              </MoveToGroupPanel>
            )}
          </Card.Content>
        </Card>

        {displayedDecks.length === 0 ? (
          <EmptyStateCard>
            <Card.Content>
              {allDecks.length === 0 ? (
                <>
                  <p>You don't have any decks yet.</p>
                  <Button
                    variant="primary"
                    onClick={() => navigate("/deckbuilder")}
                  >
                    Create Your First Deck
                  </Button>
                </>
              ) : (
                <p>
                  No decks in this group. Select a different group or add decks
                  to this group.
                </p>
              )}
            </Card.Content>
          </EmptyStateCard>
        ) : (
          <DeckGrid>
            {displayedDecks.map((deck) => (
              <DeckCard
                key={deck.id || `deck_${deck.name}`}
                selected={selectedDecks.has(deck.id || `deck_${deck.name}`)}
                elevation="low"
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
                <Card.Content>
                  <DeckTitle>{deck.name}</DeckTitle>
                  <DeckMeta>
                    <MetaItem>Main: {deck.mainDeck.length}</MetaItem>
                    <MetaItem>Extra: {deck.extraDeck.length}</MetaItem>
                    {deck.groupId && (
                      <GroupBadge variant="primary" size="sm" pill>
                        {deckGroups.find((g) => g.id === deck.groupId)?.name ||
                          "Unknown Group"}
                      </GroupBadge>
                    )}
                  </DeckMeta>

                  <ButtonContainer>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/my/decks/${deck.id || `deck_${deck.name}`}`);
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          `/duel?deck=${deck.id || `deck_${deck.name}`}`
                        );
                      }}
                    >
                      Duel
                    </Button>
                  </ButtonContainer>

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
                </Card.Content>
              </DeckCard>
            ))}
          </DeckGrid>
        )}
      </PageContainer>
    </AppLayout>
  );
};

// Styled components updated to use theme variables
const PageContainer = styled.div`
  max-width: 1200px;
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

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
`;

const SyncNotification = styled.div<{ $success: boolean }>`
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  background-color: ${(props) =>
    props.$success ? theme.colors.success.light : theme.colors.error.light};
  color: ${(props) =>
    props.$success ? theme.colors.success.dark : theme.colors.error.dark};
  border-radius: ${theme.borderRadius.md};
  border-left: 4px solid
    ${(props) =>
      props.$success ? theme.colors.success.main : theme.colors.error.main};
  animation: fadeIn 0.3s ease-in;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const GroupsHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};

  h2 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size.xl};
  }
`;

const GroupActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const GroupTabsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
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
  position: relative;

  &:hover {
    background-color: ${(props) =>
      props.active ? theme.colors.primary.dark : theme.colors.background.dark};
  }
`;

const DeleteGroupButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.inverse};
  font-size: ${theme.typography.size.md};
  font-weight: ${theme.typography.weight.bold};
  margin-left: ${theme.spacing.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;

  &:hover {
    color: ${theme.colors.error.main};
  }
`;

const MoveToGroupPanel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  margin-top: ${theme.spacing.md};

  span {
    color: ${theme.colors.text.primary};
    font-weight: ${theme.typography.weight.medium};
  }
`;

const DeckGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${theme.spacing.lg};
`;

const DeckCard = styled(Card)<{ selected?: boolean }>`
  border: ${(props) =>
    props.selected
      ? `2px solid ${theme.colors.primary.main}`
      : `1px solid ${theme.colors.border.default}`};
  background-color: ${(props) =>
    props.selected
      ? theme.colors.action.selected
      : theme.colors.background.paper};
  cursor: ${(props) => (props.selected !== undefined ? "pointer" : "default")};
  transition: transform ${theme.transitions.default},
    box-shadow ${theme.transitions.default};

  &:hover {
    transform: translateY(-2px);
  }
`;

const SelectCheckbox = styled.input`
  position: absolute;
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: ${theme.colors.primary.main};
`;

const DeckTitle = styled.h3`
  margin: 0 0 ${theme.spacing.sm} 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.lg};
`;

const DeckMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

const MetaItem = styled.span`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
`;

const GroupBadge = styled(Badge)`
  margin-left: auto;
`;

const ButtonContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.sm};
`;

const ActionBar = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background-color: transparent;
  color: ${theme.colors.text.secondary};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  font-size: ${theme.typography.size.sm};
  transition: all ${theme.transitions.default};

  &:hover {
    background-color: ${theme.colors.background.card};
    color: ${theme.colors.text.primary};
  }
`;

const EmptyStateCard = styled(Card)`
  padding: ${theme.spacing.xl};
  text-align: center;

  p {
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing.lg};
    font-size: ${theme.typography.size.md};
  }
`;

export default MyDecksPage;
