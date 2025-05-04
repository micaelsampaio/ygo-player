import React, { useState } from 'react';
import { SidingPattern, Card, Deck } from '../DeckBuilder/types';
import { getCardImageUrl, CARD_BACK_IMAGE } from '../../utils/cardImages';
import styled from 'styled-components';
import { useSidePatterns } from '../DeckBuilder/hooks/useSidePatterns';

interface SidePatternTabProps {
  deck: Deck;
  onCardSelect?: (card: Card) => void;
}

const SidePatternTab: React.FC<SidePatternTabProps> = ({ deck, onCardSelect }) => {
  const { sidePatterns } = useSidePatterns(deck?.id);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
    sidePatterns.length > 0 ? sidePatterns[0].id : null
  );

  // If there are no side patterns, show a message
  if (sidePatterns.length === 0) {
    return (
      <EmptyStateContainer>
        <h3>No Side Patterns Available</h3>
        <p>Create side patterns in the Deck Editor to help you prepare for different matchups.</p>
        <p className="tip">Side patterns help you plan which cards to swap in and out against specific matchups.</p>
        <ActionButton
          onClick={() => {
            // Navigate to deck editor side patterns tab
            window.location.href = `/my/decks/${deck.id}/edit?tab=side-patterns`;
          }}
        >
          Create Side Patterns
        </ActionButton>
      </EmptyStateContainer>
    );
  }

  // Find the selected pattern
  const selectedPattern = sidePatterns.find(pattern => pattern.id === selectedPatternId) || sidePatterns[0];

  return (
    <SidePatternContainer>
      <SidePatternHeader>
        <h3>Side Deck Patterns</h3>
        <ActionButton
          onClick={() => {
            // Navigate to deck editor side patterns tab
            window.location.href = `/my/decks/${deck.id}/edit?tab=side-patterns`;
          }}
        >
          Edit Patterns
        </ActionButton>
      </SidePatternHeader>

      <PatternSelectionList>
        {sidePatterns.map(pattern => (
          <PatternSelectButton
            key={pattern.id}
            $active={pattern.id === selectedPatternId}
            onClick={() => setSelectedPatternId(pattern.id)}
          >
            <span className="pattern-name">{pattern.name}</span>
            <span className="pattern-matchup">vs. {pattern.matchup}</span>
          </PatternSelectButton>
        ))}
      </PatternSelectionList>

      <PatternDetailContainer>
        <PatternDetailHeader>
          <h4>{selectedPattern.name}</h4>
          <span className="vs-text">vs. {selectedPattern.matchup}</span>
          {selectedPattern.description && (
            <p className="description">{selectedPattern.description}</p>
          )}
        </PatternDetailHeader>

        <SideCardSwapContainer>
          <SideoutSection>
            <h5>Side OUT</h5>
            <CardGrid>
              {selectedPattern.cardsOut.map(cardCount => {
                const fullCard = [...deck.mainDeck, ...deck.extraDeck].find(c => c.id === cardCount.id);
                return (
                  <SideCard 
                    key={`out-${cardCount.id}`}
                    onClick={() => {
                      if (fullCard && onCardSelect) onCardSelect(fullCard);
                    }}
                  >
                    <CardImage 
                      src={getCardImageUrl(cardCount.id, 'small')} 
                      alt={cardCount.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = CARD_BACK_IMAGE;
                      }}
                    />
                    <CardDetails>
                      <CardName>{cardCount.name}</CardName>
                      <CardCopies>{cardCount.count}x</CardCopies>
                    </CardDetails>
                  </SideCard>
                );
              })}
            </CardGrid>
          </SideoutSection>

          <SideinSection>
            <h5>Side IN</h5>
            <CardGrid>
              {selectedPattern.cardsIn.map(cardCount => {
                const fullCard = deck.sideDeck.find(c => c.id === cardCount.id);
                return (
                  <SideCard 
                    key={`in-${cardCount.id}`}
                    onClick={() => {
                      if (fullCard && onCardSelect) onCardSelect(fullCard);
                    }}
                  >
                    <CardImage 
                      src={getCardImageUrl(cardCount.id, 'small')} 
                      alt={cardCount.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = CARD_BACK_IMAGE;
                      }}
                    />
                    <CardDetails>
                      <CardName>{cardCount.name}</CardName>
                      <CardCopies>{cardCount.count}x</CardCopies>
                    </CardDetails>
                  </SideCard>
                );
              })}
            </CardGrid>
          </SideinSection>
        </SideCardSwapContainer>

        {selectedPattern.notes && (
          <PatternNotes>
            <h5>Notes</h5>
            <p>{selectedPattern.notes}</p>
          </PatternNotes>
        )}

        <PatternMetadata>
          <span>Created: {new Date(selectedPattern.createdAt).toLocaleDateString()}</span>
          <span>Last Modified: {new Date(selectedPattern.lastModified).toLocaleDateString()}</span>
        </PatternMetadata>
      </PatternDetailContainer>
    </SidePatternContainer>
  );
};

// Styled components
const SidePatternContainer = styled.div`
  padding: var(--spacing-md);
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const SidePatternHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  
  h3 {
    margin: 0;
    color: var(--color-text-primary);
  }
`;

const ActionButton = styled.button`
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background var(--transition-default);
  
  &:hover {
    background-color: var(--color-primary-dark);
  }
`;

const PatternSelectionList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
`;

const PatternSelectButton = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: ${props => props.$active ? 'var(--color-bg-highlight)' : 'var(--color-bg-secondary)'};
  border: 1px solid ${props => props.$active ? 'var(--color-primary)' : 'var(--color-border)'};
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-default);
  
  &:hover {
    background-color: var(--color-bg-hover);
  }
  
  .pattern-name {
    font-weight: ${props => props.$active ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)'};
    color: ${props => props.$active ? 'var(--color-primary)' : 'var(--color-text-primary)'};
  }
  
  .pattern-matchup {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
`;

const PatternDetailContainer = styled.div`
  flex: 1;
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  overflow-y: auto;
`;

const PatternDetailHeader = styled.div`
  margin-bottom: var(--spacing-md);
  
  h4 {
    margin: 0;
    color: var(--color-text-primary);
  }
  
  .vs-text {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }
  
  .description {
    margin-top: var(--spacing-sm);
    font-style: italic;
    color: var(--color-text-secondary);
  }
`;

const SideCardSwapContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SideoutSection = styled.div`
  h5 {
    color: #c62828;
    border-bottom: 1px solid #ffcdd2;
    padding-bottom: var(--spacing-xs);
    margin-top: 0;
  }
`;

const SideinSection = styled.div`
  h5 {
    color: #2e7d32;
    border-bottom: 1px solid #c8e6c9;
    padding-bottom: var(--spacing-xs);
    margin-top: 0;
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-sm);
`;

const SideCard = styled.div`
  display: flex;
  background: var(--color-bg-primary);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--transition-default);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
`;

const CardImage = styled.img`
  width: 60px;
  height: 87px;
  object-fit: cover;
`;

const CardDetails = styled.div`
  flex: 1;
  padding: var(--spacing-xs);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const CardName = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
  max-height: 2.4em;
  overflow: hidden;
`;

const CardCopies = styled.div`
  align-self: flex-end;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  padding: 2px var(--spacing-xs);
  border-radius: 10px;
`;

const PatternNotes = styled.div`
  background: var(--color-bg-info-light);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  
  h5 {
    margin-top: 0;
    color: var(--color-text-primary);
  }
  
  p {
    margin: 0;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
`;

const PatternMetadata = styled.div`
  display: flex;
  justify-content: space-between;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  border-top: 1px solid var(--color-border-light);
  padding-top: var(--spacing-sm);
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  text-align: center;
  
  h3 {
    margin-bottom: var(--spacing-md);
  }
  
  p {
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-md);
  }
  
  .tip {
    font-style: italic;
    color: var(--color-text-tertiary);
    margin-bottom: var(--spacing-lg);
  }
`;

export default SidePatternTab;