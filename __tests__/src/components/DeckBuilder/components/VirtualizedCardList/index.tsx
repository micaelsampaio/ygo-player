import React, { useCallback } from "react";
import { FixedSizeGrid } from "react-window";
import { Card, CardRole } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";
import "./VirtualizedCardList.css";

interface VirtualizedCardListProps {
  cards: Array<{ card: Card; originalIndex: number }>;
  onCardSelect: (card: Card) => void;
  onCardRemove: (
    card: Card,
    index: number,
    isExtraDeck: boolean,
    isSideDeck?: boolean
  ) => void;
  onRoleIconClick?: (
    e: React.MouseEvent,
    cardId: number,
    originalIndex: number
  ) => void;
  onDragStart?: (
    e: React.DragEvent,
    index: number,
    isExtraDeck: boolean
  ) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent, index: number, isExtraDeck: boolean) => void;
  showRoleSelector?: string | null;
  isExtraDeck?: boolean;
  isSideDeck?: boolean;
  roleColors?: Record<CardRole, string>;
  availableRoles?: CardRole[];
  updateCardRole?: (
    cardId: number,
    role: CardRole,
    isAutoDetected: boolean
  ) => void;
  containerWidth: number;
  containerHeight: number;
}

const VirtualizedCardList: React.FC<VirtualizedCardListProps> = ({
  cards,
  onCardSelect,
  onCardRemove,
  onRoleIconClick,
  onDragStart,
  onDragEnd,
  onDrop,
  showRoleSelector,
  isExtraDeck = false,
  isSideDeck = false,
  roleColors = {},
  availableRoles = [],
  updateCardRole,
  containerWidth,
  containerHeight,
}) => {
  // Calculate optimal grid configuration
  const cardWidth = 80; // Width of each card (in pixels)
  const cardHeight = 116; // Height of each card (in pixels)
  const columnGap = 10; // Gap between columns
  const rowGap = 10; // Gap between rows

  // Calculate number of columns that fit in the container
  const columnsPerRow = Math.max(
    1,
    Math.floor(containerWidth / (cardWidth + columnGap))
  );

  // Calculate row count based on number of cards and columns
  const rowCount = Math.ceil(cards.length / columnsPerRow);

  // Cell renderer function
  const Cell = useCallback(
    ({
      columnIndex,
      rowIndex,
      style,
    }: {
      columnIndex: number;
      rowIndex: number;
      style: React.CSSProperties;
    }) => {
      const index = rowIndex * columnsPerRow + columnIndex;

      // Return empty cell if index is out of bounds
      if (index >= cards.length) {
        return <div style={style} />;
      }

      const { card, originalIndex } = cards[index];
      const uniqueId = `${card.id}-${originalIndex}`;

      return (
        <div
          style={{
            ...style,
            padding: "5px",
          }}
        >
          <div
            className="deck-card-container"
            draggable={onDragStart ? "true" : undefined}
            onDragStart={
              onDragStart
                ? (e) => onDragStart(e, index, isExtraDeck)
                : undefined
            }
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop ? (e) => onDrop(e, index, isExtraDeck) : undefined}
            onContextMenu={
              onRoleIconClick
                ? (e) => onRoleIconClick(e, card.id, originalIndex)
                : undefined
            }
          >
            <img
              src={getCardImageUrl(card.id, "small")}
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
                      backgroundColor: roleColors[role] || "#999",
                      top: `${4 + i * 18}px`, // Stack the indicators
                    }}
                  >
                    {role}
                  </div>
                ))}
              </div>
            )}

            {showRoleSelector === uniqueId && updateCardRole && (
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
                      borderColor: roleColors[role] || "#999",
                      backgroundColor: card.roleInfo?.roles?.includes(role)
                        ? roleColors[role] || "#999"
                        : "white",
                      color: card.roleInfo?.roles?.includes(role)
                        ? "white"
                        : "black",
                    }}
                    onClick={() => {
                      updateCardRole(card.id, role, false);
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
                onCardRemove(card, originalIndex, isExtraDeck, isSideDeck);
              }}
            >
              &times;
            </button>
          </div>
        </div>
      );
    },
    [
      cards,
      columnsPerRow,
      onCardSelect,
      onCardRemove,
      onRoleIconClick,
      onDragStart,
      onDragEnd,
      onDrop,
      showRoleSelector,
      isExtraDeck,
      isSideDeck,
      roleColors,
      availableRoles,
      updateCardRole,
    ]
  );

  return (
    <FixedSizeGrid
      className="virtualized-card-grid"
      columnCount={columnsPerRow}
      columnWidth={cardWidth + columnGap}
      height={Math.min(containerHeight, rowCount * (cardHeight + rowGap))}
      rowCount={rowCount}
      rowHeight={cardHeight + rowGap}
      width={containerWidth}
    >
      {Cell}
    </FixedSizeGrid>
  );
};

export default VirtualizedCardList;
