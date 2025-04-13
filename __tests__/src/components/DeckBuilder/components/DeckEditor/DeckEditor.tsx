import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Card, Deck, CardRole } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";
import { YGOGameUtils } from "ygo-player";
import RoleManager from "../RoleManager/RoleManager";
import VirtualizedCardList from "../VirtualizedCardList";
import "./DeckEditor.css";

interface DeckEditorProps {
  deck: Deck | null;
  onCardSelect: (card: Card) => void;
  onCardRemove: (
    card: Card,
    index: number,
    isExtraDeck: boolean,
    isSideDeck?: boolean
  ) => void;
  onRenameDeck: (newName: string) => void;
  onClearDeck: () => void;
  onReorderCards: (
    sourceIndex: number,
    destinationIndex: number,
    isExtraDeck: boolean,
    isSideDeck?: boolean
  ) => void;
  onMoveCardBetweenDecks?: (
    sourceType: "main" | "extra" | "side",
    targetType: "main" | "extra" | "side",
    cardIndex: number
  ) => void;
  updateDeck?: (deck: Deck) => void;
}

const DeckEditor: React.FC<DeckEditorProps> = ({
  deck,
  onCardSelect,
  onCardRemove,
  onRenameDeck,
  onClearDeck,
  onReorderCards,
  onMoveCardBetweenDecks,
  updateDeck,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(deck?.name || "");
  const [showRoleSelector, setShowRoleSelector] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for measuring container dimensions if needed, but not actively used by default
  const mainDeckRef = useRef<HTMLDivElement>(null);
  const extraDeckRef = useRef<HTMLDivElement>(null);
  const sideDeckRef = useRef<HTMLDivElement>(null);

  // Add a flag to track if auto-sorting is enabled
  const [autoSortEnabled, setAutoSortEnabled] = useState(false);

  // Keep track of the current sort function
  const [currentSortFn, setCurrentSortFn] = useState<string | null>(null);

  // Function to perform sorting based on the current sort function
  const sortDeck = (newDeck: Deck, sortFn: string | null = currentSortFn) => {
    if (!sortFn || sortFn === "none") return newDeck;

    const updatedDeck = { ...newDeck };

    // Sort main deck
    if (sortFn === "level") {
      updatedDeck.mainDeck = [...updatedDeck.mainDeck].sort(
        (a, b) => (b.level || 0) - (a.level || 0)
      );
    } else if (sortFn === "name") {
      updatedDeck.mainDeck = [...updatedDeck.mainDeck].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    } else if (sortFn === "type") {
      // Group cards by name first before sorting
      const cardsByName: Record<string, Card[]> = {};
      updatedDeck.mainDeck.forEach((card) => {
        if (!cardsByName[card.name]) {
          cardsByName[card.name] = [];
        }
        cardsByName[card.name].push(card);
      });

      // Then sort the groups
      const sortedGroups = Object.entries(cardsByName).sort(
        ([aName, aCards], [bName, bCards]) => {
          const a = aCards[0];
          const b = bCards[0];

          // First sort by card type: Monsters -> Spells -> Traps
          const typeOrder = { Monster: 1, Spell: 2, Trap: 3 };
          const aType = a.type.includes("Monster")
            ? "Monster"
            : a.type.includes("Spell")
            ? "Spell"
            : "Trap";
          const bType = b.type.includes("Monster")
            ? "Monster"
            : b.type.includes("Spell")
            ? "Spell"
            : "Trap";

          if (aType !== bType) {
            return typeOrder[aType] - typeOrder[bType];
          }

          // For monsters of the same type, sort by level/rank descending
          if (aType === "Monster" && a.level && b.level) {
            return b.level - a.level;
          }

          // Finally sort by name
          return a.name.localeCompare(b.name);
        }
      );

      // Flatten the sorted groups back into an array
      updatedDeck.mainDeck = sortedGroups.flatMap(([_, cards]) => cards);
    }

    // Sort extra deck with an improved approach as well
    if (sortFn !== "none") {
      // Group extra deck cards by name first
      const extraCardsByName: Record<string, Card[]> = {};
      updatedDeck.extraDeck.forEach((card) => {
        if (!extraCardsByName[card.name]) {
          extraCardsByName[card.name] = [];
        }
        extraCardsByName[card.name].push(card);
      });

      // Sort the groups
      const sortedExtraGroups = Object.entries(extraCardsByName).sort(
        ([aName, aCards], [bName, bCards]) => {
          const a = aCards[0];
          const b = bCards[0];

          // First sort by card type (Fusion -> Synchro -> Xyz -> Link)
          const typeOrder = {
            "Fusion Monster": 1,
            "Synchro Monster": 2,
            "XYZ Monster": 3,
            "Link Monster": 4,
            Other: 5,
          };

          const getTypeValue = (card: Card) => {
            for (const key of Object.keys(typeOrder)) {
              if (card.type.includes(key))
                return typeOrder[key as keyof typeof typeOrder];
            }
            return typeOrder["Other"];
          };

          const aTypeValue = getTypeValue(a);
          const bTypeValue = getTypeValue(b);

          if (aTypeValue !== bTypeValue) {
            return aTypeValue - bTypeValue;
          }

          // For cards of same extra deck type, sort by level/rank
          if (a.level && b.level) {
            return b.level - a.level;
          }

          // Finally by name
          return a.name.localeCompare(b.name);
        }
      );

      // Flatten the sorted groups back into an array
      updatedDeck.extraDeck = sortedExtraGroups.flatMap(([_, cards]) => cards);
    }

    return updatedDeck;
  };

  // Modify the useEffect that handles deck updates
  useEffect(() => {
    // Only sort automatically when a card is added or removed, and auto-sort is enabled
    if (autoSortEnabled && currentSortFn && deck) {
      const sortedDeck = sortDeck(deck);
      if (
        JSON.stringify(sortedDeck.mainDeck) !== JSON.stringify(deck.mainDeck) ||
        JSON.stringify(sortedDeck.extraDeck) !== JSON.stringify(deck.extraDeck)
      ) {
        updateDeck(sortedDeck);
      }
    }
  }, [deck?.mainDeck.length, deck?.extraDeck.length]);

  // We'll keep these states for potential future use but won't use them by default
  const [dimensions, setDimensions] = useState({
    mainDeck: { width: 0, height: 0 },
    extraDeck: { width: 0, height: 0 },
    sideDeck: { width: 0, height: 0 },
  });

  // Set to false by default to preserve original layout
  const [useVirtualized, setUseVirtualized] = useState({
    mainDeck: false,
    extraDeck: false,
    sideDeck: false,
  });

  // Threshold for when to use virtualized rendering - set very high to effectively disable by default
  const VIRTUALIZATION_THRESHOLD = 500; // Only activate for extremely large collections

  // Disabled by default, but keeping the code for future use if needed
  useLayoutEffect(() => {
    // This effect is disabled by default to preserve original behavior
    if (!deck || VIRTUALIZATION_THRESHOLD > 100) return;

    // Only measure dimensions if we have cards that exceed threshold
    const shouldMeasure = {
      mainDeck: deck.mainDeck.length > VIRTUALIZATION_THRESHOLD,
      extraDeck: deck.extraDeck.length > VIRTUALIZATION_THRESHOLD,
      sideDeck: (deck.sideDeck?.length || 0) > VIRTUALIZATION_THRESHOLD,
    };

    // Update virtualization flags
    setUseVirtualized(shouldMeasure);

    // Only measure dimensions for sections that need virtualization
    if (
      !shouldMeasure.mainDeck &&
      !shouldMeasure.extraDeck &&
      !shouldMeasure.sideDeck
    ) {
      return;
    }

    // Create ResizeObserver to track container dimensions
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target;
        const width = entry.contentRect.width;
        const height = Math.min(
          500,
          element === mainDeckRef.current
            ? Math.ceil(deck.mainDeck.length / Math.floor(width / 90)) * 126
            : element === extraDeckRef.current
            ? Math.ceil(deck.extraDeck.length / Math.floor(width / 90)) * 126
            : Math.ceil((deck.sideDeck?.length || 0) / Math.floor(width / 90)) *
              126
        );

        // Update dimensions based on which element was observed
        setDimensions((prev) => ({
          ...prev,
          mainDeck:
            element === mainDeckRef.current ? { width, height } : prev.mainDeck,
          extraDeck:
            element === extraDeckRef.current
              ? { width, height }
              : prev.extraDeck,
          sideDeck:
            element === sideDeckRef.current ? { width, height } : prev.sideDeck,
        }));
      });
    });

    // Observe all deck container refs
    if (shouldMeasure.mainDeck && mainDeckRef.current) {
      resizeObserver.observe(mainDeckRef.current);
    }
    if (shouldMeasure.extraDeck && extraDeckRef.current) {
      resizeObserver.observe(extraDeckRef.current);
    }
    if (shouldMeasure.sideDeck && sideDeckRef.current) {
      resizeObserver.observe(sideDeckRef.current);
    }

    // Cleanup observer on unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, [deck?.mainDeck.length, deck?.extraDeck.length, deck?.sideDeck?.length]);

  const roleColors: Record<CardRole, string> = {
    Starter: "#4CAF50",
    Extender: "#2196F3",
    Handtrap: "#9C27B0",
    BoardBreaker: "#F44336",
    Engine: "#FF9800",
    NonEngine: "#607D8B",
    Garnets: "#795548",
    NormalSummon: "#009688", // Color for Normal Summon
    Flexible: "#9E9E9E",
  };

  const availableRoles: CardRole[] = [
    "Starter",
    "Extender",
    "Handtrap",
    "BoardBreaker",
    "Engine",
    "NonEngine",
    "Garnets",
    "NormalSummon", // Added NormalSummon
    "Flexible",
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".role-selector-popup")) {
        setShowRoleSelector(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNameSubmit = () => {
    if (editedName.trim() && editedName !== deck?.name) {
      onRenameDeck(editedName.trim()); // Calls the parent's rename function
    }
    setIsEditingName(false);
  };

  // Enhanced handleDragStart to better support deck transfers
  const handleDragStart = (
    e: React.DragEvent,
    index: number,
    originalIndex: number, // Add original index parameter
    isExtra: boolean,
    isSide: boolean = false
  ) => {
    const dragData = { index: originalIndex, isExtra, isSide }; // Use original index
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    // Add a small delay to ensure the drag is actually starting
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.style.cursor = "grabbing";
      }
    });
  };

  const handleDragEnd = () => {
    if (containerRef.current) {
      containerRef.current.style.cursor = "default";
    }
  };

  // Enhanced handleDrop to support cross-deck transfers with proper restrictions
  const handleDrop = (
    e: React.DragEvent,
    dropIndex: number,
    isExtraDeck: boolean,
    isSideDeck: boolean = false
  ) => {
    e.preventDefault();
    try {
      const dragData = JSON.parse(e.dataTransfer.getData("application/json"));

      // If source and destination deck types match, reorder within the same deck
      if (dragData.isExtra === isExtraDeck && dragData.isSide === isSideDeck) {
        onReorderCards(dragData.index, dropIndex, isExtraDeck, isSideDeck);
        return;
      }

      // Handle transfers between decks
      if (onMoveCardBetweenDecks) {
        let sourceType: "main" | "extra" | "side";
        let targetType: "main" | "extra" | "side";

        // Determine source deck type
        if (dragData.isSide) {
          sourceType = "side";
        } else if (dragData.isExtra) {
          sourceType = "extra";
        } else {
          sourceType = "main";
        }

        // Determine target deck type
        if (isSideDeck) {
          targetType = "side";
        } else if (isExtraDeck) {
          targetType = "extra";
        } else {
          targetType = "main";
        }

        // Prevent moving extra deck cards to main deck
        if (sourceType === "extra" && targetType === "main") {
          alert("Extra Deck cards cannot be moved to the Main Deck");
          return;
        }

        // Call the move function if source and target are different
        if (sourceType !== targetType) {
          onMoveCardBetweenDecks(sourceType, targetType, dragData.index);
        }
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  const handleSort = () => {
    if (!deck || !updateDeck) return;

    updateDeck({
      ...deck,
      mainDeck: YGOGameUtils.sortCards(deck.mainDeck),
      extraDeck: YGOGameUtils.sortCards(deck.extraDeck),
    });
  };

  const handleUpdateCardRole = (
    cardId: number,
    role: CardRole,
    isAutoDetected: boolean
  ) => {
    if (!deck || !updateDeck) return;

    const updatedDeck = {
      ...deck,
      mainDeck: deck.mainDeck.map((card) =>
        card.id === cardId
          ? {
              ...card,
              // Convert single role to array of roles or add to existing roles array
              roleInfo: card.roleInfo?.roles
                ? {
                    ...card.roleInfo,
                    roles: card.roleInfo.roles.includes(role)
                      ? card.roleInfo.roles.filter((r) => r !== role) // Remove role if already exists (toggle)
                      : [...card.roleInfo.roles, role], // Add role if doesn't exist
                    isAutoDetected,
                  }
                : { roles: [role], isAutoDetected },
            }
          : card
      ),
      extraDeck: deck.extraDeck.map((card) =>
        card.id === cardId
          ? {
              ...card,
              roleInfo: card.roleInfo?.roles
                ? {
                    ...card.roleInfo,
                    roles: card.roleInfo.roles.includes(role)
                      ? card.roleInfo.roles.filter((r) => r !== role)
                      : [...card.roleInfo.roles, role],
                    isAutoDetected,
                  }
                : { roles: [role], isAutoDetected },
            }
          : card
      ),
      sideDeck:
        deck.sideDeck?.map((card) =>
          card.id === cardId
            ? {
                ...card,
                roleInfo: card.roleInfo?.roles
                  ? {
                      ...card.roleInfo,
                      roles: card.roleInfo.roles.includes(role)
                        ? card.roleInfo.roles.filter((r) => r !== role)
                        : [...card.roleInfo.roles, role],
                      isAutoDetected,
                    }
                  : { roles: [role], isAutoDetected },
              }
            : card
        ) || [],
    };

    updateDeck(updatedDeck);
  };

  const handleRoleIconClick = (
    e: React.MouseEvent,
    cardId: number,
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const uniqueId = `${cardId}-${index}`;
    setShowRoleSelector(showRoleSelector === uniqueId ? null : uniqueId);
  };

  const mainDeckCards =
    deck?.mainDeck.map((card, index) => ({ card, originalIndex: index })) || [];
  const extraDeckCards =
    deck?.extraDeck.map((card, index) => ({ card, originalIndex: index })) ||
    [];

  if (!deck) {
    return (
      <div className="deck-editor empty-state">
        <p>Select a deck to start editing</p>
      </div>
    );
  }

  return (
    <div className="deck-editor" ref={containerRef}>
      <div className="deck-editor-header">
        {isEditingName ? (
          <div className="deck-name-edit">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={() => {
                setIsEditingName(false);
                onRenameDeck(editedName);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditingName(false);
                  onRenameDeck(editedName);
                } else if (e.key === "Escape") {
                  setIsEditingName(false);
                  setEditedName(deck?.name || "");
                }
              }}
              autoFocus
            />
          </div>
        ) : (
          <h3
            className="deck-name"
            onClick={() => {
              setIsEditingName(true);
              setEditedName(deck?.name || "");
            }}
          >
            {deck?.name}
            <span className="edit-hint">(click to edit)</span>
          </h3>
        )}

        <button
          className="sort-button"
          title="Sort cards by type"
          onClick={() => {
            if (deck && updateDeck) {
              // Apply the sorting directly
              const sortFn = "type"; // Default sort by type
              setCurrentSortFn(sortFn);
              const sortedDeck = sortDeck(deck, sortFn);
              updateDeck(sortedDeck);
            }
          }}
        >
          <span>Sort</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="9" x2="20" y2="9"></line>
            <line x1="4" y1="15" x2="20" y2="15"></line>
            <line x1="10" y1="3" x2="8" y2="21"></line>
            <line x1="16" y1="3" x2="14" y2="21"></line>
          </svg>
        </button>
      </div>

      <div className="deck-controls">
        <h4>Main Deck ({deck?.mainDeck.length || 0}/60)</h4>
      </div>

      <div className="current-deck">
        <div
          className="card-grid"
          ref={mainDeckRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, deck.mainDeck.length || 0, false, false)}
        >
          {mainDeckCards.map(({ card, originalIndex }, index) => (
            <div
              key={`${card.id}-${originalIndex}`}
              className="deck-card-container"
              draggable="true"
              onDragStart={(e) =>
                handleDragStart(e, index, originalIndex, false)
              } // Pass originalIndex
              onDragEnd={handleDragEnd}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Add this to prevent bubbling
              }}
              onDrop={(e) => {
                e.stopPropagation(); // Add this to prevent the event from bubbling up
                handleDrop(e, originalIndex, false);
              }}
              onContextMenu={(e) =>
                handleRoleIconClick(e, card.id, originalIndex)
              }
            >
              <img
                src={getCardImageUrl(card, "small")}
                alt={card.name}
                className="deck-card"
                onClick={() => onCardSelect(card)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `${
                    import.meta.env.VITE_YGO_CDN_URL
                  }/images/cards/card_back.jpg`;
                }}
              />
              {card.roleInfo?.roles && card.roleInfo.roles.length > 0 && (
                <div className="card-roles-container">
                  {card.roleInfo.roles.map((role, i) => (
                    <div
                      key={role}
                      className="card-role-indicator"
                      style={{
                        backgroundColor: roleColors[role],
                        top: `${4 + i * 18}px`, // Stack the indicators
                      }}
                    >
                      {role}
                    </div>
                  ))}
                </div>
              )}
              {showRoleSelector === `${card.id}-${originalIndex}` && (
                <div
                  className="role-selector-popup"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      className={`role-option ${
                        card.roleInfo?.roles?.includes(role) ? "active" : ""
                      }`}
                      style={{
                        borderColor: roleColors[role],
                        backgroundColor: card.roleInfo?.roles?.includes(role)
                          ? roleColors[role]
                          : "white",
                        color: card.roleInfo?.roles?.includes(role)
                          ? "white"
                          : "black",
                      }}
                      onClick={() => {
                        handleUpdateCardRole(card.id, role, false);
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="remove-card"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardRemove(card, originalIndex, false);
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <div className="deck-section-header">
          <h4>Extra Deck ({deck?.extraDeck.length || 0}/15)</h4>
        </div>
        <div
          className="card-grid"
          ref={extraDeckRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, deck.extraDeck.length || 0, true, false)}
        >
          {extraDeckCards.map(({ card, originalIndex }, index) => (
            <div
              key={`${card.id}-${originalIndex}`}
              className="deck-card-container"
              draggable="true"
              onDragStart={(e) =>
                handleDragStart(e, index, originalIndex, true)
              } // Pass originalIndex
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index, true)}
              onContextMenu={(e) =>
                handleRoleIconClick(e, card.id, originalIndex)
              }
            >
              <img
                src={getCardImageUrl(card, "small")}
                alt={card.name}
                className="deck-card"
                onClick={() => onCardSelect(card)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `${
                    import.meta.env.VITE_YGO_CDN_URL
                  }/images/cards/card_back.jpg`;
                }}
              />
              {card.roleInfo?.roles && card.roleInfo.roles.length > 0 && (
                <div className="card-roles-container">
                  {card.roleInfo.roles.map((role, i) => (
                    <div
                      key={role}
                      className="card-role-indicator"
                      style={{
                        backgroundColor: roleColors[role],
                        top: `${4 + i * 18}px`, // Stack the indicators
                      }}
                    >
                      {role}
                    </div>
                  ))}
                </div>
              )}
              {showRoleSelector === `${card.id}-${originalIndex}` && (
                <div
                  className="role-selector-popup"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      className={`role-option ${
                        card.roleInfo?.roles?.includes(role) ? "active" : ""
                      }`}
                      style={{
                        borderColor: roleColors[role],
                        backgroundColor: card.roleInfo?.roles?.includes(role)
                          ? roleColors[role]
                          : "white",
                        color: card.roleInfo?.roles?.includes(role)
                          ? "white"
                          : "black",
                      }}
                      onClick={() => {
                        handleUpdateCardRole(card.id, role, false);
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="remove-card"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardRemove(card, originalIndex, true);
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <div className="deck-section-header">
          <h4>Side Deck ({deck?.sideDeck?.length || 0}/15)</h4>
        </div>
        <div
          className="card-grid"
          ref={sideDeckRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) =>
            handleDrop(e, deck?.sideDeck?.length || 0, false, true)
          }
        >
          {deck?.sideDeck?.map((card, index) => (
            <div
              key={`side-${card.id}-${index}`}
              className="deck-card-container"
              draggable="true"
              onDragStart={(e) => {
                handleDragStart(e, index, index, false, true); // Pass the index twice (as original index)
              }}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                handleDrop(e, index, false, true);
              }}
              onContextMenu={(e) => handleRoleIconClick(e, card.id, index)}
            >
              <img
                src={getCardImageUrl(card, "small")}
                alt={card.name}
                className="deck-card"
                onClick={() => onCardSelect(card)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `${
                    import.meta.env.VITE_YGO_CDN_URL
                  }/images/cards/card_back.jpg`;
                }}
              />
              {card.roleInfo?.roles && card.roleInfo.roles.length > 0 && (
                <div className="card-roles-container">
                  {card.roleInfo.roles.map((role, i) => (
                    <div
                      key={role}
                      className="card-role-indicator"
                      style={{
                        backgroundColor: roleColors[role],
                        top: `${4 + i * 18}px`, // Stack the indicators
                      }}
                    >
                      {role}
                    </div>
                  ))}
                </div>
              )}
              {showRoleSelector === `${card.id}-${index}` && (
                <div
                  className="role-selector-popup"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      className={`role-option ${
                        card.roleInfo?.roles?.includes(role) ? "active" : ""
                      }`}
                      style={{
                        borderColor: roleColors[role],
                        backgroundColor: card.roleInfo?.roles?.includes(role)
                          ? roleColors[role]
                          : "white",
                        color: card.roleInfo?.roles?.includes(role)
                          ? "white"
                          : "black",
                      }}
                      onClick={() => {
                        handleUpdateCardRole(card.id, role, false);
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="remove-card"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardRemove(card, index, false, true);
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="deck-analysis">
        <h4>Card Roles Analysis</h4>
        <RoleManager
          deck={[...deck.mainDeck, ...deck.extraDeck]}
          updateCardRole={handleUpdateCardRole}
        />
      </div>
    </div>
  );
};

export default DeckEditor;
