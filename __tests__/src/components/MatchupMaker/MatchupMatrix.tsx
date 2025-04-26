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
import { CheckCircle, XCircle, MinusCircle, Trash2, Info } from "react-feather";

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
  } | null>(null);
  const [cellNotes, setCellNotes] = useState<string>("");
  const [showLegend, setShowLegend] = useState(true);

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
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    setActiveCell({ archetypeId, cardId });
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

  return (
    <MatrixContainer>
      <h2>Matchup Matrix</h2>
      <p>
        Click on cells to mark if a card is effective against a particular
        archetype.
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
            <span>Right-click on a cell to add notes</span>
          </LegendItem>
        </Legend>
      )}

      <MatrixScroll>
        <MatrixTable>
          <thead>
            <tr>
              <th></th> {/* Empty corner cell */}
              {matchupData.cards.map((card) => (
                <th key={card.id}>
                  <CardHeader>
                    <CardImage
                      src={`https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`}
                      alt={card.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.ygoprodeck.com/images/cards_small/back_high.jpg";
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
                    <ArchetypeName>{archetype.name}</ArchetypeName>
                    <RemoveButton
                      onClick={() => onRemoveArchetype(archetype.id)}
                      title={`Remove ${archetype.name}`}
                    >
                      <Trash2 size={14} />
                    </RemoveButton>
                  </ArchetypeHeader>
                </td>
                {matchupData.cards.map((card) => (
                  <td
                    key={`${archetype.id}-${card.id}`}
                    onClick={() => handleCellClick(archetype.id, card.id)}
                    onContextMenu={(e) =>
                      handleCellRightClick(archetype.id, card.id, e)
                    }
                    className={
                      hasNotes(archetype.id, card.id) ? "has-notes" : ""
                    }
                  >
                    <MatrixCell>
                      {getRatingIcon(
                        matchupData.ratings[archetype.id]?.[card.id]?.rating ||
                          ""
                      )}
                      {hasNotes(archetype.id, card.id) && (
                        <NoteIndicator title="Has notes">
                          <Info size={12} />
                        </NoteIndicator>
                      )}
                    </MatrixCell>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </MatrixTable>
      </MatrixScroll>

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
            <h3>Add Notes</h3>
            <p>Add detailed notes about this matchup</p>
            <NotesTextarea
              value={cellNotes}
              onChange={(e) => setCellNotes(e.target.value)}
              placeholder="Enter your notes here..."
              rows={5}
            />
            <ButtonsRow>
              <CloseButton onClick={handleNotesSave}>Save</CloseButton>
              <CloseButton onClick={handleNotesCancel}>Cancel</CloseButton>
            </ButtonsRow>
          </SelectorContent>
        </SelectorDialog>
      )}
    </MatrixContainer>
  );
};

// Styled Components
const MatrixContainer = styled.div`
  margin: ${(props) => props.theme.spacing.xl} 0;

  h2 {
    margin-bottom: ${(props) => props.theme.spacing.sm};
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

const ArchetypeName = styled.div`
  font-size: ${(props) => props.theme.typography.size.sm};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  text-align: left;
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

const NoteIndicator = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  color: ${(props) => props.theme.colors.info.main};
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
`;

const ButtonsRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${(props) => props.theme.spacing.md};
  margin-top: ${(props) => props.theme.spacing.md};
`;

export default MatchupMatrix;
