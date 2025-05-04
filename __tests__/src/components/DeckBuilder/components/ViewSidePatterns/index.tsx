import React, { useState, useEffect } from 'react';
import { Card, Deck, SidingPattern } from '../../types';
import { useSidePatterns } from '../../hooks/useSidePatterns';
import './ViewSidePatterns.css';

interface ViewSidePatternsProps {
  deck: Deck;
}

const ViewSidePatterns: React.FC<ViewSidePatternsProps> = ({ deck }) => {
  const {
    sidePatterns,
    selectedPattern,
    isLoading,
    selectPattern,
    setSelectedPattern
  } = useSidePatterns(deck.id);

  // Reset selected pattern when deck changes
  useEffect(() => {
    if (sidePatterns.length > 0 && !selectedPattern) {
      setSelectedPattern(sidePatterns[0]);
    }
  }, [sidePatterns, selectedPattern, setSelectedPattern]);

  if (isLoading) {
    return <div className="view-side-patterns-loading">Loading side patterns...</div>;
  }

  return (
    <div className="view-side-patterns">
      {sidePatterns.length === 0 ? (
        <div className="no-patterns-message">
          <h3>No Side Patterns Found</h3>
          <p>This deck doesn't have any side patterns defined. Side patterns help you quickly swap cards for different matchups.</p>
          <p>You can create side patterns in the Deck Builder by clicking the "Edit" button above.</p>
        </div>
      ) : (
        <div className="view-side-patterns-container">
          <div className="patterns-list">
            <h3>Side Patterns</h3>
            <div className="patterns-scroll">
              {sidePatterns.map((pattern) => (
                <div 
                  key={pattern.id} 
                  className={`pattern-item ${selectedPattern?.id === pattern.id ? 'selected' : ''}`}
                  onClick={() => selectPattern(pattern.id)}
                >
                  <div className="pattern-name">{pattern.name}</div>
                  <div className="pattern-matchup">vs. {pattern.matchup}</div>
                </div>
              ))}
            </div>
          </div>
          
          {selectedPattern && (
            <div className="pattern-details">
              <div className="pattern-header">
                <h3>{selectedPattern.name}</h3>
                <div className="matchup-label">vs. {selectedPattern.matchup}</div>
              </div>
              
              {selectedPattern.description && (
                <div className="pattern-description">
                  <p>{selectedPattern.description}</p>
                </div>
              )}
              
              <div className="side-cards-container">
                <div className="side-cards-section">
                  <h4>Side Out ({selectedPattern.cardsToRemove.length})</h4>
                  <div className="cards-grid">
                    {selectedPattern.cardsToRemove.length > 0 ? (
                      selectedPattern.cardsToRemove.map((card) => (
                        <div key={`remove-${card.id}`} className="card-item">
                          <img 
                            src={card.card_images?.[0]?.image_url_small || `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`}
                            alt={card.name}
                            title={card.name}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="no-cards">No cards to side out</p>
                    )}
                  </div>
                </div>
                
                <div className="side-cards-section">
                  <h4>Side In ({selectedPattern.cardsToAdd.length})</h4>
                  <div className="cards-grid">
                    {selectedPattern.cardsToAdd.length > 0 ? (
                      selectedPattern.cardsToAdd.map((card) => (
                        <div key={`add-${card.id}`} className="card-item">
                          <img 
                            src={card.card_images?.[0]?.image_url_small || `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`}
                            alt={card.name}
                            title={card.name}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="no-cards">No cards to side in</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewSidePatterns;