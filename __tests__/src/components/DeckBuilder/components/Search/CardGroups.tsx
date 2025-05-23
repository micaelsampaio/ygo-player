import React, { useState, useRef, useEffect } from "react";
import { CardGroup, Card } from "../../types";
import { useNavigate } from "react-router-dom";
import "./CardGroups.css";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../../../utils/cardImages";

interface CardGroupsProps {
  cardGroups: CardGroup[];
  selectedGroup: CardGroup | null;
  onSelectGroup: (group: CardGroup) => void;
  onCreateGroup: (name: string, description?: string) => CardGroup | null;
  onUpdateGroup: (groupId: string, updates: Partial<CardGroup>) => void;
  onDeleteGroup: (groupId: string) => boolean;
  onAddCardToGroup: (groupId: string, card: Card) => boolean;
  onRemoveCardFromGroup: (groupId: string, cardId: number) => boolean;
  onCardSelect: (card: Card) => void;
  onAddCardToDeck: (card: Card) => void; // Prop to add a single card to the deck
  onAddAllCardsFromGroup?: (cards: Card[]) => void; // Prop to add all cards from a group to the deck
}

const CardGroups: React.FC<CardGroupsProps> = ({
  cardGroups,
  selectedGroup,
  onSelectGroup,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddCardToGroup,
  onRemoveCardFromGroup,
  onCardSelect,
  onAddCardToDeck,
  onAddAllCardsFromGroup,
}) => {
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    groupId: string;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const handleRemoveCard = (groupId: string, cardId: number) => {
    onRemoveCardFromGroup(groupId, cardId);
  };

  // New function to add all cards from a group to the deck
  const handleAddAllToDeck = (e: React.MouseEvent, cards: Card[]) => {
    e.stopPropagation();
    if (cards.length === 0) return;

    if (window.confirm(`Add all ${cards.length} cards to your deck?`)) {
      if (onAddAllCardsFromGroup) {
        // Use the dedicated function if available
        onAddAllCardsFromGroup(cards);
      } else {
        // Fallback to adding cards one by one
        cards.forEach((card) => {
          onAddCardToDeck(card);
        });
      }
    }
  };

  // Add function to handle drag start for cards
  const handleDragStart = (e: React.DragEvent, card: Card) => {
    // To be compatible with DeckEditor's handleDrop function,
    // we need to format the data correctly using the 'card' property
    const dragData = {
      card: card,
      isFromCardGroups: true,
    };

    // Set the data as a JSON string
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));

    // Create a small drag image rather than using the full image
    const dragElem = document.createElement("div");
    dragElem.style.width = "60px";
    dragElem.style.height = "88px";
    dragElem.style.backgroundImage = `url(${getCardImageUrl(
      card.id,
      "small"
    )})`;
    dragElem.style.backgroundSize = "contain";
    dragElem.style.backgroundRepeat = "no-repeat";
    dragElem.style.position = "absolute";
    dragElem.style.top = "-1000px";

    document.body.appendChild(dragElem);

    e.dataTransfer.setDragImage(dragElem, 30, 44);

    // Clean up the temporary element after the drag starts
    setTimeout(() => {
      document.body.removeChild(dragElem);
    }, 0);
  };

  // Handle right-click on a card group item
  const handleContextMenu = (e: React.MouseEvent, group: CardGroup) => {
    e.preventDefault();
    e.stopPropagation();

    // Position the context menu at the cursor location
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      groupId: group.id,
    });
  };

  // Handle click on the three dots menu icon
  const handleMenuIconClick = (e: React.MouseEvent, group: CardGroup) => {
    e.preventDefault();
    e.stopPropagation();

    // Get the position of the icon that was clicked
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();

    // Position the menu below the icon
    setContextMenu({
      visible: true,
      x: rect.right - 10,
      y: rect.bottom + 5,
      groupId: group.id,
    });
  };

  // Handle the "Edit Group" option in the context menu
  const handleEditGroup = (groupId: string) => {
    // Navigate to the Card Groups management page with the group ID as a URL parameter
    navigate(`/my/cards/groups?group=${groupId}`);
    setContextMenu(null);
  };

  // Handle deleting a group from the context menu
  const handleDeleteFromMenu = (groupId: string) => {
    if (onDeleteGroup(groupId)) {
      setContextMenu(null);
    }
  };

  // Handle navigating to manage groups page
  const handleManageGroups = () => {
    navigate("/my/cards/groups");
    setContextMenu(null);
  };

  // Close the context menu when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node) &&
        contextMenu?.visible
      ) {
        setContextMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu]);

  return (
    <div className="card-groups-container">
      <div className="card-groups-header">
        <h3>Card Groups</h3>
      </div>

      {cardGroups.length === 0 ? (
        <div className="no-collections">
          <p>You don't have any card groups yet.</p>
          <p>Manage your groups in /my/cards/groups</p>
        </div>
      ) : (
        <>
          <div className="help-text">
            <p>
              <strong>Card Groups:</strong> Select a group to view its cards or
              add them all to your deck.
              <br />
              <small>
                Right-click on a group or click the ⋮ icon for more options.
              </small>
            </p>
          </div>
          <div className="card-group-list">
            {cardGroups.map((group) => (
              <div
                key={group.id}
                className={`card-group-item ${
                  selectedGroup?.id === group.id ? "selected" : ""
                }`}
                onClick={() => onSelectGroup(group)}
                onContextMenu={(e) => handleContextMenu(e, group)}
              >
                <div className="group-header">
                  <h4>{group.name}</h4>
                  <div
                    className="group-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="add-all-button"
                      onClick={(e) => handleAddAllToDeck(e, group.cards)}
                      disabled={group.cards.length === 0}
                      title="Add all cards in this group to your deck"
                    >
                      Add All to Deck
                    </button>
                  </div>
                </div>

                {group.description && (
                  <p className="group-description">{group.description}</p>
                )}

                <div className="card-count">{group.cards.length} cards</div>

                {/* Add a clickable menu icon */}
                <div
                  className="menu-icon"
                  onClick={(e) => handleMenuIconClick(e, group)}
                  title="Group options"
                ></div>

                {selectedGroup?.id === group.id && (
                  <div
                    className="collection-cards"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {group.cards.length === 0 ? (
                      <p className="empty-collection">
                        No cards in this group yet.
                      </p>
                    ) : (
                      <div className="cards-grid">
                        {group.cards.map((card) => (
                          <div
                            key={card.id}
                            className="collection-card"
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, card)}
                          >
                            <img
                              src={getCardImageUrl(card.id, "small")}
                              alt={card.name}
                              onClick={() => onCardSelect(card)}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  CARD_BACK_IMAGE;
                              }}
                            />
                            {/* Replace the card action buttons container with individual buttons */}
                            <button
                              className="add-card-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddCardToDeck(card);
                              }}
                              title="Add to deck"
                            >
                              +
                            </button>
                            <button
                              className="remove-card-btn"
                              onClick={() =>
                                handleRemoveCard(group.id, card.id)
                              }
                              title="Remove from group"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="group-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
          }}
        >
          <button
            className="context-menu-item"
            type="button"
            onClick={() => handleEditGroup(contextMenu.groupId)}
          >
            <span className="context-menu-icon">✏️</span>
            <span className="context-menu-text">Edit Group</span>
          </button>
          <button
            className="context-menu-item"
            type="button"
            onClick={() => handleDeleteFromMenu(contextMenu.groupId)}
          >
            <span className="context-menu-icon">🗑️</span>
            <span className="context-menu-text">Delete Group</span>
          </button>
          <button
            className="context-menu-item"
            type="button"
            onClick={handleManageGroups}
          >
            <span className="context-menu-icon">📂</span>
            <span className="context-menu-text">Manage All Groups</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CardGroups;
