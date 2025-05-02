import React, { useState } from "react";
import styled from "styled-components";
import {
  CardItem,
  ArchetypeItem,
  MatchupData,
  EffectivenessRating,
} from "../../pages/MatchupMakerPage";
import CardSelector from "./CardSelector";
import ArchetypeSelector from "./ArchetypeSelector";
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  Trash2,
  Info,
  Edit,
  MessageSquare,
  X,
} from "react-feather";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../utils/cardImages";

interface MatchupMatrixProps {
  matchupData: MatchupData;
  onAddCard: (card: CardItem) => void;
  onAddArchetype: (archetype: ArchetypeItem) => void;
  onUpdateRating: (
    archetypeId: string,
    cardId: number,
    rating: EffectivenessRating
  ) => void;
  onRemoveCard: (cardId: number) => void;
  onRemoveArchetype: (archetypeId: string) => void;
}

const MatchupMatrix: React.FC<MatchupMatrixProps> = ({
  matchupData,
  onAddCard,
  onAddArchetype,
  onUpdateRating,
  onRemoveCard,
  onRemoveArchetype,
}) => {
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [showArchetypeSelector, setShowArchetypeSelector] = useState(false);
  const [activeCell, setActiveCell] = useState<{
    archetypeId: string;
    cardId: number;
    cardName?: string;
    archetypeName?: string;
  } | null>(null);
  const [cellNotes, setCellNotes] = useState<string>("");
  const [showLegend, setShowLegend] = useState(true);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    archetypeId: string;
    cardId: number;
    notes: string;
  } | null>(null);

  const handleCellClick = (archetypeId: string, cardId: number) => {
    const currentRating =
      matchupData.ratings[archetypeId]?.[cardId]?.rating || "";

    // Cycle through ratings: '' -> 'effective' -> 'ineffective' -> 'neutral' -> ''
    let newRating: EffectivenessRating["rating"] = "effective";
    if (currentRating === "effective") newRating = "ineffective";
    else if (currentRating === "ineffective") newRating = "neutral";
    else if (currentRating === "neutral") newRating = "";

    onUpdateRating(archetypeId, cardId, {
      rating: newRating,
      notes: matchupData.ratings[archetypeId]?.[cardId]?.notes || "",
    });
  };

  const handleCellRightClick = (
    archetypeId: string,
    cardId: number,
    cardName: string,
    archetypeName: string,
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    setActiveCell({ archetypeId, cardId, cardName, archetypeName });
    setCellNotes(matchupData.ratings[archetypeId]?.[cardId]?.notes || "");
  };

  const handleNotesSave = () => {
    if (!activeCell) return;

    const { archetypeId, cardId } = activeCell;
    const currentRating =
      matchupData.ratings[archetypeId]?.[cardId]?.rating || "";

    onUpdateRating(archetypeId, cardId, {
      rating: currentRating,
      notes: cellNotes,
    });

    setActiveCell(null);
  };

  const handleNotesCancel = () => {
    setActiveCell(null);
    setCellNotes("");
  };

  const openNotesEditor = (
    archetypeId: string,
    cardId: number,
    cardName: string,
    archetypeName: string
  ) => {
    setActiveCell({ archetypeId, cardId, cardName, archetypeName });
    setCellNotes(matchupData.ratings[archetypeId]?.[cardId]?.notes || "");
  };

  const handleMouseEnter = (archetypeId: string, cardId: number) => {
    const notes = matchupData.ratings[archetypeId]?.[cardId]?.notes;
    if (notes && notes.trim()) {
      setHoveredCell({ archetypeId, cardId, notes });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case "effective":
        return <CheckCircle color="#22c55e" size={24} />;
      case "ineffective":
        return <XCircle color="#e53935" size={24} />;
      case "neutral":
        return <MinusCircle color="#ff9800" size={24} />;
      default:
        return null;
    }
  };

  const hasNotes = (archetypeId: string, cardId: number) => {
    return !!matchupData.ratings[archetypeId]?.[cardId]?.notes;
  };

  // Function to collect all notes from the matchup data
  const getAllNotes = () => {
    const notes: {
      archetypeId: string;
      archetypeName: string;
      cardId: number;
      cardName: string;
      rating: string;
      notes: string;
    }[] = [];

    matchupData.archetypes.forEach((archetype) => {
      matchupData.cards.forEach((card) => {
        const cellData = matchupData.ratings[archetype.id]?.[card.id];
        if (cellData?.notes) {
          notes.push({
            archetypeId: archetype.id,
            archetypeName: archetype.name,
            cardId: card.id,
            cardName: card.name,
            rating: cellData.rating || "",
            notes: cellData.notes,
          });
        }
      });
    });

    return notes;
  };

  const allNotes = getAllNotes();

  return (
    <MatrixContainer>
      <h2>Matchup Matrix</h2>
      <p>
        Click on cells to mark if a card is effective against a particular
        archetype. Right-click or use the notes button to add detailed notes.
      </p>

      <ControlsContainer>
        <AddButton onClick={() => setShowCardSelector(true)}>
          Add Card
        </AddButton>
        <AddButton onClick={() => setShowArchetypeSelector(true)}>
          Add Archetype
        </AddButton>
        <LegendToggle onClick={() => setShowLegend(!showLegend)}>
          {showLegend ? "Hide Legend" : "Show Legend"}
        </LegendToggle>
        {allNotes.length > 0 && (
          <NotesButton onClick={() => setShowAllNotes(true)}>
            <MessageSquare size={16} />
            View All Notes ({allNotes.length})
          </NotesButton>
        )}
      </ControlsContainer>

      {showLegend && (
        <Legend>
          <LegendItem>
            <CheckCircle color="#22c55e" size={16} />
            <span>
              Effective (✓): The card is effective against this archetype
            </span>
          </LegendItem>
          <LegendItem>
            <XCircle color="#e53935" size={16} />
            <span>
              Ineffective (✗): The card is not effective against this archetype
            </span>
          </LegendItem>
          <LegendItem>
            <MinusCircle color="#ff9800" size={16} />
            <span>Neutral (−): The card has situational effectiveness</span>
          </LegendItem>
          <LegendItem>
            <Info size={16} />
            <span>
              Right-click on a cell or use the notes button to add notes
            </span>
          </LegendItem>
        </Legend>
      )}

      <div id="matchup-matrix">
        <MatrixScroll>
          <MatrixTable>
            <thead>
              <tr>
                <th></th>
                {/* Empty corner cell */}
                {matchupData.cards.map((card) => (
                  <th key={card.id}>
                    <CardHeader>
                      <CardImage
                        src={getCardImageUrl(card.id, "small")}
                        alt={card.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = CARD_BACK_IMAGE;
                        }}
                      />
                      <CardName>{card.name}</CardName>
                      <RemoveButton
                        onClick={() => onRemoveCard(card.id)}
                        title={`Remove ${card.name}`}
                      >
                        <Trash2 size={14} />
                      </RemoveButton>
                    </CardHeader>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchupData.archetypes.map((archetype) => (
                <tr key={archetype.id}>
                  <td>
                    <ArchetypeHeader>
                      {archetype.imageUrl || archetype.representativeCardId ? (
                        <ArchetypeImageContainer>
                          <CardImage
                            src={
                              archetype.imageUrl ||
                              getCardImageUrl(
                                archetype.representativeCardId,
                                "small"
                              )
                            }
                            alt={archetype.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                CARD_BACK_IMAGE;
                            }}
                          />
                          <ArchetypeName>{archetype.name}</ArchetypeName>
                        </ArchetypeImageContainer>
                      ) : (
                        <ArchetypeName>{archetype.name}</ArchetypeName>
                      )}
                      <RemoveButton
                        onClick={() => onRemoveArchetype(archetype.id)}
                        title={`Remove ${archetype.name}`}
                      >
                        <Trash2 size={14} />
                      </RemoveButton>
                    </ArchetypeHeader>
                  </td>
                  {matchupData.cards.map((card) => {
                    const hasNotesForCell = hasNotes(archetype.id, card.id);
                    return (
                      <td
                        key={`${archetype.id}-${card.id}`}
                        onClick={() => handleCellClick(archetype.id, card.id)}
                        onContextMenu={(e) =>
                          handleCellRightClick(
                            archetype.id,
                            card.id,
                            card.name,
                            archetype.name,
                            e
                          )
                        }
                        className={hasNotesForCell ? "has-notes" : ""}
                        onMouseEnter={() =>
                          handleMouseEnter(archetype.id, card.id)
                        }
                        onMouseLeave={handleMouseLeave}
                      >
                        <MatrixCell>
                          {getRatingIcon(
                            matchupData.ratings[archetype.id]?.[card.id]
                              ?.rating || ""
                          )}
                          {hasNotesForCell && (
                            <NoteIndicator title="Has notes">
                              <NotesIcon />
                            </NoteIndicator>
                          )}
                          {hasNotesForCell && (
                            <NotesButton
                              onClick={(e) => {
                                e.stopPropagation();
                                openNotesEditor(
                                  archetype.id,
                                  card.id,
                                  card.name,
                                  archetype.name
                                );
                              }}
                              title="Edit notes"
                              className="cell-notes-button"
                            >
                              <Edit size={14} />
                            </NotesButton>
                          )}
                          {!hasNotesForCell && (
                            <AddNoteButton
                              onClick={(e) => {
                                e.stopPropagation();
                                openNotesEditor(
                                  archetype.id,
                                  card.id,
                                  card.name,
                                  archetype.name
                                );
                              }}
                              title="Add notes"
                              className="add-note-button"
                            >
                              <MessageSquare size={14} />
                            </AddNoteButton>
                          )}
                        </MatrixCell>

                        {/* Tooltip for notes preview */}
                        {hoveredCell &&
                          hoveredCell.archetypeId === archetype.id &&
                          hoveredCell.cardId === card.id && (
                            <NotesTooltip>
                              <NotesTooltipContent>
                                {hoveredCell.notes}
                              </NotesTooltipContent>
                            </NotesTooltip>
                          )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </MatrixTable>
        </MatrixScroll>
      </div>

      {(matchupData.cards.length === 0 ||
        matchupData.archetypes.length === 0) && (
        <EmptyState>
          {matchupData.cards.length === 0 && (
            <p>Start by adding cards to the X-axis.</p>
          )}
          {matchupData.cards.length > 0 &&
            matchupData.archetypes.length === 0 && (
              <p>Now add some archetypes to the Y-axis.</p>
            )}
        </EmptyState>
      )}

      {/* Card Selector Dialog */}
      {showCardSelector && (
        <SelectorDialog>
          <SelectorContent>
            <h2>Select Cards</h2>
            <p>
              Choose handtraps, breakers, or other cards to add to your matchup
              matrix
            </p>
            <CardSelector
              onSelect={(card) => {
                onAddCard(card);
              }}
              onClose={() => setShowCardSelector(false)}
            />
            <CloseButton onClick={() => setShowCardSelector(false)}>
              Close
            </CloseButton>
          </SelectorContent>
        </SelectorDialog>
      )}

      {/* Archetype Selector Dialog */}
      {showArchetypeSelector && (
        <SelectorDialog>
          <SelectorContent>
            <h2>Select Archetypes</h2>
            <p>Choose deck archetypes to add to your matchup matrix</p>
            <ArchetypeSelector
              onSelect={(archetype) => {
                onAddArchetype(archetype);
              }}
              onClose={() => setShowArchetypeSelector(false)}
            />
            <CloseButton onClick={() => setShowArchetypeSelector(false)}>
              Close
            </CloseButton>
          </SelectorContent>
        </SelectorDialog>
      )}

      {/* Cell Notes Dialog */}
      {activeCell && (
        <SelectorDialog>
          <SelectorContent>
            <DialogHeader>
              <h3>
                {cellNotes ? "Edit" : "Add"} Notes: {activeCell.cardName} vs{" "}
                {activeCell.archetypeName}
              </h3>
              <CloseIcon onClick={handleNotesCancel}>
                <X size={20} />
              </CloseIcon>
            </DialogHeader>

            <p>Add detailed notes about this matchup situation</p>
            <NotesTextarea
              value={cellNotes}
              onChange={(e) => setCellNotes(e.target.value)}
              placeholder="Examples: 
- How to use this card against the archetype
- When is it most effective
- What to negate or disrupt
- Side deck considerations"
              rows={8}
            />
            <ButtonsRow>
              <SaveButton onClick={handleNotesSave}>Save Notes</SaveButton>
              <CancelButton onClick={handleNotesCancel}>Cancel</CancelButton>
            </ButtonsRow>
          </SelectorContent>
        </SelectorDialog>
      )}

      {/* All Notes View */}
      {showAllNotes && (
        <SelectorDialog>
          <AllNotesContent>
            <DialogHeader>
              <h3>All Matchup Notes</h3>
              <CloseIcon onClick={() => setShowAllNotes(false)}>
                <X size={20} />
              </CloseIcon>
            </DialogHeader>

            <p>Comprehensive view of all notes added to your matchup matrix</p>

            <AllNotesContainer>
              {allNotes.length > 0 ? (
                allNotes.map((note, index) => (
                  <NoteCard key={`${note.archetypeId}-${note.cardId}-${index}`}>
                    <NoteCardHeader>
                      <div className="matchup-info">
                        <strong>{note.cardName}</strong> vs{" "}
                        <strong>{note.archetypeName}</strong>
                      </div>
                      <div className="rating-badge">
                        {note.rating === "effective" && (
                          <EffectiveBadge>Effective</EffectiveBadge>
                        )}
                        {note.rating === "ineffective" && (
                          <IneffectiveBadge>Ineffective</IneffectiveBadge>
                        )}
                        {note.rating === "neutral" && (
                          <NeutralBadge>Neutral</NeutralBadge>
                        )}
                        {!note.rating && <UnratedBadge>Not Rated</UnratedBadge>}
                      </div>
                    </NoteCardHeader>
                    <NoteCardContent>{note.notes}</NoteCardContent>
                    <NoteCardFooter>
                      <EditNoteButton
                        onClick={() => {
                          setShowAllNotes(false);
                          openNotesEditor(
                            note.archetypeId,
                            note.cardId,
                            note.cardName,
                            note.archetypeName
                          );
                        }}
                      >
                        <Edit size={14} /> Edit
                      </EditNoteButton>
                    </NoteCardFooter>
                  </NoteCard>
                ))
              ) : (
                <p>No notes have been added yet.</p>
              )}
            </AllNotesContainer>

            <CloseButton onClick={() => setShowAllNotes(false)}>
              Close
            </CloseButton>
          </AllNotesContent>
        </SelectorDialog>
      )}
    </MatrixContainer>
  );
};

// Styled Components
const MatrixContainer = styled.div`
  margin: ${(props) => props.theme.spacing.xl} 0;
  background-color: ${(props) => props.theme.colors.background.paper};
  border-radius: ${(props) => props.theme.borderRadius.lg};
  padding: ${(props) => props.theme.spacing.lg};
  box-shadow: ${(props) => props.theme.shadows.md};

  h2 {
    margin-top: 0;
    margin-bottom: ${(props) => props.theme.spacing.sm};
    color: ${(props) => props.theme.colors.text.primary};
    font-size: ${(props) => props.theme.typography.size.xl};
  }

  p {
    color: ${(props) => props.theme.colors.text.secondary};
    margin-bottom: ${(props) => props.theme.spacing.md};
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.md};
  margin-bottom: ${(props) => props.theme.spacing.lg};
  flex-wrap: wrap;
`;

const AddButton = styled.button`
  background-color: ${(props) => props.theme.colors.primary.main};
  color: white;
  border: none;
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: ${(props) => props.theme.spacing.sm}
    ${(props) => props.theme.spacing.md};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.colors.primary.dark};
  }
`;

const LegendToggle = styled.button`
  background-color: transparent;
  color: ${(props) => props.theme.colors.primary.main};
  border: 1px solid ${(props) => props.theme.colors.primary.main};
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: ${(props) => props.theme.spacing.sm}
    ${(props) => props.theme.spacing.md};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.colors.action.hover};
  }
`;

const Legend = styled.div`
  background-color: ${(props) => props.theme.colors.background.card};
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: ${(props) => props.theme.spacing.md};
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  margin-bottom: ${(props) => props.theme.spacing.sm};

  &:last-child {
    margin-bottom: 0;
  }

  span {
    font-size: ${(props) => props.theme.typography.size.sm};
  }
`;

const MatrixScroll = styled.div`
  overflow-x: auto;
  border: 1px solid ${(props) => props.theme.colors.border.default};
  border-radius: ${(props) => props.theme.borderRadius.md};
  box-shadow: ${(props) => props.theme.shadows.md};
`;

const MatrixTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: ${(props) => props.theme.spacing.sm};
    border: 1px solid ${(props) => props.theme.colors.border.default};
    text-align: center;
    position: relative;
  }

  th {
    background-color: ${(props) => props.theme.colors.background.card};
    position: sticky;
    top: 0;
    z-index: 10;
  }

  td:first-child {
    background-color: ${(props) => props.theme.colors.background.card};
    position: sticky;
    left: 0;
    z-index: 5;
  }

  td.has-notes {
    position: relative;
    background-color: rgba(
      25,
      118,
      210,
      0.05
    ); /* Light info color background */
  }

  td.has-notes:hover {
    background-color: rgba(25, 118, 210, 0.1); /* Darker on hover */
  }
`;

const CardHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  padding: ${(props) => props.theme.spacing.xs};
  position: relative;
`;

const CardImage = styled.img`
  width: 70px;
  height: 102px; /* Maintain card aspect ratio */
  border-radius: ${(props) => props.theme.borderRadius.sm};
  margin-bottom: ${(props) => props.theme.spacing.xs};
  object-fit: cover;
`;

const CardName = styled.div`
  font-size: ${(props) => props.theme.typography.size.xs};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const ArchetypeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 150px;
  padding-right: ${(props) => props.theme.spacing.xs};
  position: relative;
`;

const ArchetypeImageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  padding: ${(props) => props.theme.spacing.xs};
  margin-right: auto;
`;

const ArchetypeName = styled.div`
  font-size: ${(props) => props.theme.typography.size.xs};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  margin-top: ${(props) => props.theme.spacing.xs};
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.7);
  border: none;
  border-radius: ${(props) => props.theme.borderRadius.full};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: ${(props) => props.theme.colors.error.main};
  width: 20px;
  height: 20px;

  ${CardHeader}:hover &, ${ArchetypeHeader}:hover & {
    opacity: 1;
  }
`;

// Define MatrixCell first since other components reference it
const MatrixCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  cursor: pointer;
  position: relative;

  &:hover {
    background-color: ${(props) => props.theme.colors.action.hover};
  }
`;

// Now define components that reference MatrixCell
const NotesButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  background-color: ${(props) => props.theme.colors.info.main};
  color: white;
  border: none;
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: ${(props) => props.theme.spacing.sm}
    ${(props) => props.theme.spacing.md};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.colors.info.dark};
  }

  &.cell-notes-button {
    position: absolute;
    top: 5px;
    right: 5px;
    padding: 4px;
    border-radius: 50%;
    opacity: 0;
    z-index: 5;
    background-color: ${(props) => props.theme.colors.primary.main};
  }

  ${MatrixCell}:hover &.cell-notes-button {
    opacity: 1;
  }
`;

const AddNoteButton = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 4px;
  border-radius: 50%;
  opacity: 0;
  z-index: 5;
  background-color: ${(props) => props.theme.colors.info.main};
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  ${MatrixCell}:hover &.add-note-button {
    opacity: 0.7;
  }

  &:hover {
    opacity: 1 !important;
  }
`;

const NoteIndicator = styled.div`
  position: absolute;
  bottom: 3px;
  right: 3px;
  color: ${(props) => props.theme.colors.info.main};
  z-index: 6;
  pointer-events: none;
`;

const NotesIcon = styled.div`
  width: 10px;
  height: 10px;
  background-color: ${(props) => props.theme.colors.info.main};
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
`;

const NotesTooltip = styled.div`
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background-color: ${(props) => props.theme.colors.background.paper};
  border: 1px solid ${(props) => props.theme.colors.border.default};
  border-radius: ${(props) => props.theme.borderRadius.md};
  box-shadow: ${(props) => props.theme.shadows.md};
  z-index: 100;
  width: 200px;
  max-height: 150px;
  overflow-y: auto;
  pointer-events: auto;

  &:after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 8px solid transparent;
    border-top-color: ${(props) => props.theme.colors.background.paper};
  }
`;

const NotesTooltipContent = styled.div`
  padding: ${(props) => props.theme.spacing.sm};
  font-size: ${(props) => props.theme.typography.size.sm};
  white-space: pre-wrap;
  overflow-wrap: break-word;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${(props) => props.theme.spacing.xl} 0;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const SelectorDialog = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const SelectorContent = styled.div`
  background-color: ${(props) => props.theme.colors.background.paper};
  border-radius: ${(props) => props.theme.borderRadius.lg};
  padding: ${(props) => props.theme.spacing.lg};
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`;

const AllNotesContent = styled(SelectorContent)`
  max-width: 900px;
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.md};

  h3 {
    margin: 0;
    font-size: ${(props) => props.theme.typography.size.lg};
  }
`;

const CloseIcon = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme.colors.text.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${(props) => props.theme.colors.text.primary};
  }
`;

const CloseButton = styled.button`
  background-color: ${(props) => props.theme.colors.primary.main};
  color: white;
  border: none;
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: ${(props) => props.theme.spacing.sm}
    ${(props) => props.theme.spacing.md};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: ${(props) => props.theme.spacing.md};

  &:hover {
    background-color: ${(props) => props.theme.colors.primary.dark};
  }
`;

const NotesTextarea = styled.textarea`
  width: 100%;
  padding: ${(props) => props.theme.spacing.sm};
  border: 1px solid ${(props) => props.theme.colors.border.default};
  border-radius: ${(props) => props.theme.borderRadius.md};
  font-family: ${(props) => props.theme.typography.fontFamily};
  font-size: ${(props) => props.theme.typography.size.base};
  resize: vertical;
  line-height: 1.5;
`;

const ButtonsRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${(props) => props.theme.spacing.md};
  margin-top: ${(props) => props.theme.spacing.lg};
`;

const SaveButton = styled(CloseButton)`
  background-color: ${(props) => props.theme.colors.success.main};

  &:hover {
    background-color: ${(props) => props.theme.colors.success.dark};
  }
`;

const CancelButton = styled(CloseButton)`
  background-color: transparent;
  color: ${(props) => props.theme.colors.text.secondary};
  border: 1px solid ${(props) => props.theme.colors.border.default};

  &:hover {
    background-color: ${(props) => props.theme.colors.background.dark};
    color: ${(props) => props.theme.colors.text.primary};
  }
`;

const AllNotesContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${(props) => props.theme.spacing.md};
  margin-top: ${(props) => props.theme.spacing.md};
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const NoteCard = styled.div`
  background-color: ${(props) => props.theme.colors.background.card};
  border: 1px solid ${(props) => props.theme.colors.border.default};
  border-radius: ${(props) => props.theme.borderRadius.md};
  box-shadow: ${(props) => props.theme.shadows.sm};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const NoteCardHeader = styled.div`
  padding: ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.background.dark};
  border-bottom: 1px solid ${(props) => props.theme.colors.border.default};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${(props) => props.theme.typography.size.sm};

  .matchup-info {
    flex: 1;
  }

  .rating-badge {
    margin-left: ${(props) => props.theme.spacing.sm};
  }
`;

const NoteCardContent = styled.div`
  padding: ${(props) => props.theme.spacing.md};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre-wrap;
  font-size: ${(props) => props.theme.typography.size.sm};
  color: ${(props) => props.theme.colors.text.primary};
  max-height: 150px;
  overflow-y: auto;
`;

const NoteCardFooter = styled.div`
  padding: ${(props) => props.theme.spacing.sm};
  border-top: 1px solid ${(props) => props.theme.colors.border.default};
  display: flex;
  justify-content: flex-end;
`;

const EditNoteButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  background-color: transparent;
  color: ${(props) => props.theme.colors.primary.main};
  border: 1px solid ${(props) => props.theme.colors.primary.main};
  border-radius: ${(props) => props.theme.borderRadius.sm};
  padding: ${(props) => props.theme.spacing.xs}
    ${(props) => props.theme.spacing.sm};
  font-size: ${(props) => props.theme.typography.size.xs};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  cursor: pointer;

  &:hover {
    background-color: ${(props) => props.theme.colors.action.hover};
  }
`;

const EffectiveBadge = styled.span`
  background-color: ${(props) => props.theme.colors.success.main};
  color: white;
  border-radius: ${(props) => props.theme.borderRadius.full};
  padding: 2px 6px;
  font-size: ${(props) => props.theme.typography.size.xs};
  font-weight: ${(props) => props.theme.typography.weight.medium};
`;

const IneffectiveBadge = styled(EffectiveBadge)`
  background-color: ${(props) => props.theme.colors.error.main};
`;

const NeutralBadge = styled(EffectiveBadge)`
  background-color: ${(props) => props.theme.colors.warning.main};
  color: ${(props) => props.theme.colors.text.primary};
`;

const UnratedBadge = styled(EffectiveBadge)`
  background-color: ${(props) => props.theme.colors.background.dark};
  color: ${(props) => props.theme.colors.text.secondary};
`;

export default MatchupMatrix;
