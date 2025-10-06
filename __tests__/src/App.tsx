import React, { useRef, useState } from 'react';
import { darkTheme } from './css/theme';
import {
  Button,
  Card,
  Container,
  DeckItem,
  DeckList,
  FlexBox,
  Grid,
  InputSelect,
  SectionTitle,
  Tab,
  TabContent,
  TabList,
  TabProvider,
  TextArea,
  Title
} from './components/ui';
import { useStorageDecks } from './hooks/useStorageDecks';
import { useDuelController } from './hooks/useStorageDuel';
import { LocalStorage } from './scripts/storage';

function App() {
  const [duelData, setDuelData] = useState<string>(() => getDuelDataFromLocalStorageSafe());
  const [replayData, setReplayData] = useState<string>(() => getReplayDataFromLocalStorageSafe());
  const deckManager = useStorageDecks();
  const duelManager = useDuelController();
  const decks = deckManager.decks;
  const [selectedDeck1, setSelectedDeck1] = useState<any | null>(window.localStorage.getItem("debug_deck1") || "");
  const [selectedDeck2, setSelectedDeck2] = useState<any | null>(window.localStorage.getItem("debug_deck2") || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteDeck = (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this deck?');
    if (confirmed) deckManager.removeDeck(id);
  };

  const downloadFromClipboard = async () => {
    const ydk = await navigator.clipboard.readText();
    const deck = await deckManager.downloadDeckFromYdk(ydk);
    deckManager.addDeck(deck);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const rawName = file.name;
    const dotIndex = rawName.lastIndexOf(".");
    const deckName: string = dotIndex !== -1 ? rawName.substring(0, dotIndex) : rawName;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const ydk = e.target?.result as string;
      if (ydk) {
        const deck = await deckManager.downloadDeckFromYdk(ydk, { deckName });
        deckManager.addDeck(deck);
      }
    };
    reader.readAsText(file);
  };

  const downloadFromYDK = () => fileInputRef.current?.click();

  const duelWithSelectedDecks = () => {
    const deck1 = decks.find(deck => deck.id === selectedDeck1);
    const deck2 = decks.find(deck => deck.id === selectedDeck2);

    if (!deck1) return alert("DECK Player 1 not found");
    if (!deck2) return alert("DECK Player 2 not found");

    duelManager.duel({ deck1, deck2 });
  };

  // handlers
  const handleDuelStart = () => duelManager.duelWithStaticProps(duelData);
  const handleViewReplay = () => { duelManager.viewReplay(JSON.parse(replayData)) };

  // save duel/replay data to localStorage
  const updateDuelData = (value: string) => {
    setDuelData(value);
    LocalStorage.set("duel_data", value);
  };

  const updateReplayData = (value: string) => {
    setReplayData(value);
    LocalStorage.set("replay_data", value);
  };

  return (
    <Container>
      <Title>🧪 YGO PLAYER - Debug Page</Title>

      <Grid>
        {/* Left Section - Decks */}
        <Card>
          <SectionTitle>📂 Decks</SectionTitle>
          <FlexBox style={{ marginBottom: '1rem' }} gapX='10px' gapY='10px'>
            <Button color={darkTheme.accent} onClick={downloadFromClipboard}>From Clipboard</Button>
            <Button color={darkTheme.success} onClick={downloadFromYDK}>From YDK</Button>
          </FlexBox>

          <input
            type="file"
            accept=".ydk"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <DeckList>
            {decks.map((deck) => (
              <DeckItem key={deck.id}>
                <span>{deck.name}</span>
                <div style={{ flexGrow: "1" }} />
                <FlexBox gapX='10px' gapY='10px'>
                  <Button color={darkTheme.danger} onClick={() => deleteDeck(deck.id)}>Delete</Button>
                  <Button color={darkTheme.success} onClick={() => duelManager.duel({ deck1: deck })}>Play</Button>
                </FlexBox>
              </DeckItem>
            ))}
          </DeckList>

          {/* Deck vs Deck Section */}
          <div style={{ marginTop: '2rem' }}>
            <SectionTitle>🎮 Play Duel</SectionTitle>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <InputSelect
                value={selectedDeck1 || ""}
                onChange={(e) => {
                  setSelectedDeck1(e.target.value);
                  window.localStorage.setItem("debug_deck1", e.target.value);
                }}
                style={{ flex: 1 }}
              >
                <option value="">Select Deck 1</option>
                {decks.map(deck => (
                  <option key={deck.id} value={deck.id}>{deck.name}</option>
                ))}
              </InputSelect>

              <InputSelect
                value={selectedDeck2}
                onChange={(e) => {
                  setSelectedDeck2(e.target.value);
                  window.localStorage.setItem("debug_deck2", e.target.value);
                }}
                style={{ flex: 1 }}
              >
                <option value="">Select Deck 2</option>
                {decks.map(deck => (
                  <option key={deck.id} value={deck.id}>{deck.name}</option>
                ))}
              </InputSelect>
            </div>
            <Button
              color={darkTheme.accent}
              disabled={!selectedDeck1 || !selectedDeck2}
              onClick={duelWithSelectedDecks}
            >
              Play Duel
            </Button>
          </div>
        </Card>

        {/* Right Section - Duel / Replay Props */}
        <Card>
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <TabProvider defaultTab="duel">
              <TabList>
                <Tab id="duel">Duel Props</Tab>
                <Tab id="replay">Replay Props</Tab>
                <Tab id="lobbies" href="/lobby">
                  Lobbies
                </Tab>
                <Tab id="three_test" href="/three/test">
                  Test Scene
                </Tab>
              </TabList>

              <TabContent id="duel">
                <FlexBox direction="column" gap="10px" style={{ height: "100%", flexGrow: 1 }}>
                  <TextArea
                    style={{ height: "100%" }}
                    value={duelData}
                    onChange={(e: any) => updateDuelData(e.target.value)}
                    placeholder="Paste duel JSON props here..."
                  />
                  <Button onClick={handleDuelStart}>Start Duel</Button>
                </FlexBox>
              </TabContent>

              <TabContent id="replay">
                <FlexBox direction="column" gap="10px" style={{ height: "100%", flexGrow: 1 }}>
                  <TextArea
                    style={{ height: "100%" }}
                    value={replayData}
                    onChange={(e: any) => updateReplayData(e.target.value)}
                    placeholder="Paste replay JSON props here..."
                  />
                  <Button color={darkTheme.success} onClick={handleViewReplay}>View Replay</Button>
                </FlexBox>
              </TabContent>
            </TabProvider>
          </div>
        </Card>
      </Grid>
    </Container>
  );
}

export default App;

function getDuelDataFromLocalStorageSafe(): string {
  try {
    return JSON.stringify(LocalStorage.get("duel_data") || "{}", undefined, 2) || "";
  } catch {
    return "";
  }
}

function getReplayDataFromLocalStorageSafe(): string {
  try {
    return JSON.stringify(LocalStorage.get("replay_data") || "{}", undefined, 2) || "";
  } catch {
    return "";
  }
}
