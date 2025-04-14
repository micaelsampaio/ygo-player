import React, { useState, useEffect } from 'react';
import { Card, DeckAnalysis, Deck } from '../../../types/analyzer-types';
import StrengthWeaknessPanel from './StrengthWeaknessPanel';
import CardReplacementPanel from './CardReplacementPanel';
import ArchetypeComparisonPanel from './ArchetypeComparisonPanel';
import CommunityInsightsPanel from './CommunityInsightsPanel';
import '../../../styles/analyzer-dashboard.css';

interface AnalyzerDashboardProps {
  deck: Deck;
  onUpdateDeck?: (updatedDeck: Deck) => void;
}

const AnalyzerDashboard: React.FC<AnalyzerDashboardProps> = ({ deck, onUpdateDeck }) => {
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const analyzeDeck = async () => {
      try {
        setLoading(true);
        
        // Import the analyzer module dynamically
        const analyzerModule = await import('../../../ygo-analyser/dist/module');
        
        // Initialize the analyzer with card data
        await analyzerModule.initializeAnalyzer(window.cardData || []);
        
        // Analyze the deck
        const result = await analyzerModule.analyzeDeck(deck);
        setAnalysis(result);
        setError(null);
      } catch (err) {
        console.error('Error analyzing deck:', err);
        setError('Failed to analyze deck. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (deck && deck.mainDeck && deck.mainDeck.length > 0) {
      analyzeDeck();
    }
  }, [deck]);

  const handleCardReplacement = (oldCard: Card, newCard: Card) => {
    if (!deck || !onUpdateDeck) return;
    
    // Create a copy of the deck
    const updatedDeck = { ...deck };
    
    // Replace the card in the main deck
    updatedDeck.mainDeck = updatedDeck.mainDeck.map(card => 
      card.id === oldCard.id ? newCard : card
    );
    
    // Replace the card in the extra deck if it exists
    if (updatedDeck.extraDeck) {
      updatedDeck.extraDeck = updatedDeck.extraDeck.map(card => 
        card.id === oldCard.id ? newCard : card
      );
    }
    
    // Replace the card in the side deck if it exists
    if (updatedDeck.sideDeck) {
      updatedDeck.sideDeck = updatedDeck.sideDeck.map(card => 
        card.id === oldCard.id ? newCard : card
      );
    }
    
    // Update the deck
    onUpdateDeck(updatedDeck);
  };

  if (loading) {
    return (
      <div className="analyzer-loading">
        <div className="spinner"></div>
        <p>Analyzing your deck...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analyzer-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => setLoading(true)}>Try Again</button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="analyzer-empty">
        <h3>No Analysis Available</h3>
        <p>Import a deck to get started with analysis.</p>
      </div>
    );
  }

  return (
    <div className="analyzer-dashboard">
      <div className="analyzer-header">
        <h2>{analysis.deckName} Analysis</h2>
        <div className="analyzer-meta">
          <div className="meta-item">
            <span>Archetype:</span> {analysis.archetype}
          </div>
          <div className="meta-item">
            <span>Strategy:</span> {analysis.strategy}
          </div>
          <div className="meta-item">
            <span>Confidence:</span> {(analysis.confidenceScore * 100).toFixed(0)}%
            {analysis.mlEnhanced && (
              <span className="ml-badge" title="Enhanced by machine learning">ML</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="analyzer-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'strengths' ? 'active' : ''} 
          onClick={() => setActiveTab('strengths')}
        >
          Strengths & Weaknesses
        </button>
        <button 
          className={activeTab === 'replacements' ? 'active' : ''} 
          onClick={() => setActiveTab('replacements')}
        >
          Card Replacements
        </button>
        <button 
          className={activeTab === 'archetype' ? 'active' : ''} 
          onClick={() => setActiveTab('archetype')}
        >
          Archetype Comparison
        </button>
        <button 
          className={activeTab === 'community' ? 'active' : ''} 
          onClick={() => setActiveTab('community')}
        >
          Community Insights
        </button>
      </div>
      
      <div className="analyzer-content">
        {activeTab === 'overview' && (
          <div className="overview-panel">
            <div className="key-cards">
              <h3>Key Cards</h3>
              <div className="card-grid">
                {analysis.keyCards.map(card => (
                  <div key={card.id} className="card-item">
                    <img 
                      src={`/card-images/${card.id}.jpg`} 
                      alt={card.name} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/card-images/card-back.jpg';
                      }}
                    />
                    <div className="card-name">{card.name}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="combos">
              <h3>Main Combos</h3>
              <ul className="combo-list">
                {analysis.mainCombos.length > 0 ? (
                  analysis.mainCombos.map((combo, index) => (
                    <li key={index}>{combo}</li>
                  ))
                ) : (
                  <li className="no-data">No significant combos detected</li>
                )}
              </ul>
            </div>
          </div>
        )}
        
        {activeTab === 'strengths' && (
          <StrengthWeaknessPanel 
            strengths={analysis.strengths} 
            weaknesses={analysis.weaknesses}
            counters={analysis.counters}
            techs={analysis.recommendedTechs}
          />
        )}
        
        {activeTab === 'replacements' && (
          <CardReplacementPanel 
            deck={deck}
            weaknesses={analysis.weaknesses}
            onReplaceCard={handleCardReplacement}
          />
        )}
        
        {activeTab === 'archetype' && (
          <ArchetypeComparisonPanel 
            deck={deck}
            archetype={analysis.archetype}
          />
        )}
        
        {activeTab === 'community' && (
          <CommunityInsightsPanel 
            insights={analysis.communityInsights || []}
            archetype={analysis.archetype}
          />
        )}
      </div>
    </div>
  );
};

export default AnalyzerDashboard;