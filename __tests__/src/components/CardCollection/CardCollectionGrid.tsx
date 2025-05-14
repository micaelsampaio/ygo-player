import React, { useState } from "react";
import styled from "styled-components";
import {
  Edit,
  Trash2,
  MessageCircle,
  Check,
  Copy,
  CheckSquare,
  Square,
  ChevronDown,
  Plus,
  Save,
  Table,
} from "lucide-react";
import theme from "../../styles/theme";

interface CardItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  set: string;
  condition: string;
  quantity: number;
  price?: number;
  notes?: string;
  dateAdded: string;
}

interface CardCollectionGridProps {
  cards: CardItem[];
  viewMode: "grid" | "list";
  onEditCard?: (card: CardItem) => void;
  onDeleteCard?: (cardId: string) => void;
  onBulkEdit?: (cards: CardItem[]) => void;
}

const CardCollectionGrid: React.FC<CardCollectionGridProps> = ({
  cards,
  viewMode,
  onEditCard,
  onDeleteCard,
  onBulkEdit,
}) => {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [massEditMode, setMassEditMode] = useState(false);
  const [groupedCards, setGroupedCards] = useState<Record<string, CardItem[]>>(
    {}
  );
  const [showGroupedCards, setShowGroupedCards] = useState(false);

  // Group cards by set or rarity
  const groupCardsByProperty = (property: "set" | "rarity") => {
    const grouped: Record<string, CardItem[]> = {};
    cards.forEach((card) => {
      const key = card[property];
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(card);
    });
    setGroupedCards(grouped);
    setShowGroupedCards(true);
  };

  const toggleSelectAll = () => {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cards.map((card) => card.id)));
    }
  };

  const toggleCardSelection = (cardId: string) => {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedCards(newSelection);
  };

  const handleAddAllFromGroup = (groupCards: CardItem[]) => {
    // This function would be implemented in CardCollectionPage component
    // and passed down as a prop to add all cards from a specific group
    console.log(`Adding all ${groupCards.length} cards from group`);
  };

  const handleMassEdit = () => {
    const selectedCardsList = cards.filter((card) =>
      selectedCards.has(card.id)
    );
    if (onBulkEdit) {
      onBulkEdit(selectedCardsList);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (!selectionMode) {
      // Clear any existing selections when enabling selection mode
      setSelectedCards(new Set());
    }
  };

  if (cards.length === 0) {
    return (
      <EmptyState>
        No cards in this collection yet. Add your first card to get started.
      </EmptyState>
    );
  }

  return (
    <div>
      <ToolbarContainer>
        <ToolbarSection>
          <ToolbarButton
            title="Toggle selection mode"
            $active={selectionMode}
            onClick={toggleSelectionMode}
          >
            <CheckSquare size={16} />
            <span>Selection Mode</span>
          </ToolbarButton>

          {selectionMode && (
            <>
              <ToolbarButton title="Select all cards" onClick={toggleSelectAll}>
                <Check size={16} />
                <span>Select All</span>
              </ToolbarButton>

              <ToolbarButton
                title="Mass Edit"
                onClick={handleMassEdit}
                disabled={selectedCards.size === 0}
              >
                <Edit size={16} />
                <span>
                  Edit {selectedCards.size > 0 ? `(${selectedCards.size})` : ""}
                </span>
              </ToolbarButton>

              <ToolbarButton
                title="Copy selected cards"
                disabled={selectedCards.size === 0}
              >
                <Copy size={16} />
                <span>Copy</span>
              </ToolbarButton>

              <ToolbarButton
                title="Delete selected cards"
                disabled={selectedCards.size === 0}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </ToolbarButton>
            </>
          )}
        </ToolbarSection>

        <ToolbarSection>
          <GroupByDropdown>
            <GroupByButton>
              <span>Group By</span>
              <ChevronDown size={14} />
            </GroupByButton>
            <GroupByMenu>
              <GroupByItem onClick={() => groupCardsByProperty("set")}>
                Set
              </GroupByItem>
              <GroupByItem onClick={() => groupCardsByProperty("rarity")}>
                Rarity
              </GroupByItem>
              <GroupByItem onClick={() => groupCardsByProperty("condition")}>
                Condition
              </GroupByItem>
            </GroupByMenu>
          </GroupByDropdown>

          <ToolbarButton
            title="Mass edit mode"
            $active={massEditMode}
            onClick={() => setMassEditMode(!massEditMode)}
          >
            <Table size={16} />
            <span>Mass Edit Mode</span>
          </ToolbarButton>

          {massEditMode && (
            <ToolbarButton title="Save changes">
              <Save size={16} />
              <span>Save Changes</span>
            </ToolbarButton>
          )}
        </ToolbarSection>
      </ToolbarContainer>

      {showGroupedCards ? (
        <div>
          <GroupViewHeader>
            <h3>Grouped View</h3>
            <CloseGroupButton onClick={() => setShowGroupedCards(false)}>
              Close Grouped View
            </CloseGroupButton>
          </GroupViewHeader>

          {Object.entries(groupedCards).map(([groupName, groupCards]) => (
            <GroupContainer key={groupName}>
              <GroupHeader>
                <GroupTitle>
                  {groupName} ({groupCards.length})
                </GroupTitle>
                <AddAllButton onClick={() => handleAddAllFromGroup(groupCards)}>
                  <Plus size={14} />
                  Add All Cards
                </AddAllButton>
              </GroupHeader>

              <GroupCardsList>
                {groupCards.slice(0, 5).map((card) => (
                  <SmallCardPreview key={card.id}>
                    <SmallCardImage src={card.imageUrl} alt={card.name} />
                    <SmallCardName>{card.name}</SmallCardName>
                  </SmallCardPreview>
                ))}
                {groupCards.length > 5 && (
                  <ShowMoreCards>+{groupCards.length - 5} more</ShowMoreCards>
                )}
              </GroupCardsList>
            </GroupContainer>
          ))}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <GridContainer>
              {cards.map((card) => (
                <CardGridItem
                  key={card.id}
                  $selected={selectedCards.has(card.id)}
                  onClick={() => selectionMode && toggleCardSelection(card.id)}
                >
                  <CardImageContainer>
                    <CardImage src={card.imageUrl} alt={card.name} />
                    {selectionMode && (
                      <SelectionIndicator
                        $selected={selectedCards.has(card.id)}
                      >
                        {selectedCards.has(card.id) ? (
                          <CheckSquare size={20} />
                        ) : (
                          <Square size={20} />
                        )}
                      </SelectionIndicator>
                    )}
                    <CardActions>
                      <ActionButton
                        title="Edit card"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditCard) onEditCard(card);
                        }}
                      >
                        <Edit size={16} />
                      </ActionButton>
                      <ActionButton
                        title="Remove card"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteCard) onDeleteCard(card.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </ActionButton>
                    </CardActions>
                    {card.quantity > 1 && (
                      <QuantityBadge>{card.quantity}x</QuantityBadge>
                    )}
                  </CardImageContainer>
                  <CardInfo>
                    <CardName>{card.name}</CardName>
                    <CardMeta>
                      <MetaItem>{card.set}</MetaItem>
                      <MetaItem>{card.rarity}</MetaItem>
                      <MetaItem>{card.condition}</MetaItem>
                    </CardMeta>
                    {card.price && (
                      <CardPrice>${card.price.toFixed(2)}</CardPrice>
                    )}
                    {card.notes && (
                      <NotesIndicator>
                        <MessageCircle size={12} />
                      </NotesIndicator>
                    )}
                  </CardInfo>
                </CardGridItem>
              ))}
            </GridContainer>
          ) : (
            <ListView>
              <ListHeader>
                {selectionMode && (
                  <HeaderCell width="40px">
                    <SelectAllCheckbox onClick={toggleSelectAll}>
                      {selectedCards.size === cards.length ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </SelectAllCheckbox>
                  </HeaderCell>
                )}
                <HeaderCell width="60px">Qty</HeaderCell>
                <HeaderCell width="50px"></HeaderCell>
                <HeaderCell flex={1}>Card Name</HeaderCell>
                <HeaderCell width="120px">Set</HeaderCell>
                <HeaderCell width="100px">Rarity</HeaderCell>
                <HeaderCell width="120px">Condition</HeaderCell>
                <HeaderCell width="100px">Price</HeaderCell>
                <HeaderCell width="60px">Actions</HeaderCell>
              </ListHeader>

              {massEditMode ? (
                <MassEditTable>
                  {cards.map((card) => (
                    <MassEditRow key={card.id}>
                      <MassEditCell width="60px">
                        <MassEditInput
                          type="number"
                          defaultValue={card.quantity}
                          min={1}
                        />
                      </MassEditCell>
                      <MassEditCell width="50px">
                        <SmallCardImage src={card.imageUrl} alt={card.name} />
                      </MassEditCell>
                      <MassEditCell flex={1}>{card.name}</MassEditCell>
                      <MassEditCell width="120px">
                        <MassEditSelect defaultValue={card.set}>
                          <option value={card.set}>{card.set}</option>
                          {/* This would be populated dynamically */}
                        </MassEditSelect>
                      </MassEditCell>
                      <MassEditCell width="100px">
                        <MassEditSelect defaultValue={card.rarity}>
                          <option value="Common">Common</option>
                          <option value="Rare">Rare</option>
                          <option value="Super Rare">Super Rare</option>
                          <option value="Ultra Rare">Ultra Rare</option>
                          <option value="Secret Rare">Secret Rare</option>
                        </MassEditSelect>
                      </MassEditCell>
                      <MassEditCell width="120px">
                        <MassEditSelect defaultValue={card.condition}>
                          <option value="Mint">Mint</option>
                          <option value="Near Mint">Near Mint</option>
                          <option value="Excellent">Excellent</option>
                          <option value="Good">Good</option>
                          <option value="Played">Played</option>
                        </MassEditSelect>
                      </MassEditCell>
                      <MassEditCell width="100px">
                        <MassEditInput
                          type="text"
                          defaultValue={card.price?.toString() || ""}
                          placeholder="0.00"
                        />
                      </MassEditCell>
                      <MassEditCell width="60px">
                        <SmallActionButton title="Delete row">
                          <Trash2 size={14} />
                        </SmallActionButton>
                      </MassEditCell>
                    </MassEditRow>
                  ))}
                </MassEditTable>
              ) : (
                cards.map((card) => (
                  <ListRow
                    key={card.id}
                    $selected={selectedCards.has(card.id)}
                    onClick={() =>
                      selectionMode && toggleCardSelection(card.id)
                    }
                  >
                    {selectionMode && (
                      <Cell width="40px">
                        <RowCheckbox $checked={selectedCards.has(card.id)}>
                          {selectedCards.has(card.id) ? (
                            <CheckSquare size={16} />
                          ) : (
                            <Square size={16} />
                          )}
                        </RowCheckbox>
                      </Cell>
                    )}
                    <Cell width="60px">{card.quantity}x</Cell>
                    <Cell width="50px">
                      <SmallCardImage src={card.imageUrl} alt={card.name} />
                    </Cell>
                    <Cell flex={1}>
                      <CardNameContainer>
                        {card.name}
                        {card.notes && (
                          <InlineNotesIcon>
                            <MessageCircle size={12} />
                          </InlineNotesIcon>
                        )}
                      </CardNameContainer>
                    </Cell>
                    <Cell width="120px">{card.set}</Cell>
                    <Cell width="100px">{card.rarity}</Cell>
                    <Cell width="120px">{card.condition}</Cell>
                    <Cell width="100px">
                      {card.price ? `$${card.price.toFixed(2)}` : "-"}
                    </Cell>
                    <Cell width="60px">
                      <ListActions>
                        <SmallActionButton
                          title="Edit card"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditCard) onEditCard(card);
                          }}
                        >
                          <Edit size={14} />
                        </SmallActionButton>
                        <SmallActionButton
                          title="Remove card"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteCard) onDeleteCard(card.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </SmallActionButton>
                      </ListActions>
                    </Cell>
                  </ListRow>
                ))
              )}
            </ListView>
          )}
        </>
      )}
    </div>
  );
};

const EmptyState = styled.div`
  padding: ${theme.spacing.xl};
  text-align: center;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.md};
`;

// Toolbar styles
const ToolbarContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.light};
`;

const ToolbarSection = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const ToolbarButton = styled.button<{ $active?: boolean; disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid
    ${(props) =>
      props.$active ? theme.colors.primary.main : theme.colors.border.light};
  background: ${(props) =>
    props.$active ? `${theme.colors.primary.main}15` : "transparent"};
  color: ${(props) =>
    props.disabled
      ? theme.colors.text.disabled
      : props.$active
      ? theme.colors.primary.main
      : theme.colors.text.primary};
  font-size: ${theme.typography.size.xs};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.disabled
        ? "transparent"
        : props.$active
        ? `${theme.colors.primary.main}25`
        : theme.colors.background.hover};
  }
`;

// Group by dropdown
const GroupByDropdown = styled.div`
  position: relative;
  display: inline-block;
`;

const GroupByButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${theme.colors.border.light};
  background: transparent;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.xs};
  cursor: pointer;

  &:hover {
    background: ${theme.colors.background.hover};
  }
`;

const GroupByMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  min-width: 150px;
  background: ${theme.colors.background.paper};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  padding: ${theme.spacing.xs} 0;
  display: none;

  ${GroupByDropdown}:hover & {
    display: block;
  }
`;

const GroupByItem = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  cursor: pointer;

  &:hover {
    background: ${theme.colors.background.hover};
    color: ${theme.colors.primary.main};
  }
`;

// Grouped view styles
const GroupViewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};

  h3 {
    margin: 0;
  }
`;

const CloseGroupButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${theme.colors.border.light};
  background: transparent;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.xs};
  cursor: pointer;

  &:hover {
    background: ${theme.colors.background.hover};
  }
`;

const GroupContainer = styled.div`
  margin-bottom: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
`;

const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.background.light};
  border-bottom: 1px solid ${theme.colors.border.light};
`;

const GroupTitle = styled.h4`
  margin: 0;
  font-size: ${theme.typography.size.md};
`;

const AddAllButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${theme.colors.primary.main};
  background: ${theme.colors.primary.main};
  color: white;
  font-size: ${theme.typography.size.xs};
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${theme.colors.primary.dark};
  }
`;

const GroupCardsList = styled.div`
  display: flex;
  padding: ${theme.spacing.md};
  overflow-x: auto;
  gap: ${theme.spacing.md};
`;

const SmallCardPreview = styled.div`
  width: 100px;
  flex-shrink: 0;
`;

const SmallCardName = styled.div`
  font-size: ${theme.typography.size.xs};
  margin-top: ${theme.spacing.xs};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ShowMoreCards = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 140px;
  background: ${theme.colors.background.paper};
  border: 1px dashed ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

// Grid View Styles
const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
`;

const CardGridItem = styled.div<{ $selected?: boolean }>`
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  background: ${theme.colors.background.default};
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: ${(props) => (props.$selected !== undefined ? "pointer" : "default")};
  border: 2px solid
    ${(props) => (props.$selected ? theme.colors.primary.main : "transparent")};

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${theme.shadows.md};
  }
`;

const CardImageContainer = styled.div`
  position: relative;
  padding-top: 140%;
`;

const CardImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
`;

const SelectionIndicator = styled.div<{ $selected: boolean }>`
  position: absolute;
  top: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  z-index: 2;
  color: ${(props) => (props.$selected ? theme.colors.primary.main : "white")};
  background: ${(props) =>
    props.$selected ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.5)"};
  border-radius: ${theme.borderRadius.sm};
  padding: 2px;
`;

const CardActions = styled.div`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  display: flex;
  gap: ${theme.spacing.xs};
  opacity: 0;
  transition: opacity 0.2s ease;

  ${CardGridItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.background.paper};
  color: ${theme.colors.text.secondary};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: ${theme.colors.primary.main};
    color: ${theme.colors.text.inverse};
  }
`;

const QuantityBadge = styled.div`
  position: absolute;
  top: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  background: ${theme.colors.primary.main};
  color: ${theme.colors.text.inverse};
  font-size: ${theme.typography.size.sm};
  font-weight: ${theme.typography.weight.bold};
  padding: 2px 6px;
  border-radius: ${theme.borderRadius.md};
`;

const CardInfo = styled.div`
  padding: ${theme.spacing.sm};
  position: relative;
`;

const CardName = styled.div`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.xs};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.xs};
`;

const MetaItem = styled.span`
  font-size: ${theme.typography.size.xs};
  background: ${theme.colors.background.paper};
  padding: 2px 6px;
  border-radius: ${theme.borderRadius.sm};
  color: ${theme.colors.text.secondary};
`;

const CardPrice = styled.div`
  font-weight: ${theme.typography.weight.semibold};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.sm};
`;

const NotesIndicator = styled.div`
  position: absolute;
  bottom: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  color: ${theme.colors.primary.main};
`;

// List View Styles
const ListView = styled.div`
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
`;

const ListHeader = styled.div`
  display: flex;
  background: ${theme.colors.background.default};
  border-bottom: 1px solid ${theme.colors.border.light};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.secondary};
`;

const SelectAllCheckbox = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.text.secondary};

  &:hover {
    color: ${theme.colors.primary.main};
  }
`;

const ListRow = styled.div<{ $selected?: boolean }>`
  display: flex;
  border-bottom: 1px solid ${theme.colors.border.light};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.typography.size.sm};
  transition: background-color 0.2s ease;
  cursor: ${(props) => (props.$selected !== undefined ? "pointer" : "default")};
  background: ${(props) =>
    props.$selected ? `${theme.colors.primary.main}10` : "transparent"};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${(props) =>
      props.$selected
        ? `${theme.colors.primary.main}15`
        : theme.colors.background.hover};
  }
`;

const RowCheckbox = styled.div<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) =>
    props.$checked ? theme.colors.primary.main : theme.colors.text.secondary};
`;

const HeaderCell = styled.div<{ width?: string; flex?: number }>`
  ${(props) => (props.width ? `width: ${props.width};` : "")}
  ${(props) => (props.flex ? `flex: ${props.flex};` : "")}
  padding: 0 ${theme.spacing.xs};
  display: flex;
  align-items: center;
`;

const Cell = styled.div<{ width?: string; flex?: number }>`
  ${(props) => (props.width ? `width: ${props.width};` : "")}
  ${(props) => (props.flex ? `flex: ${props.flex};` : "")}
  padding: 0 ${theme.spacing.xs};
  display: flex;
  align-items: center;
  color: ${theme.colors.text.primary};
`;

const SmallCardImage = styled.img`
  width: 40px;
  height: 56px;
  object-fit: cover;
  border-radius: ${theme.borderRadius.sm};
`;

const CardNameContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const InlineNotesIcon = styled.span`
  color: ${theme.colors.primary.main};
`;

const ListActions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const SmallActionButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: ${theme.borderRadius.full};
  background: transparent;
  color: ${theme.colors.text.secondary};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: ${theme.colors.background.paper};
    color: ${theme.colors.primary.main};
  }
`;

// Mass Edit Mode Styles
const MassEditTable = styled.div`
  width: 100%;
`;

const MassEditRow = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.border.light};
  padding: ${theme.spacing.xs} ${theme.spacing.md};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${theme.colors.background.hover};
  }
`;

const MassEditCell = styled.div<{ width?: string; flex?: number }>`
  ${(props) => (props.width ? `width: ${props.width};` : "")}
  ${(props) => (props.flex ? `flex: ${props.flex};` : "")}
  padding: 0 ${theme.spacing.xs};
  display: flex;
  align-items: center;
`;

const MassEditInput = styled.input`
  width: 100%;
  padding: 4px 8px;
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.size.xs};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
  }
`;

const MassEditSelect = styled.select`
  width: 100%;
  padding: 4px 8px;
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.size.xs};
  background-color: white;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
  }
`;

export default CardCollectionGrid;
