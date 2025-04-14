import React, { useState, useEffect } from 'react';
import { Deck } from '../../../types/analyzer-types';

interface ArchetypeComparisonPanelProps {
  deck: Deck;
  archetype: string;
}

interface ArchetypeStats {
  name: string;
  matchPercentage: number;
  strengths: string[];
  weaknesses: string[];
  popularCards: {
    id: number;
    name: string;
    count: number;
  }[];
  missedCards: {
    id: number;
    name: string;
    importance: 'core' | 'tech' | 'optional';
  }[];
}

const ArchetypeComparisonPanel: React.FC<ArchetypeComparisonPanelProps> = ({
  deck,
  archetype
}) => {
  const [comparisons, setComparisons] = useState<ArchetypeStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedArchetype, setSelectedArchetype] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch archetype data and compare with the user's deck
  useEffect(() => {
    const compareWithArchetypes = async () => {
      setLoading(true);
      
      try {
        // In a real implementation, this would call the backend API
        // For now, we'll generate sample comparison data
        
        // Get all card IDs in the deck
        const deckCardIds = new Set([
          ...deck.mainDeck.map(card => card.id),
          ...(deck.extraDeck || []).map(card => card.id),
          ...(deck.sideDeck || []).map(card => card.id)
        ]);
        
        // Create sample archetype data
        // In a real implementation, this would use actual meta archetypes
        const archetypes: ArchetypeStats[] = [];
        
        // Add the detected archetype with high match percentage
        const mainArchetype: ArchetypeStats = {
          name: archetype,
          matchPercentage: Math.floor(Math.random() * 15) + 85, // 85-99%
          strengths: [
            'Consistent combo starters',
            'Strong disruption options',
            'Good recovery from board wipes'
          ],
          weaknesses: [
            'Vulnerable to hand traps',
            'Requires specific combo pieces',
            'Limited space for tech cards'
          ],
          popularCards: deck.mainDeck.slice(0, 5).map(card => ({
            id: card.id,
            name: card.name,
            count: Math.floor(Math.random() * 2) + 2 // 2-3 copies
          })),
          missedCards: [
            {
              id: 24224830, // Made up ID - would be a real card in actual implementation
              name: 'Called by the Grave',
              importance: 'tech'
            },
            {
              id: 14558127, // Made up ID
              name: 'Ash Blossom & Joyous Spring',
              importance: 'core'
            },
            {
              id: 43694650, // Made up ID
              name: 'Accesscode Talker',
              importance: 'optional'
            }
          ]
        };
        
        archetypes.push(mainArchetype);
        
        // Add related archetypes with lower match percentages
        const relatedArchetype1: ArchetypeStats = {
          name: archetype + ' Variant',
          matchPercentage: Math.floor(Math.random() * 15) + 65, // 65-79%
          strengths: [
            'Higher consistency',
            'Better recovery options',
            'More flexible combos'
          ],
          weaknesses: [
            'Takes more damage during setup',
            'Requires more extra deck space',
            'More vulnerable to specific counters'
          ],
          popularCards: [
            {
              id: 43694650, // Made up ID
              name: 'Accesscode Talker',
              count: 1
            },
            {
              id: 24224830,
              name: 'Called by the Grave',
              count: 2
            },
            {
              id: 14558127,
              name: 'Ash Blossom & Joyous Spring',
              count: 3
            }
          ],
          missedCards: [
            {
              id: 83152482, // Made up ID
              name: 'Upstart Goblin',
              importance: 'optional'
            },
            {
              id: 72892473, // Made up ID
              name: 'Card Destruction',
              importance: 'tech'
            }
          ]
        };
        
        const relatedArchetype2: ArchetypeStats = {
          name: 'Meta ' + archetype,
          matchPercentage: Math.floor(Math.random() * 15) + 50, // 50-64%
          strengths: [
            'Strong first turn boards',
            'Multiple win conditions',
            'Resistant to common hand traps'
          ],
          weaknesses: [
            'Expensive core cards',
            'Requires perfect play',
            'Struggles going second'
          ],
          popularCards: [
            {
              id: 59438930, // Made up ID
              name: 'Pot of Prosperity',
              count: 3
            },
            {
              id: 24224830,
              name: 'Called by the Grave',
              count: 2
            },
            {
              id: 14558127,
              name: 'Ash Blossom & Joyous Spring',
              count: 3
            }
          ],
          missedCards: [
            {
              id: 83152482,
              name: 'Upstart Goblin',
              importance: 'tech'
            },
            {
              id: 59438930,
              name: 'Pot of Prosperity',
              importance: 'core'
            },
            {
              id: 72892473,
              name: 'Card Destruction',
              importance: 'optional'
            }
          ]
        };
        
        archetypes.push(relatedArchetype1, relatedArchetype2);
        
        setComparisons(archetypes);
        setSelectedArchetype(archetype); // Default to the detected archetype
      } catch (error) {
        console.error('Error comparing with archetypes:', error);
        setError('Failed to compare your deck with established archetypes.');
      } finally {
        setLoading(false);
      }
    };
    
    if (deck && archetype) {
      compareWithArchetypes();
    }
  }, [deck, archetype]);

  const handleArchetypeSelect = (name: string) => {
    setSelectedArchetype(name);
  };

  // Get the selected archetype data
  const selectedArchetypeData = comparisons.find(a => a.name === selectedArchetype);

  if (loading) {
    return (
      <div className="loading-container">
        <p>Comparing your deck with established archetypes...</p>
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

  return (
    <div className="archetype-comparison-panel">
      <div className="panel-header">
        <h3>Archetype Comparison</h3>
        <p className="help-text">
          See how your deck compares to established archetypes and their variants
        </p>
      </div>
      
      <div className="archetype-selector">
        <div className="archetype-tabs">
          {comparisons.map(comparison => (
            <button
              key={comparison.name}
              className={`archetype-tab ${selectedArchetype === comparison.name ? 'active' : ''}`}
              onClick={() => handleArchetypeSelect(comparison.name)}
            >
              <div className="tab-name">{comparison.name}</div>
              <div className="tab-percentage">{comparison.matchPercentage}% Match</div>
            </button>
          ))}
        </div>
      </div>
      
      {selectedArchetypeData && (
        <div className="comparison-details">
          <div className="comparison-header">
            <h3>{selectedArchetypeData.name}</h3>
            <div className="match-percentage">
              <div className="percentage-bar">
                <div 
                  className="percentage-fill" 
                  style={{ width: `${selectedArchetypeData.matchPercentage}%` }}
                ></div>
              </div>
              <div className="percentage-text">
                {selectedArchetypeData.matchPercentage}% Match
              </div>
            </div>
          </div>
          
          <div className="comparison-content">
            <div className="comparison-section">
              <div className="strengths-weaknesses">
                <div className="strengths">
                  <h4>Archetype Strengths</h4>
                  <ul>
                    {selectedArchetypeData.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="weaknesses">
                  <h4>Archetype Weaknesses</h4>
                  <ul>
                    {selectedArchetypeData.weaknesses.map((weakness, index) => (
                      <li key={index}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="comparison-section">
              <h4>Popular Cards in this Archetype</h4>
              <div className="card-grid">
                {selectedArchetypeData.popularCards.map(card => (
                  <div key={card.id} className="archetype-card">
                    <img 
                      src={`/card-images/${card.id}.jpg`} 
                      alt={card.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/card-images/card-back.jpg';
                      }}
                    />
                    <div className="card-name">{card.name}</div>
                    <div className="card-count">{card.count}x</div>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedArchetypeData.missedCards.length > 0 && (
              <div className="comparison-section">
                <h4>Cards You're Missing</h4>
                <div className="card-grid">
                  {selectedArchetypeData.missedCards.map(card => (
                    <div key={card.id} className="missing-card">
                      <img 
                        src={`/card-images/${card.id}.jpg`} 
                        alt={card.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/card-images/card-back.jpg';
                        }}
                      />
                      <div className="card-name">{card.name}</div>
                      <div className={`importance-badge ${card.importance}`}>
                        {card.importance === 'core' ? 'Core' : 
                         card.importance === 'tech' ? 'Tech' : 'Optional'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="evolution-tips">
              <h4>Evolution Tips</h4>
              <p>
                To make your deck more like the {selectedArchetypeData.name} archetype:
              </p>
              <ul>
                {selectedArchetypeData.matchPercentage < 85 && (
                  <li>Add the missing core cards to improve consistency</li>
                )}
                {selectedArchetypeData.matchPercentage < 70 && (
                  <li>Adjust your Extra Deck to include key combo pieces</li>
                )}
                {selectedArchetypeData.matchPercentage < 60 && (
                  <li>Consider rebuilding your Main Deck with more focus on the archetype's key strategies</li>
                )}
                <li>Focus on adding the cards marked as 'Core' first, then 'Tech' options</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchetypeComparisonPanel;