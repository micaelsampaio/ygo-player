import React, { useState } from 'react';
import styled from 'styled-components';
import theme from '../../styles/theme';

interface DeckConverterProps {
  size?: 'small' | 'medium' | 'large';
}

const Container = styled.div<{ $size: string }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: ${props => props.$size === 'small' 
    ? '500px' 
    : props.$size === 'medium' 
      ? '650px' 
      : '800px'};
  background: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  padding: ${props => props.$size === 'small' 
    ? theme.spacing.sm 
    : props.$size === 'medium' 
      ? theme.spacing.md 
      : theme.spacing.lg};
  margin: 0 auto;
`;

const Title = styled.h2`
  font-size: ${theme.typography.size.xl};
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.md} 0;
  text-align: center;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.border.default};
  margin-bottom: ${theme.spacing.md};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$active ? theme.colors.background.paper : 'transparent'};
  border: none;
  border-bottom: ${props => props.$active ? `2px solid ${theme.colors.primary.main}` : 'none'};
  color: ${props => props.$active ? theme.colors.primary.main : theme.colors.text.primary};
  font-weight: ${props => props.$active ? theme.typography.weight.bold : theme.typography.weight.normal};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${theme.colors.background.paper};
    color: ${theme.colors.primary.main};
  }
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${theme.typography.size.md};
  font-weight: ${theme.typography.weight.medium};
  margin-bottom: ${theme.spacing.xs};
  color: ${theme.colors.text.primary};
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 200px;
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.sm};
  font-family: monospace;
  font-size: ${theme.typography.size.sm};
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$primary ? theme.colors.primary.main : theme.colors.background.default};
  color: ${props => props.$primary ? theme.colors.text.inverse : theme.colors.text.primary};
  border: 1px solid ${props => props.$primary ? theme.colors.primary.main : theme.colors.border.default};
  border-radius: ${theme.borderRadius.md};
  font-weight: ${theme.typography.weight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$primary ? theme.colors.primary.dark : theme.colors.background.paper};
    transform: translateY(-2px);
  }
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error.main};
  font-size: ${theme.typography.size.sm};
  margin-top: ${theme.spacing.xs};
`;

const SuccessMessage = styled.div`
  color: ${theme.colors.success.main};
  font-size: ${theme.typography.size.sm};
  margin-top: ${theme.spacing.xs};
`;

const ResultContainer = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.light};
`;

const InfoSection = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.sm};
  background-color: ${theme.colors.background.default};
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.info.main};
`;

// Card name to ID mapping
interface CardDatabase {
  [key: string]: number;
}

// Sample database with just a few cards for demonstration
const cardDatabase: CardDatabase = {
  "Ash Blossom & Joyous Spring": 14558127,
  "Forbidden Droplet": 24299458,
  "Triple Tactics Talent": 24224830,
  "Called by the Grave": 24224830,
  "Cross-Sheep": 50277973,
  "Solemn Judgment": 41420027,
  "Artifact Lancea": 73146473,
  "Droll & Lock Bird": 94145021,
  "Mementotlan Angwitch": 57370439,
  "Mementotlan Tatsunootoshigo": 84696458,
  "Mementotlan-Horned Dragon": 11328704,
  "Mementotlan Dark Blade": 47435107,
  "Mementotlan Shleepy": 83241722,
  "Mementoal Tecuhtlica - Combined Creation": 19353842,
  "Mementotlan Goblin": 55520860,
  "Mementotlan Ghattic": 81005842,
  "Mementotlan Akihiron": 18532370,
  "Mementotlan Mace": 44926224,
  "Mulcharmy Fuwalos": 70371523,
  "Mulcharmy Meowls": 7755315,
  "Mementotlan Bone Party": 33854624,
  "Mementotlan Fusion": 69859135,
  "Mementomictlan": 96334809,
  "Goblin Biker Grand Breakout": 22637151,
  "Fiendsmith Engraver": 58238740,
  "Lacrima the Crimson Tears": 84649310,
  "Fiendsmith's Tract": 10233922,
  "Fabled Lurrie": 47346782,
  "Mementomictlan Tecuhtlica - Creation King": 73341839,
  "Mementotlan Twin Dragon": 9012916,
  "S:P Little Knight": 36107810,
  "Fiendsmith's Desirae": 62050252,
  "Fiendsmith's Requiem": 98050740,
  "Proxy F Magician": 25166510,
  "Fiendsmith's Sequence": 51158153,
  "Fiendsmith's Agnumday": 87543110,
  "Necroquip Princess": 14147283,
  "Aerial Eater": 40177746,
  "Berfomet the Mythical King of Phantom Beasts": 76573247,
  "Moon of the Closed Heaven": 3072808,
  "D/D/D Wave High King Caesar": 39139935,
  "Chaos Hunter": 97940434,
  "Mulcharmy Purulia": 23925726
};

// Function to convert list format to YDK format
const convertListToYDK = (listText: string): string => {
  // Initialize YDK sections
  let mainDeckIds: number[] = [];
  let extraDeckIds: number[] = [];
  let sideDeckIds: number[] = [];
  
  // Parse the list text
  let currentSection = '';
  const lines = listText.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Identify section headers - use more flexible matching
    if (/main\s*deck/i.test(trimmedLine)) {
      currentSection = 'main';
      continue;
    } else if (/extra\s*deck/i.test(trimmedLine)) {
      currentSection = 'extra';
      continue;
    } else if (/side\s*deck/i.test(trimmedLine)) {
      currentSection = 'side';
      continue;
    } else if (trimmedLine === '' || /^-+$/i.test(trimmedLine)) {
      // Match any sequence of hyphens as separators
      continue;
    }
    
    // Only process lines when a section is active
    if (!currentSection) continue;
    
    // Parse card entries (e.g., "3x Ash Blossom & Joyous Spring" or "3 Ash Blossom & Joyous Spring")
    const cardMatch = trimmedLine.match(/^(\d+)(?:x|\s+)(.+)$/i);
    if (cardMatch) {
      const [, countStr, cardName] = cardMatch;
      const cleanedCardName = cardName.trim();
      const cardId = cardDatabase[cleanedCardName];
      
      if (!cardId) {
        console.warn(`Card not found in database: ${cleanedCardName}`);
        continue;
      }
      
      // Add card IDs to appropriate section
      const targetDeck = currentSection === 'main' ? mainDeckIds : 
                         currentSection === 'extra' ? extraDeckIds : 
                         sideDeckIds;
      
      // Add the card ID count times
      for (let i = 0; i < count; i++) {
        targetDeck.push(cardId);
      }
    }
  }
  
  // Log section sizes for debugging
  console.log(`Main deck: ${mainDeckIds.length} cards`);
  console.log(`Extra deck: ${extraDeckIds.length} cards`);
  console.log(`Side deck: ${sideDeckIds.length} cards`);
  
  // Format YDK string
  let ydkContent = '#created by YGO Deck Converter\n';
  ydkContent += '#main\n';
  mainDeckIds.forEach(id => ydkContent += id + '\n');
  ydkContent += '#extra\n';
  extraDeckIds.forEach(id => ydkContent += id + '\n');
  ydkContent += '!side\n';
  sideDeckIds.forEach(id => ydkContent += id + '\n');
  
  return ydkContent;
};

// Function to convert YDK format to list format
const convertYDKToList = (ydkText: string): string => {
  // Parse YDK
  const lines = ydkText.split('\n');
  let currentSection = '';
  
  // Create maps to count card occurrences
  const mainDeckMap = new Map<number, number>();
  const extraDeckMap = new Map<number, number>();
  const sideDeckMap = new Map<number, number>();
  
  // Track card IDs that are not in our database
  const unknownCardIds = new Set<number>();
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === '#main') {
      currentSection = 'main';
      continue;
    } else if (trimmedLine === '#extra') {
      currentSection = 'extra';
      continue;
    } else if (trimmedLine === '!side') {
      currentSection = 'side';
      continue;
    } else if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // Try to parse card ID
    const cardId = parseInt(trimmedLine, 10);
    if (isNaN(cardId)) continue;
    
    // Add to appropriate deck section
    if (currentSection === 'main') {
      mainDeckMap.set(cardId, (mainDeckMap.get(cardId) || 0) + 1);
    } else if (currentSection === 'extra') {
      extraDeckMap.set(cardId, (extraDeckMap.get(cardId) || 0) + 1);
    } else if (currentSection === 'side') {
      sideDeckMap.set(cardId, (sideDeckMap.get(cardId) || 0) + 1);
    }
  }
  
  // Helper function to convert card ID to name
  const idToName = (id: number): string => {
    // Find the card name for this ID
    for (const [name, cardId] of Object.entries(cardDatabase)) {
      if (cardId === id) return name;
    }
    unknownCardIds.add(id);
    return `Unknown Card (${id})`;
  };
  
  // Generate list text
  let listText = 'Main Deck:\n';
  mainDeckMap.forEach((count, cardId) => {
    listText += `${count}x ${idToName(cardId)}\n`;
  });
  
  listText += '---------\nExtra Deck:\n';
  extraDeckMap.forEach((count, cardId) => {
    listText += `${count}x ${idToName(cardId)}\n`;
  });
  
  listText += '---------\nSide Deck:\n';
  sideDeckMap.forEach((count, cardId) => {
    listText += `${count}x ${idToName(cardId)}\n`;
  });
  
  return listText;
};

const DeckConverter: React.FC<DeckConverterProps> = ({ 
  size = 'medium',
}) => {
  const [activeTab, setActiveTab] = useState<'list-to-ydk' | 'ydk-to-list'>('list-to-ydk');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleConvert = () => {
    setError('');
    setSuccess('');
    setOutputText('');
    
    try {
      if (!inputText.trim()) {
        setError('Please enter text to convert');
        return;
      }
      
      if (activeTab === 'list-to-ydk') {
        const ydkContent = convertListToYDK(inputText);
        setOutputText(ydkContent);
        setSuccess('Successfully converted to YDK format!');
      } else {
        const listContent = convertYDKToList(inputText);
        setOutputText(listContent);
        setSuccess('Successfully converted to list format!');
      }
    } catch (err) {
      console.error('Conversion error:', err);
      setError(`Error during conversion: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setError('');
    setSuccess('');
  };
  
  const handleCopyToClipboard = () => {
    if (!outputText) {
      setError('No output to copy');
      return;
    }
    
    navigator.clipboard.writeText(outputText)
      .then(() => {
        setSuccess('Copied to clipboard!');
      })
      .catch(err => {
        setError(`Failed to copy: ${err.message}`);
      });
  };

  const handleDownloadYDK = () => {
    if (!outputText || activeTab !== 'list-to-ydk') {
      setError('No YDK content to download');
      return;
    }
    
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deck.ydk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccess('YDK file downloaded!');
  };

  return (
    <Container $size={size}>
      <Title>Deck Format Converter</Title>
      
      <TabContainer>
        <Tab 
          $active={activeTab === 'list-to-ydk'}
          onClick={() => setActiveTab('list-to-ydk')}
        >
          List → YDK
        </Tab>
        <Tab 
          $active={activeTab === 'ydk-to-list'}
          onClick={() => setActiveTab('ydk-to-list')}
        >
          YDK → List
        </Tab>
      </TabContainer>
      
      <Section>
        <Label>
          {activeTab === 'list-to-ydk' ? 'Paste Deck List:' : 'Paste YDK Content:'}
        </Label>
        <TextArea 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)}
          placeholder={activeTab === 'list-to-ydk' 
            ? 'Format: "3x Ash Blossom & Joyous Spring" (one card per line, with sections "Main Deck:", "Extra Deck:", "Side Deck:")' 
            : 'Paste YDK file content here...'}
        />
      </Section>
      
      <ButtonContainer>
        <Button $primary onClick={handleConvert}>Convert</Button>
        <Button onClick={handleClear}>Clear</Button>
        {outputText && <Button onClick={handleCopyToClipboard}>Copy Result</Button>}
        {outputText && activeTab === 'list-to-ydk' && (
          <Button onClick={handleDownloadYDK}>Download YDK</Button>
        )}
      </ButtonContainer>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      
      {outputText && (
        <ResultContainer>
          <Label>Result:</Label>
          <TextArea 
            value={outputText}
            readOnly
          />
        </ResultContainer>
      )}
      
      <InfoSection>
        <p>Note: This tool currently uses a limited card database for demonstration. In a production environment, it would connect to a complete Yu-Gi-Oh card database.</p>
        <p>The YDK format is used by many Yu-Gi-Oh simulators like YGOPro, EDOPro, and Dueling Book.</p>
      </InfoSection>
    </Container>
  );
};

export default DeckConverter;