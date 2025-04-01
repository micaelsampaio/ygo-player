import React, { useState, useEffect, useRef } from "react";
import { Card, Deck } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";
import { YGOGameUtils } from "ygo-player";
import RoleManager from "../RoleManager/RoleManager";
import "./DeckEditor.css";

type SortOption = "name" | "cardType" | "monsterType" | "level" | "atk" | "def";

interface DeckEditorProps {
  deck: Deck | null;
  onCardSelect: (card: Card) => void;
  onCardRemove: (card: Card, index: number, isExtraDeck: boolean) => void;
  onRenameDeck: (newName: string) => void; // This prop is for renaming
  onClearDeck: () => void;
  onReorderCards: (
    sourceIndex: number,
    destinationIndex: number,
    isExtraDeck: boolean
  ) => void;
  updateDeck?: (deck: Deck) => void; // Add this prop
}

const DeckEditor: React.FC<DeckEditorProps> = ({
  deck,
  onCardSelect,
  onCardRemove,
  onRenameDeck,
  onClearDeck,
  onReorderCards,
  updateDeck,
}) => {
  const [isEditingName, setIsEditingName] = useState(false); // Controls edit mode
  const [editedName, setEditedName] = useState(deck?.name || ""); // Stores the edited name
  const [showRoleSelector, setShowRoleSelector] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const roleColors: Record<CardRole, string> = {
    Starter: "#4CAF50",
    Extender: "#2196F3",
    Handtrap: "#9C27B0",
    BoardBreaker: "#F44336",
    Engine: "#FF9800",
    NonEngine: "#607D8B",
    Garnets: "#795548",
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

  const handleDragStart = (
    e: React.DragEvent,
    index: number,
    isExtra: boolean
  ) => {
    const dragData = { index, isExtra };
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
  };

  const handleDrop = (
    e: React.DragEvent,
    dropIndex: number,
    isExtraDeck: boolean
  ) => {
    e.preventDefault();
    try {
      const dragData = JSON.parse(e.dataTransfer.getData("application/json"));
      if (dragData.isExtra === isExtraDeck) {
        onReorderCards(dragData.index, dropIndex, isExtraDeck);
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
          ? { ...card, roleInfo: { role, isAutoDetected } }
          : card
      ),
      extraDeck: deck.extraDeck.map((card) =>
        card.id === cardId
          ? { ...card, roleInfo: { role, isAutoDetected } }
          : card
      ),
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
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
                if (e.key === "Escape") {
                  setIsEditingName(false);
                  setEditedName(deck?.name || "");
                }
              }}
              autoFocus
            />
          </div>
        ) : (
          <h2
            className="deck-name"
            onClick={() => {
              if (deck) {
                setIsEditingName(true);
                setEditedName(deck.name);
              }
            }}
          >
            {deck?.name || "No Deck Selected"}
            {deck && <span className="edit-hint">✎</span>}
          </h2>
        )}
      </div>

      <div className="current-deck">
        <div className="deck-controls">
          <h4>Main Deck ({deck.mainDeck.length})</h4>
          <button className="sort-button" onClick={handleSort}>
            <span className="sort-icon">⇅</span>
            Sort
          </button>
        </div>

        <div className="card-grid">
          {mainDeckCards.map(({ card, originalIndex }, index) => (
            <div
              key={`${card.id}-${originalIndex}`}
              className="deck-card-container"
              draggable="true"
              onDragStart={(e) => handleDragStart(e, index, false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index, false)}
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
              {card.roleInfo && (
                <div
                  className="card-role-indicator"
                  style={{ backgroundColor: roleColors[card.roleInfo.role] }}
                >
                  {card.roleInfo.role}
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
                        card.roleInfo?.role === role ? "active" : ""
                      }`}
                      style={{
                        borderColor: roleColors[role],
                        backgroundColor:
                          card.roleInfo?.role === role
                            ? roleColors[role]
                            : "white",
                        color: card.roleInfo?.role === role ? "white" : "black",
                      }}
                      onClick={() => {
                        handleUpdateCardRole(card.id, role, false);
                        setShowRoleSelector(null);
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

        <h4>Extra Deck ({deck?.extraDeck.length || 0})</h4>
        <div className="card-grid">
          {extraDeckCards.map(({ card, originalIndex }, index) => (
            <div
              key={`${card.id}-${originalIndex}`}
              className="deck-card-container"
              draggable="true"
              onDragStart={(e) => handleDragStart(e, index, true)}
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
              {card.roleInfo && (
                <div
                  className="card-role-indicator"
                  style={{ backgroundColor: roleColors[card.roleInfo.role] }}
                >
                  {card.roleInfo.role}
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
                        card.roleInfo?.role === role ? "active" : ""
                      }`}
                      style={{
                        borderColor: roleColors[role],
                        backgroundColor:
                          card.roleInfo?.role === role
                            ? roleColors[role]
                            : "white",
                        color: card.roleInfo?.role === role ? "white" : "black",
                      }}
                      onClick={() => {
                        handleUpdateCardRole(card.id, role, false);
                        setShowRoleSelector(null);
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
