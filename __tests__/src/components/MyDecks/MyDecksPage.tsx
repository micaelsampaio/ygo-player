import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { YGODeckToImage } from "ygo-core-images-utils";
import { useDeckGroups } from "../DeckBuilder/hooks/useDeckGroups";
import { Deck, DeckGroup, Card } from "../DeckBuilder/types";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card as CardUI, Badge, TextField, Select } from "../UI";
import DeckSyncModal from "../DeckBuilder/components/DeckSyncModal/DeckSyncModal";
import DeckActions from "../shared/DeckActions";
import { createPortal } from "react-dom";
import { createCollectionFromDeck } from "../Collections/contex";
import { YGOCardGrid } from "../UI/YGOCard";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../utils/cardImages";
import { useKaibaNet } from "../../hooks/useKaibaNet";
import { createRoom } from "../../utils/roomUtils";

// New interface for the CoverCardModal component
interface CoverCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck | null;
  onSelectCoverCard: (cardId: number) => void;
  currentCoverId?: number;
}

// New CoverCardModal component for selecting cover cards
const CoverCardModal: React.FC<CoverCardModalProps> = ({
  isOpen,
  onClose,
  deck,
  onSelectCoverCard,
  currentCoverId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("main");

  if (!isOpen || !deck) return null;

  const allCards = [
    ...deck.mainDeck,
    ...deck.extraDeck,
    ...(deck.sideDeck || []),
  ];

  const filteredCards = allCards.filter((card: Card) =>
    card.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mainDeckCards = deck.mainDeck.filter((card: Card) =>
    card.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extraDeckCards = deck.extraDeck.filter((card: Card) =>
    card.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayCards =
    activeTab === "all"
      ? filteredCards
      : activeTab === "main"
      ? mainDeckCards
      : extraDeckCards;

  const handleCardSelect = (card: Card) => {
    onSelectCoverCard(card.id);
    onClose();
  };

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h3>Select Cover Card for {deck.name}</h3>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <ModalBody>
          <SearchBar
            type="text"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <TabsContainer>
            <TabButton
              $active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            >
              All Cards ({allCards.length})
            </TabButton>
            <TabButton
              $active={activeTab === "main"}
              onClick={() => setActiveTab("main")}
            >
              Main Deck ({deck.mainDeck.length})
            </TabButton>
            <TabButton
              $active={activeTab === "extra"}
              onClick={() => setActiveTab("extra")}
            >
              Extra Deck ({deck.extraDeck.length})
            </TabButton>
          </TabsContainer>

          <CardGridContainer>
            <YGOCardGrid gap="8px">
              {displayCards.map((card: Card, index: number) => (
                <CardContainer
                  key={`${card.id}-${index}`}
                  $selected={card.id === currentCoverId}
                  onClick={() => handleCardSelect(card)}
                >
                  <CardImage
                    src={getCardImageUrl(card.id, "small")}
                    alt={card.name}
                    title={card.name}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = CARD_BACK_IMAGE;
                    }}
                  />
                  {card.id === currentCoverId && <SelectedIndicator />}
                </CardContainer>
              ))}
            </YGOCardGrid>

            {displayCards.length === 0 && (
              <EmptyMessage>
                No cards found matching "{searchTerm}"
              </EmptyMessage>
            )}
          </CardGridContainer>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};

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
    updateDeckGroup,
  } = useDeckGroups();

  // New state for nested group navigation
  const [breadcrumbs, setBreadcrumbs] = useState<DeckGroup[]>([]);
  const [newGroupParentId, setNewGroupParentId] = useState<string | undefined>(
    undefined
  );
  const [showGroupMenu, setShowGroupMenu] = useState<string | null>(null);

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
  const [isCoverCardModalOpen, setIsCoverCardModalOpen] = useState(false);
  const [currentDeckForCoverSelection, setCurrentDeckForCoverSelection] =
    useState<Deck | null>(null);
  const kaibaNet = useKaibaNet();

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

  const handleCreateNestedGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup = createDeckGroup(newGroupName);
    if (newGroup) {
      if (newGroupParentId) {
        updateDeckGroup(newGroup.id, { parentId: newGroupParentId });
      }

      setSelectedDeckGroup(newGroup);
      setNewGroupName("");
      setNewGroupParentId(undefined);
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

    if (!group) {
      setBreadcrumbs([]);
    } else {
      const newBreadcrumbs: DeckGroup[] = [group];
      let currentGroup = group;

      while (currentGroup.parentId) {
        const parent = deckGroups.find((g) => g.id === currentGroup.parentId);
        if (parent) {
          newBreadcrumbs.unshift(parent);
          currentGroup = parent;
        } else {
          break;
        }
      }

      setBreadcrumbs(newBreadcrumbs);
    }
  };

  const navigateToParentGroup = (group: DeckGroup | null) => {
    if (!group || !group.parentId) {
      setSelectedDeckGroup(null);
      setBreadcrumbs([]);
      return;
    }

    const parentGroup = deckGroups.find((g) => g.id === group.parentId);
    if (parentGroup) {
      setSelectedDeckGroup(parentGroup);

      const parentIndex = breadcrumbs.findIndex((g) => g.id === parentGroup.id);
      if (parentIndex >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, parentIndex + 1));
      }
    } else {
      setSelectedDeckGroup(null);
      setBreadcrumbs([]);
    }
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
      cdnUrl: import.meta.env.VITE_YGO_CDN_URL,
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
    const newDeckName = `New Deck ${allDecks.length + 1}`;
    const newDeckId = `deck_${newDeckName}`;

    const newDeck = {
      id: newDeckId,
      name: newDeckName,
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

    if (deck.coverCardId) {
      const cardFromDeck = [
        ...deck.mainDeck,
        ...deck.extraDeck,
        ...(deck.sideDeck || []),
      ].find((card) => card.id === deck.coverCardId);
      if (cardFromDeck) {
        return cardFromDeck;
      }
    }

    if (coverCards[deckId]) {
      const cardFromCoverCardsStore = [
        ...deck.mainDeck,
        ...deck.extraDeck,
        ...(deck.sideDeck || []),
      ].find((card) => card.id === coverCards[deckId]);
      if (cardFromCoverCardsStore) {
        return cardFromCoverCardsStore;
      }
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
      const deckData = localStorage.getItem(deckId);
      if (deckData) {
        const deck = JSON.parse(deckData);
        deck.coverCardId = cardId;
        localStorage.setItem(deckId, JSON.stringify(deck));
      }

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

  const handleGroupDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    groupId: string
  ) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const handleGroupDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("drag-over");
  };

  const handleGroupDrop = (
    e: React.DragEvent<HTMLDivElement>,
    groupId: string
  ) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const deckId = e.dataTransfer.getData("text/plain");
    if (deckId) {
      moveDeckToGroup(deckId, groupId);
      loadAllDecks();
    }
  };

  const getChildGroups = useCallback(
    (parentId: string | null) => {
      return deckGroups.filter((group) =>
        parentId === null
          ? !group.parentId &&
            !(group.id === "default" && group.name === "All Decks")
          : group.parentId === parentId
      );
    },
    [deckGroups]
  );

  const displayedGroups = deckGroups.filter(
    (group) => !(group.id === "default" && group.name === "All Decks")
  );

  const openCoverCardModal = (deck: Deck) => {
    setCurrentDeckForCoverSelection(deck);
    setIsCoverCardModalOpen(true);
  };

  const handleDuelWithDeck = async (deck: Deck) => {
    try {
      const duelData = {
        players: [
          {
            name: "player1",
            mainDeck: [...deck.mainDeck],
            extraDeck: deck.extraDeck || [],
          },
          {
            name: "player2",
            mainDeck: [],
            extraDeck: [],
          },
        ],
        options: {
          shuffleDecks: true,
        },
      };

      const navigationState = await createRoom(kaibaNet, duelData);

      navigate(`/duel/${navigationState.roomId}`, {
        state: navigationState,
      });
    } catch (error) {
      console.error("Failed to start duel with deck:", error);
      alert(
        `Failed to start duel: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>My Decks</h1>
          <HeaderActions>
            <Button
              variant="primary"
              size="md"
              onClick={handleSyncDecks}
              className="btn-icon"
            >
              <SyncIcon>↻</SyncIcon>
              Sync Decks
            </Button>
            <Button
              variant={isEditingGroups ? "primary" : "tertiary"}
              size="md"
              onClick={() => setIsEditingGroups(!isEditingGroups)}
              className="btn-icon"
            >
              <GroupsIcon>📁</GroupsIcon>
              {isEditingGroups ? "Done" : "Manage Groups"}
            </Button>
          </HeaderActions>
        </PageHeader>

        {syncResult && (
          <SyncNotification $success={syncResult.success}>
            {syncResult.message}
          </SyncNotification>
        )}

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

        <BreadcrumbContainer>
          <BreadcrumbItem
            onClick={() => handleSelectGroup(null)}
            $isActive={!selectedDeckGroup}
          >
            All Decks
          </BreadcrumbItem>

          {breadcrumbs.map((group, index) => (
            <React.Fragment key={group.id}>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem
                onClick={() => {
                  handleSelectGroup(group);
                  setBreadcrumbs(breadcrumbs.slice(0, index + 1));
                }}
                $isActive={selectedDeckGroup?.id === group.id}
              >
                {group.name}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbContainer>

        <DeckFilterBar>
          <FilterButton
            active={!selectedDeckGroup}
            onClick={() => handleSelectGroup(null)}
            onDragOver={(e) => handleGroupDragOver(e, "default")}
            onDragLeave={handleGroupDragLeave}
            onDrop={(e) => handleGroupDrop(e, "default")}
          >
            All Decks
          </FilterButton>

          {getChildGroups(selectedDeckGroup?.id || null).map((group) => (
            <GroupButton
              key={group.id}
              active={selectedDeckGroup?.id === group.id}
              onClick={() => handleSelectGroup(group)}
              onDragOver={(e) => handleGroupDragOver(e, group.id)}
              onDragLeave={handleGroupDragLeave}
              onDrop={(e) => handleGroupDrop(e, group.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowGroupMenu(showGroupMenu === group.id ? null : group.id);
              }}
            >
              <GroupContent>
                <GroupName>{group.name}</GroupName>
                {deckGroups.some((g) => g.parentId === group.id) && (
                  <NestedIndicator>•••</NestedIndicator>
                )}
              </GroupContent>

              {showGroupMenu === group.id && (
                <GroupContextMenu onClick={(e) => e.stopPropagation()}>
                  <MenuButton
                    onClick={() => {
                      setNewGroupParentId(group.id);
                      setIsEditingGroups(true);
                    }}
                  >
                    Add Subgroup
                  </MenuButton>
                  {group.id !== "default" && (
                    <MenuButton onClick={() => handleDeleteGroup(group)}>
                      Delete Group
                    </MenuButton>
                  )}
                </GroupContextMenu>
              )}
            </GroupButton>
          ))}

          {isEditingGroups && (
            <NewGroupForm>
              <TextField
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={
                  newGroupParentId
                    ? "New subgroup name..."
                    : "New group name..."
                }
                variant="outline"
              />
              <Select
                options={[
                  { value: "", label: "No parent (root level)" },
                  ...deckGroups
                    .filter((g) => g.id !== "default")
                    .map((g) => ({ value: g.id, label: g.name })),
                ]}
                onChange={(value) => setNewGroupParentId(value || undefined)}
                value={newGroupParentId || ""}
                placeholder="Select parent group (optional)"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateNestedGroup}
                disabled={!newGroupName.trim()}
              >
                Create Group
              </Button>
            </NewGroupForm>
          )}

          {selectedDeckGroup?.parentId && (
            <UpLevelButton
              onClick={() => navigateToParentGroup(selectedDeckGroup)}
            >
              ↑ Up to parent
            </UpLevelButton>
          )}
        </DeckFilterBar>

        <UniformGrid>
          <UniformCard>
            <NewDeckCardWrapper onClick={handleCreateNewDeck}>
              <CardUI.Content>
                <NewDeckContent>
                  <PlusIcon>+</PlusIcon>
                  <NewDeckText>New Deck</NewDeckText>
                </NewDeckContent>
              </CardUI.Content>
            </NewDeckCardWrapper>
          </UniformCard>

          {getChildGroups(selectedDeckGroup?.id || null).map((group) => (
            <UniformCard key={`group-${group.id}`}>
              <GroupCardWrapper
                onClick={() => handleSelectGroup(group)}
                onDragOver={(e) => handleGroupDragOver(e, group.id)}
                onDragLeave={handleGroupDragLeave}
                onDrop={(e) => handleGroupDrop(e, group.id)}
                data-group-id={group.id}
              >
                <CardUI.Content>
                  <GroupCardContent>
                    <FolderIcon>📁</FolderIcon>
                    <GroupCardTitle>{group.name}</GroupCardTitle>
                    <GroupStats>
                      <GroupStatItem>
                        {getDecksInGroup(group.id).length} decks
                      </GroupStatItem>
                      {deckGroups.some((g) => g.parentId === group.id) && (
                        <GroupStatItem>Has subgroups</GroupStatItem>
                      )}
                    </GroupStats>

                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectGroup(group);
                      }}
                    >
                      Open Group
                    </ActionButton>
                  </GroupCardContent>
                </CardUI.Content>
              </GroupCardWrapper>
            </UniformCard>
          ))}

          {displayedDecks.length === 0 && allDecks.length === 0 ? (
            <UniformCard>
              <EmptyStateCard>
                <CardUI.Content>
                  <p>You don't have any decks yet.</p>
                  <Button
                    variant="primary"
                    onClick={() => navigate("/deckbuilder")}
                  >
                    Create Your First Deck
                  </Button>
                </CardUI.Content>
              </EmptyStateCard>
            </UniformCard>
          ) : displayedDecks.length === 0 ? (
            <UniformCard>
              <EmptyStateCard>
                <CardUI.Content>
                  <p>
                    No decks in this group. Select a different group or add
                    decks to this group.
                  </p>
                </CardUI.Content>
              </EmptyStateCard>
            </UniformCard>
          ) : (
            displayedDecks.map((deck) => {
              const coverCard = getCoverCard(deck);
              const deckId = deck.id || `deck_${deck.name}`;
              const groupName =
                deck.groupId && deck.groupId !== "default"
                  ? deckGroups.find((g) => g.id === deck.groupId)?.name
                  : null;

              return (
                <UniformCard key={deckId}>
                  <DeckCardWrapper
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
                    <CardUI.Content>
                      <DeckInfoContainer>
                        <div className="deck-info-text">
                          <DeckTitle className="ygo-deck-title">
                            {deck.name}
                          </DeckTitle>
                          {groupName && <GroupTag>{groupName}</GroupTag>}
                          <DeckMeta className="ygo-deck-stats">
                            <MetaItem className="ygo-deck-stat">
                              Main: {deck.mainDeck.length}
                            </MetaItem>
                            <MetaItem className="ygo-deck-stat">
                              Extra: {deck.extraDeck.length}
                            </MetaItem>
                          </DeckMeta>
                        </div>

                        {coverCard && (
                          <DeckCoverContainer>
                            <DeckCoverCard
                              src={getCardImageUrl(coverCard.id, "small")}
                              alt={coverCard.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = CARD_BACK_IMAGE;
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openCoverCardModal(deck);
                              }}
                            />
                            <ChangeCoverButton
                              onClick={(e) => {
                                e.stopPropagation();
                                openCoverCardModal(deck);
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
                            handleDuelWithDeck(deck);
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
                    </CardUI.Content>
                  </DeckCardWrapper>
                </UniformCard>
              );
            })
          )}
        </UniformGrid>

        <DeckSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          decks={allDecks}
          selectedDeckGroupId={selectedDeckGroup?.id}
          updateDeck={updateDeck}
        />

        <CoverCardModal
          isOpen={isCoverCardModalOpen}
          onClose={() => setIsCoverCardModalOpen(false)}
          deck={currentDeckForCoverSelection}
          onSelectCoverCard={(cardId) =>
            setCoverCard(
              currentDeckForCoverSelection?.id ||
                `deck_${currentDeckForCoverSelection?.name}`,
              cardId
            )
          }
          currentCoverId={
            currentDeckForCoverSelection
              ? coverCards[
                  currentDeckForCoverSelection.id ||
                    `deck_${currentDeckForCoverSelection.name}`
                ]
              : undefined
          }
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

const BreadcrumbContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  padding: ${theme.spacing.xs} 0;
`;

const BreadcrumbItem = styled.button<{ $isActive?: boolean }>`
  background: none;
  border: none;
  font-size: ${theme.typography.size.sm};
  cursor: pointer;
  color: ${(props) =>
    props.$isActive ? theme.colors.primary.main : theme.colors.text.secondary};
  font-weight: ${(props) =>
    props.$isActive
      ? theme.typography.weight.bold
      : theme.typography.weight.regular};

  &:hover {
    color: ${theme.colors.primary.dark};
    text-decoration: underline;
  }
`;

const BreadcrumbSeparator = styled.span`
  margin: 0 ${theme.spacing.xs};
  color: ${theme.colors.text.secondary};
`;

const DeckFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.border.light};
  padding-bottom: ${theme.spacing.md};

  .drag-over {
    background-color: ${theme.colors.primary.light}20;
  }
`;

const FilterButton = styled.button<{ active?: boolean }>`
  background-color: ${(props) =>
    props.active ? theme.colors.primary.main : "transparent"};
  color: ${(props) =>
    props.active ? theme.colors.text.inverse : theme.colors.text.primary};
  border: ${(props) =>
    props.active ? "none" : `1px solid ${theme.colors.border.default}`};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  font-size: ${theme.typography.size.sm};
  cursor: pointer;
  transition: all ${theme.transitions.default};

  &:hover {
    background-color: ${(props) =>
      props.active ? theme.colors.primary.dark : theme.colors.background.dark};
  }
`;

const GroupButton = styled.div<{ active?: boolean }>`
  position: relative;
  background-color: ${(props) =>
    props.active ? theme.colors.primary.main : "transparent"};
  color: ${(props) =>
    props.active ? theme.colors.text.inverse : theme.colors.text.primary};
  border: ${(props) =>
    props.active ? "none" : `1px solid ${theme.colors.border.default}`};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  font-size: ${theme.typography.size.sm};
  cursor: pointer;
  transition: all ${theme.transitions.default};
  display: flex;
  align-items: center;

  &:hover {
    background-color: ${(props) =>
      props.active ? theme.colors.primary.dark : theme.colors.background.dark};
  }

  &.drag-over {
    background-color: ${theme.colors.primary.light}20;
  }
`;

const GroupContent = styled.div`
  display: flex;
  align-items: center;
`;

const GroupName = styled.span`
  white-space: nowrap;
`;

const NestedIndicator = styled.span`
  margin-left: ${theme.spacing.sm};
  font-size: ${theme.typography.size.xs};
  opacity: 0.7;
`;

const GroupContextMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  background-color: ${theme.colors.background.paper};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.sm};
  box-shadow: ${theme.shadows.md};
  z-index: 10;
  min-width: 150px;
  margin-top: ${theme.spacing.xs};
`;

const MenuButton = styled.button`
  width: 100%;
  text-align: left;
  padding: ${theme.spacing.sm};
  background: none;
  border: none;
  cursor: pointer;
  color: ${theme.colors.text.primary};

  &:hover {
    background-color: ${theme.colors.background.dark};
  }

  &:not(:last-child) {
    border-bottom: 1px solid ${theme.colors.border.light};
  }
`;

const NewGroupForm = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  align-items: center;
  margin-left: auto;
  background-color: ${theme.colors.background.paper};
  padding: ${theme.spacing.xs};
  border-radius: ${theme.borderRadius.md};
  border: 1px dashed ${theme.colors.border.default};
`;

const UpLevelButton = styled.button`
  background: none;
  border: 1px solid ${theme.colors.border.default};
  color: ${theme.colors.text.secondary};
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: ${theme.typography.size.sm};

  &:hover {
    background-color: ${theme.colors.background.dark};
    color: ${theme.colors.text.primary};
  }
`;

const UniformGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  grid-auto-rows: 1fr;
  gap: ${theme.spacing.md};
`;

const UniformCard = styled.div`
  display: flex;
  min-height: 240px;
`;

const NewDeckCardWrapper = styled.div`
  position: relative;
  border: 2px dashed ${theme.colors.primary.main};
  background-color: ${theme.colors.background.paper};
  cursor: pointer;
  transition: transform ${theme.transitions.default},
    box-shadow ${theme.transitions.default};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  height: 100%;
  width: 100%;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${theme.shadows.md};
    background-color: ${theme.colors.primary.light}20;
  }
`;

const NewDeckContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.md};
  height: 100%;
  min-height: 180px;
`;

const PlusIcon = styled.div`
  font-size: 36px;
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.primary.main};
  margin-bottom: ${theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: ${theme.colors.primary.light}20;
  transition: all ${theme.transitions.default};

  ${NewDeckCardWrapper}:hover & {
    background-color: ${theme.colors.primary.light}40;
    transform: scale(1.1);
  }
`;

const NewDeckText = styled.div`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.primary.main};
  font-size: ${theme.typography.size.lg};
`;

const GroupCardWrapper = styled.div`
  position: relative;
  border: 1px solid ${theme.colors.border.default};
  background-color: ${theme.colors.background.paper};
  cursor: pointer;
  transition: transform ${theme.transitions.default},
    box-shadow ${theme.transitions.default};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  height: 100%;
  width: 100%;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${theme.shadows.md};
  }
`;

const GroupCardContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  padding: ${theme.spacing.md};
`;

const FolderIcon = styled.div`
  font-size: 36px;
  margin-bottom: ${theme.spacing.sm};
`;

const GroupCardTitle = styled.h3`
  margin: 0;
  margin-bottom: ${theme.spacing.xs};
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
`;

const GroupStats = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const GroupStatItem = styled.div`
  font-size: ${theme.typography.size.xs};
  color: ${theme.colors.text.secondary};
  margin: ${theme.spacing.xs} 0;
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
  width: 100%;
  height: 100%;

  &:hover {
    transform: translateY(-4px);
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
  width: 60px;
  height: 87px;
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
  border-radius: ${theme.borderRadius.sm};
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

const GroupTag = styled.div`
  display: inline-block;
  font-size: ${theme.typography.size.xs};
  color: ${theme.colors.text.secondary};
  background-color: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.sm};
  padding: 2px 6px;
  margin-bottom: ${theme.spacing.xs};
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

const EmptyStateCard = styled(CardUI)`
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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  width: 90%;
  max-width: 800px;
  max-height: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.card};
  border-bottom: 1px solid ${theme.colors.border.default};
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size.lg};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.lg};
  cursor: pointer;

  &:hover {
    color: ${theme.colors.error.main};
  }
`;

const ModalBody = styled.div`
  padding: ${theme.spacing.md};
  overflow-y: auto;
  flex: 1;
`;

const SearchBar = styled.input`
  width: 100%;
  padding: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.size.md};
`;

const TabsContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${(props) =>
    props.$active ? theme.colors.primary.main : theme.colors.background.card};
  color: ${(props) =>
    props.$active ? theme.colors.text.inverse : theme.colors.text.primary};
  border: none;
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  font-size: ${theme.typography.size.md};
  font-weight: ${theme.typography.weight.medium};

  &:hover {
    background-color: ${(props) =>
      props.$active ? theme.colors.primary.dark : theme.colors.background.dark};
  }
`;

const CardGridContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const CardContainer = styled.div<{ $selected?: boolean }>`
  position: relative;
  border: ${(props) =>
    props.$selected
      ? `2px solid ${theme.colors.primary.main}`
      : `1px solid ${theme.colors.border.default}`};
  border-radius: ${theme.borderRadius.sm};
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: ${theme.shadows.md};
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

const SelectedIndicator = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;

  &::after {
    content: "✓";
    color: white;
    font-size: ${theme.typography.size["2xl"]};
    font-weight: ${theme.typography.weight.bold};
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.md};
`;

const SyncIcon = styled.span`
  display: inline-flex;
  margin-right: ${theme.spacing.xs};
  font-size: 1.1em;
  font-weight: ${theme.typography.weight.bold};
`;

const GroupsIcon = styled.span`
  display: inline-flex;
  margin-right: ${theme.spacing.xs};
  font-size: 1.1em;
`;

export default MyDecksPage;
