import React, { useState, useEffect } from 'react';
import { Card } from '../../../types/analyzer-types';

interface CardReplacementPanelProps {
  deckCards: Card[];
  archetype: string;
}

interface ReplacementSuggestion {
  originalCard: Card;
  replacementOptions: {
    card: Card;
    reason: string;
    confidence: number;
    price?: number;
  }[];
}

const CardReplacementPanel: React.FC<CardReplacementPanelProps> = ({
  deckCards,
  archetype
}) => {
  const [suggestions, setSuggestions] = useState<ReplacementSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<'all' | 'budget' | 'competitive'>('all');
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(-1);

  // Fetch replacement suggestions for cards in the deck
  useEffect(() => {
    const fetchReplacementSuggestions = async () => {
      setLoading(true);
      
      try {
        // In a real implementation, this would call the backend API
        // For now, we'll generate sample replacement suggestions
        
        // Find cards that are less optimal or could be upgraded
        const weakCards = deckCards.filter(card => {
          // This is just a simple example - in reality you'd have a more complex algorithm
          // that identifies cards based on their synergy with the archetype, meta relevance, etc.
          
          // For now, mark about 30% of cards as candidates for replacement
          return Math.random() < 0.3;
        });
        
        // Create replacement suggestions for each weak card
        const generatedSuggestions: ReplacementSuggestion[] = weakCards.map(card => {
          // Generate 1-3 replacement options per card
          const numOptions = Math.floor(Math.random() * 3) + 1;
          
          // Sample replacement card IDs - in a real implementation these would be actual card IDs
          const sampleCards = [
            { id: 55623480, name: "Accesscode Talker", type: "Link Monster", desc: "2+ Effect Monsters\nIf this card is Link Summoned: You can target monsters in your GY, up to the number of different attributes of monsters that were used as material for this card's Link Summon; banish them. This card gains 1000 ATK for each card banished by this effect. Once per turn: You can banish 1 monster from your GY, then target 1 card your opponent controls; destroy it. Your opponent cannot activate cards or effects in response to this effect's activation.", atk: 2300, def: null, level: null, attribute: "DARK" },
            { id: 24224830, name: "Called by the Grave", type: "Quick-Play Spell", desc: "Target 1 monster in your opponent's GY; banish it, and if you do, until the end of the next turn, its effects are negated, as well as the activated effects and effects on the field of monsters with the same original name.", atk: null, def: null, level: null, attribute: null },
            { id: 14558127, name: "Ash Blossom & Joyous Spring", type: "Tuner Monster", desc: "When a card or effect is activated that includes any of these effects (Quick Effect): You can discard this card; negate that effect.\n● Add a card from the Deck to the hand.\n● Special Summon from the Deck.\n● Send a card from the Deck to the GY.\nYou can only use this effect of \"Ash Blossom & Joyous Spring\" once per turn.", atk: 0, def: 1800, level: 3, attribute: "FIRE" },
            { id: 59438930, name: "Pot of Prosperity", type: "Spell Card", desc: "Banish 3 or 6 cards of your choice from your Extra Deck, face-down; for the rest of this turn after this card resolves, any damage your opponent takes is halved. Draw cards equal to the number of cards banished divided by 3. For the rest of this turn after this card resolves, you cannot draw cards by card effects. You can only activate 1 \"Pot of Prosperity\" per turn. You cannot draw cards by card effects the turn you activate this card, except by this card's effect.", atk: null, def: null, level: null, attribute: null },
            { id: 83152482, name: "Upstart Goblin", type: "Spell Card", desc: "Draw 1 card, then your opponent gains 1000 LP.", atk: null, def: null, level: null, attribute: null },
            { id: 72892473, name: "Card Destruction", type: "Spell Card", desc: "Each player discards as many cards as possible from their hand, then each player draws the same number of cards they discarded.", atk: null, def: null, level: null, attribute: null }
          ];
          
          // Generate replacement options
          const replacementOptions = Array.from({ length: numOptions }, (_, i) => {
            // Select a random card from the sample cards
            const replacementCard = sampleCards[Math.floor(Math.random() * sampleCards.length)];
            
            // Generate a reason for the replacement
            const reasons = [
              `${replacementCard.name} has better synergy with your ${archetype} strategy`,
              `${replacementCard.name} is a meta-relevant card that improves your overall deck consistency`,
              `${replacementCard.name} provides better disruption against current meta decks`,
              `${replacementCard.name} helps solve a weakness in your deck's strategy`,
              `${replacementCard.name} is a stronger combo starter than ${card.name}`
            ];
            
            return {
              card: replacementCard,
              reason: reasons[Math.floor(Math.random() * reasons.length)],
              confidence: Math.floor(Math.random() * 41) + 60, // 60-100%
              price: Math.floor(Math.random() * 50) + (i * 10) // $0-50 for budget, more for better cards
            };
          });
          
          return {
            originalCard: card,
            replacementOptions
          };
        });
        
        setSuggestions(generatedSuggestions);
      } catch (error) {
        console.error('Error fetching replacement suggestions:', error);
        setError('Failed to get card replacement suggestions.');
      } finally {
        setLoading(false);
      }
    };
    
    if (deckCards && deckCards.length > 0) {
      fetchReplacementSuggestions();
    }
  }, [deckCards, archetype]);

  // Filter suggestions by budget preference
  const filteredSuggestions = suggestions.map(suggestion => {
    let filteredOptions = suggestion.replacementOptions;
    
    if (budget === 'budget') {
      // Only show options under $20
      filteredOptions = filteredOptions.filter(option => (option.price || 0) <= 20);
    } else if (budget === 'competitive') {
      // Sort by highest confidence first (best competitive options)
      filteredOptions = [...filteredOptions].sort((a, b) => b.confidence - a.confidence);
    }
    
    return {
      ...suggestion,
      replacementOptions: filteredOptions
    };
  });

  // Handle card selection
  const handleCardSelect = (index: number) => {
    setSelectedCardIndex(index === selectedCardIndex ? -1 : index);
  };

  // Handle budget filter change
  const handleBudgetChange = (value: 'all' | 'budget' | 'competitive') => {
    setBudget(value);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Analyzing your deck for possible improvements...</p>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="no-suggestions">
        <h3>No Replacement Suggestions</h3>
        <p>Your deck looks optimized! We don't have any specific card replacement suggestions at this time.</p>
      </div>
    );
  }

  return (
    <div className="card-replacement-panel">
      <div className="panel-header">
        <h3>Card Replacement Recommendations</h3>
        <p className="help-text">
          Find better alternatives for cards in your deck
        </p>
      </div>
      
      <div className="filter-options">
        <div className="budget-filter">
          <span>Budget Preference:</span>
          <div className="budget-buttons">
            <button 
              className={`budget-button ${budget === 'all' ? 'active' : ''}`}
              onClick={() => handleBudgetChange('all')}
            >
              All
            </button>
            <button 
              className={`budget-button ${budget === 'budget' ? 'active' : ''}`}
              onClick={() => handleBudgetChange('budget')}
            >
              Budget
            </button>
            <button 
              className={`budget-button ${budget === 'competitive' ? 'active' : ''}`}
              onClick={() => handleBudgetChange('competitive')}
            >
              Competitive
            </button>
          </div>
        </div>
      </div>
      
      <div className="replacement-cards-list">
        {filteredSuggestions.map((suggestion, index) => (
          <div 
            key={suggestion.originalCard.id} 
            className={`replacement-card-item ${selectedCardIndex === index ? 'expanded' : ''}`}
            onClick={() => handleCardSelect(index)}
          >
            <div className="card-comparison">
              <div className="original-card">
                <img 
                  src={`/card-images/${suggestion.originalCard.id}.jpg`} 
                  alt={suggestion.originalCard.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/card-images/card-back.jpg';
                  }}
                />
                <div className="card-name">{suggestion.originalCard.name}</div>
              </div>
              
              <div className="replacement-indicator">
                <span className="arrow">→</span>
              </div>
              
              <div className="replacement-options-preview">
                {suggestion.replacementOptions.length > 0 ? (
                  suggestion.replacementOptions.map((option, i) => (
                    <div key={option.card.id} className="replacement-option-preview">
                      <img 
                        src={`/card-images/${option.card.id}.jpg`} 
                        alt={option.card.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/card-images/card-back.jpg';
                        }}
                      />
                      <div className="confidence-badge">
                        {option.confidence}% Match
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-options">
                    No replacements match your budget filter
                  </div>
                )}
              </div>
            </div>
            
            {selectedCardIndex === index && (
              <div className="replacement-details">
                <h4>Why Replace {suggestion.originalCard.name}?</h4>
                <p className="replace-reason">
                  This card could be improved to better support your {archetype} strategy.
                </p>
                
                <div className="replacement-options-detailed">
                  {suggestion.replacementOptions.length > 0 ? (
                    suggestion.replacementOptions.map(option => (
                      <div key={option.card.id} className="replacement-option-detailed">
                        <div className="option-card">
                          <img 
                            src={`/card-images/${option.card.id}.jpg`} 
                            alt={option.card.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/card-images/card-back.jpg';
                            }}
                          />
                        </div>
                        
                        <div className="option-details">
                          <div className="option-header">
                            <h5>{option.card.name}</h5>
                            <div className="option-meta">
                              {option.price !== undefined && (
                                <span className="price">${option.price.toFixed(2)}</span>
                              )}
                              <span className="confidence">{option.confidence}% Match</span>
                            </div>
                          </div>
                          
                          <div className="option-type">
                            {option.card.type}
                          </div>
                          
                          <div className="option-reason">
                            <strong>Why this card:</strong> {option.reason}
                          </div>
                          
                          <div className="option-effect">
                            <strong>Card Text:</strong> {option.card.desc}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-options-message">
                      No replacements match your current budget filter. Try changing the filter to see all options.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardReplacementPanel;