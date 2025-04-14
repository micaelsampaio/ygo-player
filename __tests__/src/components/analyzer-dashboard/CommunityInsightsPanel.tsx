import React, { useState, useEffect } from 'react';

interface CommunityInsightsPanelProps {
  insights: CommunityInsight[];
  archetype: string;
}

interface CommunityInsight {
  id: string;
  userName: string;
  userRating: number;
  title: string;
  content: string;
  upvotes: number;
  timestamp: string;
  tags: string[];
}

const CommunityInsightsPanel: React.FC<CommunityInsightsPanelProps> = ({
  insights,
  archetype
}) => {
  const [loadedInsights, setLoadedInsights] = useState<CommunityInsight[]>(insights || []);
  const [loading, setLoading] = useState<boolean>(insights.length === 0);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [userInsight, setUserInsight] = useState<string>('');
  
  // If no insights are provided, fetch from the API or generate samples
  useEffect(() => {
    if (!insights || insights.length === 0) {
      setLoading(true);
      
      // Generate sample insights for demonstration purposes
      // In a real implementation, this would be an API call
      const generateSampleInsights = () => {
        const sampleInsights: CommunityInsight[] = [
          {
            id: '1',
            userName: 'DragonMaster99',
            userRating: 1850,
            title: `${archetype} Turn 1 Combo Guide`,
            content: `For ${archetype} decks, your ideal first turn combo should be to end on at least 2 disruptions. Start by searching your key starter with a consistency card like Reinforcement of the Army or Emergency Teleport depending on your deck. Remember that you need to save your normal summon for your combo extender rather than using it on your starter.`,
            upvotes: 124,
            timestamp: '2025-02-15T14:23:00Z',
            tags: ['combo', 'going-first', 'guide']
          },
          {
            id: '2',
            userName: 'YugiPro2000',
            userRating: 1720,
            title: `Side Deck Guide for ${archetype}`,
            content: `When playing ${archetype} in a tournament, your side deck should focus on countering the meta. I recommend 3x Dimensional Barrier for Synchro/XYZ matchups, 3x Twin Twisters for backrow-heavy decks, 3x Nibiru for combo decks, 3x Lancea for decks that banish, and 3x Dark Ruler No More for decks that end on multiple negates.`,
            upvotes: 89,
            timestamp: '2025-03-02T09:17:00Z',
            tags: ['side-deck', 'tournament', 'meta']
          },
          {
            id: '3',
            userName: 'RegionalChamp',
            userRating: 2100,
            title: `How I won a Regional with ${archetype}`,
            content: `I recently won a regional with my ${archetype} build by focusing on consistency above all else. I cut all the fancy techs and one-ofs in favor of running the maximum copies of my starter cards and handtraps. The key is to always open with a playable hand rather than having high ceiling but bricky hands. My tech choice was 3x Crossout Designator which saved me in multiple matches against handtrap-heavy opponents.`,
            upvotes: 215,
            timestamp: '2025-01-30T18:45:00Z',
            tags: ['tournament', 'decklist', 'tech-choices']
          },
          {
            id: '4',
            userName: 'BudgetDuelist',
            userRating: 1550,
            title: `Budget options for ${archetype}`,
            content: `If you're building ${archetype} on a budget, there are several cheaper alternatives to the expensive staples. Instead of Accesscode Talker, you can run Borrelsword Dragon. Instead of Forbidden Droplet, try Dark Ruler No More. For handtraps, Effect Veiler and D.D. Crow are much cheaper than Ash Blossom. These substitutions won't be optimal but they'll let you play the deck without breaking the bank.`,
            upvotes: 178,
            timestamp: '2025-03-10T11:32:00Z',
            tags: ['budget', 'alternatives', 'guide']
          },
          {
            id: '5',
            userName: 'ComboKing',
            userRating: 1920,
            title: `${archetype} vs the current meta`,
            content: `In the current meta, ${archetype} has favorable matchups against control decks due to your ability to play through multiple disruptions. However, you struggle against Tearlaments and Spright due to their ability to interrupt you at key choke points. When facing these decks, always bait out their disruptions with your less important effects before committing to your main combo line.`,
            upvotes: 103,
            timestamp: '2025-02-28T16:09:00Z',
            tags: ['meta', 'matchups', 'strategy']
          }
        ];
        
        setLoadedInsights(sampleInsights);
        setLoading(false);
      };
      
      // Simulate API delay
      setTimeout(generateSampleInsights, 1000);
    }
  }, [insights, archetype]);

  // Get all unique tags from the insights
  const allTags = ['all', ...Array.from(new Set(
    loadedInsights.flatMap(insight => insight.tags)
  ))];
  
  // Filter insights by selected tag
  const filteredInsights = selectedTag === 'all' 
    ? loadedInsights 
    : loadedInsights.filter(insight => insight.tags.includes(selectedTag));
  
  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag);
  };
  
  // Handle sharing a new insight
  const handleShareInsight = () => {
    if (!userInsight.trim()) return;
    
    // Create a new insight object
    const newInsight: CommunityInsight = {
      id: `user-${Date.now()}`,
      userName: 'You',
      userRating: 1500,
      title: `My insight about ${archetype}`,
      content: userInsight,
      upvotes: 1,
      timestamp: new Date().toISOString(),
      tags: ['user-content']
    };
    
    // Add to the insights list
    setLoadedInsights([newInsight, ...loadedInsights]);
    
    // Clear the input
    setUserInsight('');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading community insights...</p>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="community-insights-panel">
      <div className="panel-header">
        <h3>Community Insights</h3>
        <p className="help-text">
          Learn from other duelists' experiences with {archetype} decks
        </p>
      </div>
      
      <div className="insights-tags">
        {allTags.map(tag => (
          <button
            key={tag}
            className={`tag-button ${selectedTag === tag ? 'active' : ''}`}
            onClick={() => handleTagSelect(tag)}
          >
            {tag.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
      
      <div className="share-insight">
        <h4>Share Your Experience</h4>
        <textarea
          placeholder={`Share your tips, combos, or strategies for ${archetype} decks...`}
          value={userInsight}
          onChange={(e) => setUserInsight(e.target.value)}
          rows={3}
        />
        <button 
          className="share-button"
          onClick={handleShareInsight}
          disabled={!userInsight.trim()}
        >
          Share Insight
        </button>
      </div>
      
      <div className="insights-list">
        {filteredInsights.length > 0 ? (
          filteredInsights.map(insight => (
            <div key={insight.id} className="insight-card">
              <div className="insight-header">
                <div className="insight-title">{insight.title}</div>
                <div className="insight-meta">
                  <span className="insight-author">
                    {insight.userName} 
                    <span className="rating">{insight.userRating}</span>
                  </span>
                  <span className="insight-date">
                    {new Date(insight.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="insight-content">
                {insight.content}
              </div>
              
              <div className="insight-footer">
                <div className="insight-tags">
                  {insight.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="insight-tag"
                      onClick={() => handleTagSelect(tag)}
                    >
                      {tag.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
                
                <div className="insight-upvotes">
                  <button className="upvote-button">
                    <span className="upvote-icon">▲</span>
                  </button>
                  <span className="upvote-count">{insight.upvotes}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-insights">
            <p>No insights found for the selected tag. Be the first to share your experience!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityInsightsPanel;