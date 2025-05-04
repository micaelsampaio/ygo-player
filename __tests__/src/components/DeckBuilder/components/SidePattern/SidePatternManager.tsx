import React, { useState, useEffect } from "react";
import { SidingPattern, Card, Deck } from "../../types";
import { useSidePatterns } from "../../hooks/useSidePatterns";
import { getCardImageUrl, CARD_BACK_IMAGE } from "../../../../utils/cardImages";
import "./SidePattern.css";

interface SidePatternManagerProps {
  deck: Deck;
  onCardSelect?: (card: Card) => void;
}

const SidePatternManager: React.FC<SidePatternManagerProps> = ({
  deck,
  onCardSelect
}) => {
  const {
    sidePatterns,
    selectedPattern,
    createPattern,
    updatePattern,
    deletePattern,
    selectPattern,
    setSelectedPattern
  } = useSidePatterns(deck?.id);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<SidingPattern>>({
    name: "",
    matchup: "",
    description: "",
    cardsIn: [],
    cardsOut: [],
    notes: ""
  });
  
  // Form editing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const startNewPattern = () => {
    setFormData({
      name: "",
      matchup: "",
      description: "",
      cardsIn: [],
      cardsOut: [],
      notes: ""
    });
    setIsCreating(true);
    setIsEditing(false);
    setSelectedPattern(null);
  };
  
  const editPattern = (pattern: SidingPattern) => {
    setFormData(pattern);
    setIsEditing(true);
    setIsCreating(false);
  };
  
  const cancelEdit = () => {
    setIsCreating(false);
    setIsEditing(false);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCreating) {
      const newPattern = createPattern(formData as Omit<SidingPattern, 'id' | 'createdAt' | 'lastModified'>);
      if (newPattern) {
        setIsCreating(false);
        selectPattern(newPattern.id);
      }
    } else if (isEditing && selectedPattern) {
      updatePattern({ ...selectedPattern, ...formData });
      setIsEditing(false);
    }
  };
  
  // Side card movement
  const addCardToSidingIn = (card: Card) => {
    if (!selectedPattern) return;
    
    const cardEntry = {
      id: card.id,
      name: card.name,
      count: 1
    };
    
    const existingCardIndex = formData.cardsIn?.findIndex(c => c.id === card.id);
    
    if (existingCardIndex !== undefined && existingCardIndex >= 0) {
      // Card already exists, increase count if less than 3
      const updatedCardsIn = [...(formData.cardsIn || [])];
      if (updatedCardsIn[existingCardIndex].count < 3) {
        updatedCardsIn[existingCardIndex].count += 1;
        setFormData(prev => ({ ...prev, cardsIn: updatedCardsIn }));
      }
    } else {
      // Add new card
      const updatedCardsIn = [...(formData.cardsIn || []), cardEntry];
      setFormData(prev => ({ ...prev, cardsIn: updatedCardsIn }));
    }
  };
  
  const addCardToSidingOut = (card: Card) => {
    if (!selectedPattern) return;
    
    const cardEntry = {
      id: card.id,
      name: card.name,
      count: 1
    };
    
    const existingCardIndex = formData.cardsOut?.findIndex(c => c.id === card.id);
    
    if (existingCardIndex !== undefined && existingCardIndex >= 0) {
      // Card already exists, increase count if less than 3
      const updatedCardsOut = [...(formData.cardsOut || [])];
      if (updatedCardsOut[existingCardIndex].count < 3) {
        updatedCardsOut[existingCardIndex].count += 1;
        setFormData(prev => ({ ...prev, cardsOut: updatedCardsOut }));
      }
    } else {
      // Add new card
      const updatedCardsOut = [...(formData.cardsOut || []), cardEntry];
      setFormData(prev => ({ ...prev, cardsOut: updatedCardsOut }));
    }
  };
  
  const removeCardFromSiding = (id: number, isSidingIn: boolean) => {
    if (!selectedPattern) return;
    
    if (isSidingIn) {
      const updatedCardsIn = formData.cardsIn?.filter(card => card.id !== id) || [];
      setFormData(prev => ({ ...prev, cardsIn: updatedCardsIn }));
    } else {
      const updatedCardsOut = formData.cardsOut?.filter(card => card.id !== id) || [];
      setFormData(prev => ({ ...prev, cardsOut: updatedCardsOut }));
    }
  };
  
  const decreaseCardCount = (id: number, isSidingIn: boolean) => {
    if (!selectedPattern) return;
    
    if (isSidingIn) {
      const updatedCardsIn = [...(formData.cardsIn || [])];
      const cardIndex = updatedCardsIn.findIndex(card => card.id === id);
      if (cardIndex !== -1) {
        if (updatedCardsIn[cardIndex].count > 1) {
          updatedCardsIn[cardIndex].count -= 1;
        } else {
          updatedCardsIn.splice(cardIndex, 1);
        }
        setFormData(prev => ({ ...prev, cardsIn: updatedCardsIn }));
      }
    } else {
      const updatedCardsOut = [...(formData.cardsOut || [])];
      const cardIndex = updatedCardsOut.findIndex(card => card.id === id);
      if (cardIndex !== -1) {
        if (updatedCardsOut[cardIndex].count > 1) {
          updatedCardsOut[cardIndex].count -= 1;
        } else {
          updatedCardsOut.splice(cardIndex, 1);
        }
        setFormData(prev => ({ ...prev, cardsOut: updatedCardsOut }));
      }
    }
  };
  
  // Auto-select the pattern if we're in edit/create mode
  useEffect(() => {
    if ((isCreating || isEditing) && selectedPattern) {
      setFormData(selectedPattern);
    }
  }, [selectedPattern, isCreating, isEditing]);

  // Count how many cards are in/out to check balance
  const countCardsIn = formData.cardsIn?.reduce((sum, card) => sum + card.count, 0) || 0;
  const countCardsOut = formData.cardsOut?.reduce((sum, card) => sum + card.count, 0) || 0;
  const isBalanced = countCardsIn === countCardsOut;
  
  return (
    <div className="side-pattern-manager">
      <div className="side-pattern-header">
        <h3>Side Deck Patterns</h3>
        <button className="create-pattern-btn" onClick={startNewPattern}>
          Create New Pattern
        </button>
      </div>
      
      <div className="side-pattern-content">
        <div className="pattern-list">
          <h4>Available Patterns</h4>
          {sidePatterns.length === 0 ? (
            <p className="no-patterns-message">No side patterns created yet. Create your first pattern!</p>
          ) : (
            <ul className="patterns-list">
              {sidePatterns.map(pattern => (
                <li 
                  key={pattern.id} 
                  className={selectedPattern?.id === pattern.id ? 'pattern-item active' : 'pattern-item'}
                  onClick={() => selectPattern(pattern.id)}
                >
                  <div className="pattern-item-header">
                    <span className="pattern-name">{pattern.name}</span>
                    <span className="pattern-matchup">vs. {pattern.matchup}</span>
                  </div>
                  <div className="pattern-card-counts">
                    <span className="out-count">{pattern.cardsOut.reduce((sum, card) => sum + card.count, 0)} out</span>
                    <span className="in-count">{pattern.cardsIn.reduce((sum, card) => sum + card.count, 0)} in</span>
                  </div>
                  <div className="pattern-actions">
                    <button className="edit-btn" onClick={(e) => {
                      e.stopPropagation();
                      editPattern(pattern);
                    }}>
                      Edit
                    </button>
                    <button className="delete-btn" onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${pattern.name}" pattern?`)) {
                        deletePattern(pattern.id);
                      }
                    }}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {(isCreating || isEditing) ? (
          <div className="pattern-form">
            <h4>{isCreating ? 'Create New Pattern' : 'Edit Pattern'}</h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Pattern Name:</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="e.g., Standard vs Spright"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="matchup">Matchup:</label>
                <input 
                  type="text" 
                  id="matchup" 
                  name="matchup" 
                  value={formData.matchup} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="e.g., Spright"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description:</label>
                <input 
                  type="text" 
                  id="description" 
                  name="description" 
                  value={formData.description || ''} 
                  onChange={handleInputChange}
                  placeholder="Optional description" 
                />
              </div>
              
              <div className="cards-section">
                <div className="cards-out-section">
                  <h5>Cards to Side OUT</h5>
                  <div className="cards-grid">
                    {formData.cardsOut?.map(card => (
                      <div key={`out-${card.id}`} className="card-item">
                        <div className="card-actions">
                          <button 
                            type="button" 
                            className="remove-btn"
                            onClick={() => decreaseCardCount(card.id, false)}
                          >
                            -
                          </button>
                          <span className="card-count">{card.count}x</span>
                          <button 
                            type="button" 
                            className="remove-btn"
                            onClick={() => removeCardFromSiding(card.id, false)}
                          >
                            ×
                          </button>
                        </div>
                        <div 
                          className="side-card"
                          onClick={() => {
                            const fullCard = [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck]
                              .find(c => c.id === card.id);
                            if (fullCard && onCardSelect) onCardSelect(fullCard);
                          }}
                        >
                          <img 
                            src={getCardImageUrl(card.id, 'small')} 
                            alt={card.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = CARD_BACK_IMAGE;
                            }}
                          />
                          <div className="card-name">{card.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="deck-cards">
                    <h6>Select cards from main/extra deck</h6>
                    <div className="deck-cards-grid">
                      {[...deck.mainDeck, ...deck.extraDeck].slice(0, 20).map((card, index) => (
                        <div 
                          key={`deck-${card.id}-${index}`} 
                          className="mini-card"
                          onClick={() => addCardToSidingOut(card)}
                        >
                          <img 
                            src={getCardImageUrl(card.id, 'small')} 
                            alt={card.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = CARD_BACK_IMAGE;
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {deck.mainDeck.length + deck.extraDeck.length > 20 && (
                      <p className="more-cards">
                        And {deck.mainDeck.length + deck.extraDeck.length - 20} more cards...
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="cards-in-section">
                  <h5>Cards to Side IN</h5>
                  <div className="cards-grid">
                    {formData.cardsIn?.map(card => (
                      <div key={`in-${card.id}`} className="card-item">
                        <div className="card-actions">
                          <button 
                            type="button" 
                            className="remove-btn"
                            onClick={() => decreaseCardCount(card.id, true)}
                          >
                            -
                          </button>
                          <span className="card-count">{card.count}x</span>
                          <button 
                            type="button" 
                            className="remove-btn"
                            onClick={() => removeCardFromSiding(card.id, true)}
                          >
                            ×
                          </button>
                        </div>
                        <div 
                          className="side-card"
                          onClick={() => {
                            const fullCard = [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck]
                              .find(c => c.id === card.id);
                            if (fullCard && onCardSelect) onCardSelect(fullCard);
                          }}
                        >
                          <img 
                            src={getCardImageUrl(card.id, 'small')} 
                            alt={card.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = CARD_BACK_IMAGE;
                            }}
                          />
                          <div className="card-name">{card.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="side-cards">
                    <h6>Select cards from side deck</h6>
                    <div className="side-cards-grid">
                      {deck.sideDeck.map((card, index) => (
                        <div 
                          key={`side-${card.id}-${index}`} 
                          className="mini-card"
                          onClick={() => addCardToSidingIn(card)}
                        >
                          <img 
                            src={getCardImageUrl(card.id, 'small')} 
                            alt={card.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = CARD_BACK_IMAGE;
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {deck.sideDeck.length === 0 && (
                      <p className="no-side-cards">
                        No side deck cards available. Add cards to your side deck first.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="notes">Notes:</label>
                <textarea 
                  id="notes" 
                  name="notes" 
                  value={formData.notes || ''} 
                  onChange={handleInputChange}
                  placeholder="Additional notes about this side pattern strategy" 
                  rows={4}
                />
              </div>
              
              {!isBalanced && (
                <div className="balance-warning">
                  <p>Warning: The number of cards to side in ({countCardsIn}) 
                  does not match the number to side out ({countCardsOut}). 
                  Your side deck should be balanced.</p>
                </div>
              )}
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {isCreating ? 'Create Pattern' : 'Update Pattern'}
                </button>
              </div>
            </form>
          </div>
        ) : selectedPattern ? (
          <div className="pattern-details">
            <div className="pattern-details-header">
              <h4>{selectedPattern.name}</h4>
              <span className="vs-text">vs. {selectedPattern.matchup}</span>
              {selectedPattern.description && (
                <p className="pattern-description">{selectedPattern.description}</p>
              )}
            </div>
            
            <div className="side-cards-display">
              <div className="side-out-section">
                <h5>Side OUT:</h5>
                <div className="side-cards-grid">
                  {selectedPattern.cardsOut.map(card => (
                    <div key={`display-out-${card.id}`} className="side-card-display">
                      <div 
                        className="side-card"
                        onClick={() => {
                          const fullCard = [...deck.mainDeck, ...deck.extraDeck]
                            .find(c => c.id === card.id);
                          if (fullCard && onCardSelect) onCardSelect(fullCard);
                        }}
                      >
                        <img 
                          src={getCardImageUrl(card.id, 'small')} 
                          alt={card.name}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = CARD_BACK_IMAGE;
                          }}
                        />
                        <div className="card-name">{card.name}</div>
                        <div className="card-count">{card.count}x</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="side-in-section">
                <h5>Side IN:</h5>
                <div className="side-cards-grid">
                  {selectedPattern.cardsIn.map(card => (
                    <div key={`display-in-${card.id}`} className="side-card-display">
                      <div 
                        className="side-card"
                        onClick={() => {
                          const fullCard = deck.sideDeck
                            .find(c => c.id === card.id);
                          if (fullCard && onCardSelect) onCardSelect(fullCard);
                        }}
                      >
                        <img 
                          src={getCardImageUrl(card.id, 'small')} 
                          alt={card.name}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = CARD_BACK_IMAGE;
                          }}
                        />
                        <div className="card-name">{card.name}</div>
                        <div className="card-count">{card.count}x</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {selectedPattern.notes && (
              <div className="pattern-notes">
                <h5>Notes:</h5>
                <p>{selectedPattern.notes}</p>
              </div>
            )}
            
            <div className="pattern-details-actions">
              <button 
                className="edit-pattern-btn" 
                onClick={() => editPattern(selectedPattern)}
              >
                Edit Pattern
              </button>
              <button 
                className="delete-pattern-btn" 
                onClick={() => {
                  if (window.confirm(`Delete "${selectedPattern.name}" pattern?`)) {
                    deletePattern(selectedPattern.id);
                  }
                }}
              >
                Delete Pattern
              </button>
            </div>
          </div>
        ) : (
          <div className="no-pattern-selected">
            <p>Select a pattern from the list or create a new one.</p>
            <button onClick={startNewPattern} className="create-pattern-btn">
              Create New Pattern
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidePatternManager;