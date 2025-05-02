import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import theme from '../../styles/theme';

interface CardInfo {
  name: string;
  quantity: number;
  id?: number;
}

interface DeckData {
  mainDeck: CardInfo[];
  extraDeck: CardInfo[];
  sideDeck: CardInfo[];
}

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const Title = styled.h2`
  font-size: ${theme.typography.size.xl};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.sm} 0;
`;

const Card = styled.div`
  background: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  padding: ${theme.spacing.md};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 400px;
  padding: ${theme.spacing.sm};
  font-family: ${theme.typography.fontFamily};
  font-size: ${theme.typography.size.sm};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.sm};
  resize: vertical;
`;

const Button = styled.button`
  background: ${theme.colors.primary.main};
  color: ${theme.colors.text.inverse};
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  font-size: ${theme.typography.size.base};
  font-weight: ${theme.typography.weight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
  
  &:hover {
    background: ${theme.colors.primary.dark};
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
  
  &:disabled {
    background: ${theme.colors.action.disabled};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const InfoPanel = styled.div`
  padding: ${theme.spacing.sm};
  background: ${theme.colors.background.paper};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.sm};
  margin-bottom: ${theme.spacing.md};
  font-size: ${theme.typography.size.sm};
  
  h3 {
    font-size: ${theme.typography.size.md};
    margin: 0 0 ${theme.spacing.xs} 0;
  }
  
  p {
    margin: 0 0 ${theme.spacing.xs} 0;
  }
  
  ul {
    margin: 0;
    padding-left: ${theme.spacing.md};
  }
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error.main};
  padding: ${theme.spacing.sm};
  background: ${theme.colors.error.main}10;
  border-radius: ${theme.borderRadius.sm};
  margin-bottom: ${theme.spacing.md};
  font-size: ${theme.typography.size.sm};
`;

const CardDatabase = React.createContext<Record<string, number>>({});

const ListToYDK: React.FC = () => {
  const [listText, setListText] = useState('');
  const [ydkText, setYdkText] = useState('');
  const [direction, setDirection] = useState<'listToYdk' | 'ydkToList'>('listToYdk');
  const [error, setError] = useState<string | null>(null);
  const [cardDatabase, setCardDatabase] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Load the card database on component mount
  useEffect(() => {
    const fetchCardDatabase = async () => {
      try {
        setIsLoading(true);
        // Try to load from localStorage first for faster startup
        const cachedDb = localStorage.getItem('ygo_card_database');
        if (cachedDb) {
          setCardDatabase(JSON.parse(cachedDb));
          setIsLoading(false);
          return;
        }
        
        // If not in localStorage, load from your data source
        const response = await fetch('/data/cards.json');
        if (!response.ok) {
          throw new Error('Failed to load card database');
        }
        
        const cardsData = await response.json();
        
        // Create a name-to-id mapping
        const nameToIdMap: Record<string, number> = {};
        cardsData.forEach((card: any) => {
          nameToIdMap[card.name.toLowerCase()] = card.id;
        });
        
        // Save to localStorage for future use
        localStorage.setItem('ygo_card_database', JSON.stringify(nameToIdMap));
        setCardDatabase(nameToIdMap);
      } catch (err) {
        console.error('Error loading card database:', err);
        setError('Failed to load card database. Some features may be limited.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCardDatabase();
  }, []);
  
  const parseDecklist = (text: string): DeckData => {
    const result: DeckData = {
      mainDeck: [],
      extraDeck: [],
      sideDeck: []
    };
    
    let currentSection: 'mainDeck' | 'extraDeck' | 'sideDeck' = 'mainDeck';
    const lines = text.split('\n');
    
    for (let line of lines) {
      line = line.trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check for section markers
      if (line.toLowerCase().includes('extra deck') || line.includes('---------')) {
        currentSection = 'extraDeck';
        continue;
      } else if (line.toLowerCase().includes('side deck')) {
        currentSection = 'sideDeck';
        continue;
      } else if (line.toLowerCase().includes('main deck')) {
        currentSection = 'mainDeck';
        continue;
      }
      
      // Parse card entries
      const match = line.match(/^(\d+)x?\s+(.+)$/) || line.match(/^x?(\d+)\s+(.+)$/);
      
      if (match) {
        const quantity = parseInt(match[1], 10);
        const name = match[2].trim();
        
        // Get card ID if available in the database
        const cardId = cardDatabase[name.toLowerCase()];
        
        result[currentSection].push({
          name,
          quantity,
          id: cardId
        });
      }
    }
    
    return result;
  };
  
  const createYdkContent = (deckData: DeckData): string => {
    const lines: string[] = ['#created by YGO Player ListToYDK Tool', '#main'];
    
    // Add main deck
    deckData.mainDeck.forEach(card => {
      if (card.id) {
        for (let i = 0; i < card.quantity; i++) {
          lines.push(card.id.toString());
        }
      } else {
        setError(`Warning: Could not find card ID for '${card.name}'. This card will be omitted from the YDK.`);
      }
    });
    
    lines.push('#extra');
    
    // Add extra deck
    deckData.extraDeck.forEach(card => {
      if (card.id) {
        for (let i = 0; i < card.quantity; i++) {
          lines.push(card.id.toString());
        }
      } else {
        setError(`Warning: Could not find card ID for '${card.name}'. This card will be omitted from the YDK.`);
      }
    });
    
    lines.push('#side');
    
    // Add side deck
    deckData.sideDeck.forEach(card => {
      if (card.id) {
        for (let i = 0; i < card.quantity; i++) {
          lines.push(card.id.toString());
        }
      } else {
        setError(`Warning: Could not find card ID for '${card.name}'. This card will be omitted from the YDK.`);
      }
    });
    
    lines.push('!side');
    
    return lines.join('\n');
  };
  
  const parseYdk = (ydkContent: string): DeckData => {
    const result: DeckData = {
      mainDeck: [],
      extraDeck: [],
      sideDeck: []
    };
    
    const lines = ydkContent.split('\n');
    let currentSection: 'mainDeck' | 'extraDeck' | 'sideDeck' | null = null;
    const idToCardMap: Record<string, CardInfo> = {};
    
    // Create reverse mapping from ID to card name
    const idToNameMap: Record<string, string> = {};
    Object.entries(cardDatabase).forEach(([name, id]) => {
      idToNameMap[id.toString()] = name;
    });
    
    for (let line of lines) {
      line = line.trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#created') || line.startsWith('!')) continue;
      
      // Check for section markers
      if (line === '#main') {
        currentSection = 'mainDeck';
        continue;
      } else if (line === '#extra') {
        currentSection = 'extraDeck';
        continue;
      } else if (line === '#side') {
        currentSection = 'sideDeck';
        continue;
      }
      
      // Skip if not in a valid section
      if (!currentSection) continue;
      
      // Parse card IDs
      if (/^\d+$/.test(line)) {
        const id = line;
        const name = idToNameMap[id] || `Unknown Card (ID: ${id})`;
        
        // Check if we already have this card in the current section
        const sectionKey = `${currentSection}-${id}`;
        if (idToCardMap[sectionKey]) {
          idToCardMap[sectionKey].quantity++;
        } else {
          idToCardMap[sectionKey] = {
            name,
            quantity: 1,
            id: parseInt(id, 10)
          };
        }
      }
    }
    
    // Convert to array format
    Object.entries(idToCardMap).forEach(([key, card]) => {
      const [section] = key.split('-');
      if (section === 'mainDeck') {
        result.mainDeck.push(card);
      } else if (section === 'extraDeck') {
        result.extraDeck.push(card);
      } else if (section === 'sideDeck') {
        result.sideDeck.push(card);
      }
    });
    
    return result;
  };
  
  const createDecklistText = (deckData: DeckData): string => {
    const lines: string[] = [];
    
    // Main Deck
    lines.push('Main Deck:');
    deckData.mainDeck.forEach(card => {
      lines.push(`${card.quantity}x ${card.name}`);
    });
    lines.push('---------');
    
    // Extra Deck
    lines.push('Extra Deck:');
    deckData.extraDeck.forEach(card => {
      lines.push(`${card.quantity}x ${card.name}`);
    });
    lines.push('---------');
    
    // Side Deck
    lines.push('Side Deck:');
    deckData.sideDeck.forEach(card => {
      lines.push(`${card.quantity}x ${card.name}`);
    });
    lines.push('---------');
    
    return lines.join('\n');
  };
  
  const handleConvert = () => {
    setError(null);
    
    try {
      if (direction === 'listToYdk') {
        const deckData = parseDecklist(listText);
        const ydkContent = createYdkContent(deckData);
        setYdkText(ydkContent);
      } else {
        const deckData = parseYdk(ydkText);
        const decklistText = createDecklistText(deckData);
        setListText(decklistText);
      }
    } catch (err) {
      setError(`Conversion error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  const downloadYdk = () => {
    if (!ydkText) return;
    
    const blob = new Blob([ydkText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deck.ydk';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <CardDatabase.Provider value={cardDatabase}>
      <Card>
        <Title>Deck List Converter</Title>
        
        <InfoPanel>
          <h3>How to use:</h3>
          <p>This tool converts between deck list format and YDK format.</p>
          <ul>
            <li>Deck list format should include "Main Deck:", "Extra Deck:", and "Side Deck:" labels</li>
            <li>Cards should be listed as "3x Card Name" or "3 Card Name"</li>
            <li>YDK format is used by most Yu-Gi-Oh! simulators</li>
          </ul>
        </InfoPanel>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <div>
          <label>
            <input 
              type="radio" 
              name="direction" 
              checked={direction === 'listToYdk'} 
              onChange={() => setDirection('listToYdk')} 
            />
            Deck List → YDK
          </label>
          <label style={{ marginLeft: theme.spacing.md }}>
            <input 
              type="radio" 
              name="direction" 
              checked={direction === 'ydkToList'} 
              onChange={() => setDirection('ydkToList')} 
            />
            YDK → Deck List
          </label>
        </div>
        
        <Container>
          <Column>
            <h3>{direction === 'listToYdk' ? 'Deck List' : 'YDK Format'}</h3>
            <TextArea
              value={direction === 'listToYdk' ? listText : ydkText}
              onChange={(e) => {
                if (direction === 'listToYdk') {
                  setListText(e.target.value);
                } else {
                  setYdkText(e.target.value);
                }
              }}
              placeholder={
                direction === 'listToYdk' 
                  ? 'Paste your deck list here...' 
                  : 'Paste your YDK content here...'
              }
            />
          </Column>
          
          <Column>
            <h3>{direction === 'listToYdk' ? 'YDK Format' : 'Deck List'}</h3>
            <TextArea
              value={direction === 'listToYdk' ? ydkText : listText}
              readOnly
              placeholder={
                direction === 'listToYdk' 
                  ? 'Converted YDK will appear here...' 
                  : 'Converted deck list will appear here...'
              }
            />
            {direction === 'listToYdk' && ydkText && (
              <Button onClick={downloadYdk}>Download YDK File</Button>
            )}
          </Column>
        </Container>
        
        <Button 
          onClick={handleConvert} 
          disabled={isLoading || (!listText && !ydkText)}
        >
          {isLoading ? 'Loading Card Database...' : 'Convert'}
        </Button>
      </Card>
    </CardDatabase.Provider>
  );
};

export default ListToYDK;