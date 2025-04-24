import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { YGODeckToImage } from "ygo-core-images-utils";
import { useDeckGroups } from "../DeckBuilder/hooks/useDeckGroups";
import { Deck, DeckGroup } from "../DeckBuilder/types";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card, Badge, TextField, Select } from "../UI";
import DeckSyncModal from "../DeckBuilder/components/DeckSyncModal/DeckSyncModal";
import DeckActions from "../DeckBuilder/components/DeckList/DeckActions"; // Fixed path to DeckActions
import { createPortal } from "react-dom";
import { createCollectionFromDeck } from "../Collections/contex";

const MyDecksPage = () => {
  const navigate = useNavigate();
  const {
    deckGroups,
    selectedDeckGroup,
    setSelectedDeckGroup,
    createDeckGroup,
    deleteDeckGroup,
    moveDeckToGroup,
    getDecksInGroup,
  } = useDeckGroups();

  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [displayedDecks, setDisplayedDecks] = useState<Deck[]>([]);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [selectedDecks, setSelectedDecks] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [activeDeckContextMenu, setActiveDeckContextMenu] = useState<
    string | null
  >(null);
  const contextMenuRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [coverCards, setCoverCards] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  useEffect(() => {
    loadAllDecks();
  }, []);

  useEffect(() => {
    if (!selectedDeckGroup) {
      setDisplayedDecks(allDecks);
    } else {
      const groupDecks = getDecksInGroup(selectedDeckGroup.id);
      setDisplayedDecks(groupDecks);
    }
  }, [selectedDeckGroup, allDecks]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeDeckContextMenu &&
        !(e.target as Element).closest(".deck-context-menu")
      ) {
        setActiveDeckContextMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDeckContextMenu]);

  useEffect(() => {
    try {
      const storedCoverCards = JSON.parse(
        localStorage.getItem("deck_cover_cards") || "{}"
      );
      setCoverCards(storedCoverCards);
    } catch (error) {
      console.error("Error loading cover cards:", error);
    }
  }, []);

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
          if (!deckData.id) {
            deckData.id = key;
          }

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

    loadAllDecks();
    setSelectedDecks(new Set());
  };

  const deleteDeck = (deck: Deck) => {
    const deckId = deck.id || `deck_${deck.name}`;
    if (confirm(`Are you sure you want to delete ${deck.name}?`)) {
      localStorage.removeItem(deckId);

      setAllDecks((prevDecks) => prevDecks.filter((d) => d.id !== deckId));

      if (activeDeckContextMenu === deckId) {
        setActiveDeckContextMenu(null);
      }
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

  const handleSyncDecks = () => {
    setIsSyncModalOpen(true);
  };

  const updateDeck = (deck: Deck) => {
    const deckId = deck.id || `deck_${deck.name}`;
    localStorage.setItem(deckId, JSON.stringify(deck));
    loadAllDecks();
    setSyncResult({
      success: true,
      message: `Deck "${deck.name}" successfully synced.`,
    });

    setTimeout(() => {
      setSyncResult(null);
    }, 3000);
  };

  const handleCreateNewDeck = () => {
    const newDeckId = `deck_${crypto.randomUUID()}`;

    const newDeck = {
      id: newDeckId,
      name: `New Deck ${allDecks.length + 1}`,
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      createdAt: new Date().toISOString(),
      groupId: selectedDeckGroup?.id || "default",
    };

    localStorage.setItem(newDeckId, JSON.stringify(newDeck));
    navigate(`/deckbuilder?edit=${newDeckId}`);
  };

  const handleDeckContextMenu = (
    deck: Deck,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const { x, y } = calculateContextMenuPosition(event.clientX, event.clientY);

    contextMenuRef.current = { x, y };

    setActiveDeckContextMenu(
      activeDeckContextMenu === (deck.id || `deck_${deck.name}`)
        ? null
        : deck.id || `deck_${deck.name}`
    );
  };

  const handleImportDeck = (importedDeck: Deck) => {
    const deckId = importedDeck.id || `deck_${importedDeck.name}`;
    importedDeck.id = deckId;
    importedDeck.importedAt = new Date().toISOString();
    localStorage.setItem(deckId, JSON.stringify(importedDeck));
    loadAllDecks();
    setActiveDeckContextMenu(null);
  };

  const handleRenameDeck = (deck: Deck, newName: string) => {
    if (!newName.trim()) return;

    const deckId = deck.id || `deck_${deck.name}`;
    const updatedDeck = {
      ...deck,
      name: newName,
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem(deckId, JSON.stringify(updatedDeck));
    loadAllDecks();
    setActiveDeckContextMenu(null);
  };

  const handleClearDeck = (deck: Deck) => {
    const deckId = deck.id || `deck_${deck.name}`;
    const updatedDeck = {
      ...deck,
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem(deckId, JSON.stringify(updatedDeck));
    loadAllDecks();
    setActiveDeckContextMenu(null);
  };

  const handleCopyDeck = (deck: Deck) => {
    const copyName = `${deck.name} (Copy)`;
    const newDeckId = `deck_${crypto.randomUUID()}`;

    const copiedDeck: Deck = {
      ...deck,
      id: newDeckId,
      name: copyName,
      copiedAt: new Date().toISOString(),
    };

    localStorage.setItem(newDeckId, JSON.stringify(copiedDeck));
    loadAllDecks();
    setActiveDeckContextMenu(null);
  };

  const handleCreateCollection = (deck: Deck) => {
    const collectionId = createCollectionFromDeck(deck);
    navigate(`/collections?select=${collectionId}`);
    setActiveDeckContextMenu(null);
  };

  const handleMoveDeckToGroup = (deck: Deck, groupId: string) => {
    const deckId = deck.id || `deck_${deck.name}`;
    moveDeckToGroup(deckId, groupId);
    loadAllDecks();
    setActiveDeckContextMenu(null);
  };

  const calculateContextMenuPosition = (x: number, y: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const menuWidth = 300;
    const menuHeight = Math.min(600, viewportHeight * 0.8);

    let adjustedX = Math.max(0, x - menuWidth / 2);
    let adjustedY = y + 10;

    if (adjustedX + menuWidth > viewportWidth) {
      adjustedX = viewportWidth - menuWidth - 5;
    }

    if (adjustedY + menuHeight > viewportHeight) {
      adjustedY = Math.max(5, y - menuHeight - 10);
    }

    adjustedX = Math.max(5, adjustedX);
    adjustedY = Math.max(5, adjustedY);

    return { x: adjustedX, y: adjustedY };
  };

  const getCoverCard = (deck: Deck) => {
    const deckId = deck.id || `deck_${deck.name}`;

    if (
      coverCards[deckId] &&
      deck.mainDeck.find((card) => card.id === coverCards[deckId])
    ) {
      return deck.mainDeck.find((card) => card.id === coverCards[deckId]);
    }

    const allCards = [...deck.mainDeck, ...deck.extraDeck];
    if (allCards.length === 0) return null;

    const monsterCards = allCards.filter(
      (card) => card.type && card.type.toLowerCase().includes("monster")
    );

    const sortedMonsters = [...monsterCards].sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        return b.level - a.level;
      }
      return 0;
    });

    return sortedMonsters.length > 0 ? sortedMonsters[0] : allCards[0];
  };

  const setCoverCard = (deckId: string, cardId: number) => {
    setCoverCards((prev) => ({
      ...prev,
      [deckId]: cardId,
    }));

    try {
      const storedCoverCards = JSON.parse(
        localStorage.getItem("deck_cover_cards") || "{}"
      );
      localStorage.setItem(
        "deck_cover_cards",
        JSON.stringify({
          ...storedCoverCards,
          [deckId]: cardId,
        })
      );
    } catch (error) {
      console.error("Error saving cover card preference:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, deck: Deck) => {
    e.dataTransfer.setData("text/plain", deck.id || `deck_${deck.name}`);
    setIsDragging(deck.id || `deck_${deck.name}`);

    const dragElement = document.createElement("div");
    dragElement.textContent = deck.name;
    dragElement.style.padding = "10px";
    dragElement.style.background = "#2196f3";
    dragElement.style.color = "white";
    dragElement.style.borderRadius = "5px";
    dragElement.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    dragElement.style.position = "fixed";
    dragElement.style.top = "-1000px";

    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, 20, 20);

    setTimeout(() => {
      document.body.removeChild(dragElement);
    }, 0);
  };

  const handleDragEnd = () => {
    setIsDragging(null);
    setDragOverGroupId(null);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    groupId: string
  ) => {
    e.preventDefault();
    if (dragOverGroupId !== groupId) {
      setDragOverGroupId(groupId);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, groupId: string) => {
    e.preventDefault();
    const deckId = e.dataTransfer.getData("text/plain");
    moveDeckToGroup(deckId, groupId);
    setIsDragging(null);
    setDragOverGroupId(null);
    loadAllDecks();
  };

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
            <Button
              variant="secondary"
              onClick={handleSyncDecks}
              disabled={allDecks.length === 0}
            >
              Sync Decks
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

        <StyledCard>
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
              <GroupTab
                active={!selectedDeckGroup}
                onClick={() => handleSelectGroup(null)}
                onDragOver={(e) => handleDragOver(e, "default")}
                onDrop={(e) => handleDrop(e, "default")}
                isDragOver={dragOverGroupId === "default"}
              >
                All Decks ({allDecks.length})
              </GroupTab>

              {displayedGroups.map((group) => (
                <GroupTab
                  key={group.id}
                  active={selectedDeckGroup?.id === group.id}
                  onClick={() => handleSelectGroup(group)}
                  onDragOver={(e) => handleDragOver(e, group.id)}
                  onDrop={(e) => handleDrop(e, group.id)}
                  isDragOver={dragOverGroupId === group.id}
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
                />
              </MoveToGroupPanel>
            )}
          </Card.Content>
        </StyledCard>

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
            {displayedDecks.map((deck) => {
              const coverCard = getCoverCard(deck);
              const deckId = deck.id || `deck_${deck.name}`;

              return (
                <DeckCardWrapper
                  key={deckId}
                  selected={selectedDecks.has(deckId)}
                  onClick={() =>
                    isEditingGroups ? toggleDeckSelection(deckId) : null
                  }
                  onContextMenu={(e) => handleDeckContextMenu(deck, e)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deck)}
                  onDragEnd={handleDragEnd}
                  $isDragging={isDragging === deckId}
                >
                  {isEditingGroups && (
                    <SelectCheckbox
                      type="checkbox"
                      checked={selectedDecks.has(deckId)}
                      onChange={() => toggleDeckSelection(deckId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <Card.Content>
                    <DeckInfoContainer>
                      <div>
                        <DeckTitle>{deck.name}</DeckTitle>
                        <DeckMeta>
                          <MetaItem>Main: {deck.mainDeck.length}</MetaItem>
                          <MetaItem>Extra: {deck.extraDeck.length}</MetaItem>
                          {deck.groupId && (
                            <GroupBadge variant="primary" size="sm" pill>
                              {deckGroups.find((g) => g.id === deck.groupId)
                                ?.name || "Unknown Group"}
                            </GroupBadge>
                          )}
                        </DeckMeta>
                      </div>

                      {coverCard && (
                        <DeckCoverContainer>
                          <DeckCoverCard
                            src={`https://images.ygoprodeck.com/images/cards_small/${coverCard.id}.jpg`}
                            alt={coverCard.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                "https://images.ygoprodeck.com/images/cards_small/back_high.jpg";
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (e.button === 2) {
                                e.preventDefault();
                                const cardSelection = prompt(
                                  "Enter card ID to set as cover:"
                                );
                                if (cardSelection) {
                                  const cardId = parseInt(cardSelection);
                                  if (!isNaN(cardId)) {
                                    setCoverCard(deckId, cardId);
                                  }
                                }
                              }
                            }}
                          />
                          <ChangeCoverButton
                            onClick={(e) => {
                              e.stopPropagation();
                              const cardSelection = prompt(
                                "Enter card ID to set as cover:"
                              );
                              if (cardSelection) {
                                const cardId = parseInt(cardSelection);
                                if (!isNaN(cardId)) {
                                  setCoverCard(deckId, cardId);
                                }
                              }
                            }}
                          >
                            Change Cover
                          </ChangeCoverButton>
                        </DeckCoverContainer>
                      )}
                    </DeckInfoContainer>

                    <ButtonContainer>
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/my/decks/${deckId}`);
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/duel?deck=${deckId}`);
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
                </DeckCardWrapper>
              );
            })}
          </DeckGrid>
        )}

        <DeckSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          decks={allDecks}
          selectedDeckGroupId={selectedDeckGroup?.id}
          updateDeck={updateDeck}
        />
      </PageContainer>

      {activeDeckContextMenu &&
        createPortal(
          <ContextMenuContainer
            className="deck-context-menu"
            style={{
              top: `${contextMenuRef.current.y}px`,
              left: `${contextMenuRef.current.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DeckActions
              deck={
                displayedDecks.find(
                  (d) => (d.id || `deck_${d.name}`) === activeDeckContextMenu
                )!
              }
              onRenameDeck={(name) => {
                const deck = displayedDecks.find(
                  (d) => (d.id || `deck_${d.name}`) === activeDeckContextMenu
                )!;
                handleRenameDeck(deck, name);
              }}
              onClearDeck={() => {
                const deck = displayedDecks.find(
                  (d) => (d.id || `deck_${d.name}`) === activeDeckContextMenu
                )!;
                handleClearDeck(deck);
              }}
              onImportDeck={handleImportDeck}
              onCopyDeck={() => {
                const deck = displayedDecks.find(
                  (d) => (d.id || `deck_${d.name}`) === activeDeckContextMenu
                )!;
                handleCopyDeck(deck);
              }}
              onDeleteDeck={() => {
                const deck = displayedDecks.find(
                  (d) => (d.id || `deck_${d.name}`) === activeDeckContextMenu
                )!;
                deleteDeck(deck);
              }}
              onCreateCollection={() => {
                const deck = displayedDecks.find(
                  (d) => (d.id || `deck_${d.name}`) === activeDeckContextMenu
                )!;
                handleCreateCollection(deck);
              }}
              showDropdownImmediately={true}
              deckGroups={deckGroups}
              onMoveDeckToGroup={(groupId) => {
                const deck = displayedDecks.find(
                  (d) => (d.id || `deck_${d.name}`) === activeDeckContextMenu
                )!;
                handleMoveDeckToGroup(deck, groupId);
              }}
            />
          </ContextMenuContainer>,
          document.body
        )}
    </AppLayout>
  );
};

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

const StyledCard = styled.div`
  background-color: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  margin-bottom: 24px;
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

const GroupTab = styled.div<{ active: boolean; isDragOver?: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${(props) =>
    props.isDragOver
      ? theme.colors.primary.light
      : props.active
      ? theme.colors.primary.main
      : theme.colors.background.card};
  color: ${(props) =>
    props.active || props.isDragOver
      ? theme.colors.text.inverse
      : theme.colors.text.primary};
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  transition: all ${theme.transitions.default};
  display: flex;
  align-items: center;
  position: relative;
  border: ${(props) =>
    props.isDragOver ? `2px dashed ${theme.colors.primary.dark}` : "none"};
  transform: ${(props) => (props.isDragOver ? "scale(1.05)" : "none")};

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

const DeckCardWrapper = styled.div<{
  selected?: boolean;
  $isDragging?: boolean;
}>`
  position: relative;
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
    box-shadow ${theme.transitions.default},
    opacity ${theme.transitions.default};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  opacity: ${(props) => (props.$isDragging ? 0.6 : 1)};
  transform: ${(props) => (props.$isDragging ? "scale(0.98)" : "none")};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
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
  z-index: 1;
`;

const DeckInfoContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.md};
`;

const DeckCoverContainer = styled.div`
  position: relative;
  margin-left: ${theme.spacing.md};
  flex-shrink: 0;
`;

const DeckCoverCard = styled.img`
  width: 70px;
  height: 102px;
  border-radius: ${theme.borderRadius.sm};
  box-shadow: ${theme.shadows.md};
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
    z-index: 5;
  }
`;

const ChangeCoverButton = styled.button`
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.size.xs};
  cursor: pointer;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;

  ${DeckCoverContainer}:hover & {
    opacity: 1;
  }
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
  text-align: center;

  p {
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing.lg};
    font-size: ${theme.typography.size.md};
  }
`;

const ContextMenuContainer = styled.div`
  position: fixed;
  z-index: 1000;
  background-color: ${theme.colors.background.paper};
  box-shadow: ${theme.shadows.md};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  width: 300px;
  max-height: 80vh;
  border: 1px solid ${theme.colors.border.default};
  display: flex;
  flex-direction: column;

  .deck-actions {
    margin-bottom: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .actions-toggle {
    display: none;
  }

  .actions-dropdown {
    position: relative;
    right: auto;
    top: auto;
    animation: none;
    box-shadow: none;
    margin-top: 0;
    width: 100%;
    display: block;
    max-height: 80vh;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .actions-dropdown::-webkit-scrollbar {
    width: 8px;
  }

  .actions-dropdown::-webkit-scrollbar-track {
    background: ${theme.colors.background.dark};
    border-radius: 4px;
  }

  .actions-dropdown::-webkit-scrollbar-thumb {
    background: ${theme.colors.primary.main};
    border-radius: 4px;
  }

  .actions-group .group-header {
    position: sticky;
    top: 0;
    background-color: ${theme.colors.background.paper};
    z-index: 1;
    padding-top: 8px;
    padding-bottom: 8px;
    box-shadow: 0 1px 0 ${theme.colors.border.light};
  }

  .actions-group {
    border-bottom: 1px solid ${theme.colors.border.light};
  }

  .actions-group:last-child {
    border-bottom: none;
  }
`;

export default MyDecksPage;
