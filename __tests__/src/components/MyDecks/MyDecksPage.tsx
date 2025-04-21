import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { YGODeckToImage } from "ygo-core-images-utils";

const MyDecksPage = () => {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<string[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);

  useEffect(() => {
    // Load all decks from localStorage
    const allKeys = Object.keys(localStorage);
    const deckKeys = allKeys.filter((key) => key.startsWith("deck_"));
    setDecks(deckKeys);
  }, []);

  const deleteDeck = (deckId: string) => {
    if (confirm(`Are you sure you want to delete ${deckId}?`)) {
      localStorage.removeItem(deckId);
      setDecks((prevDecks) => prevDecks.filter((d) => d !== deckId));
    }
  };

  const downloadDeckAsYdk = async (deckId: string) => {
    const fileName = deckId + ".ydk";
    const deck = JSON.parse(localStorage.getItem(deckId) || "{}");

    const deckBuilder = new YGODeckToImage({
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });
    deckBuilder.downloadYdk({ fileName });
  };

  const downloadDeckAsPng = async (deckId: string) => {
    const fileName = deckId + ".png";
    const deck = JSON.parse(localStorage.getItem(deckId) || "{}");

    const deckBuilder = new YGODeckToImage({
      name: deckId,
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });

    await deckBuilder.toImage({ fileName, download: true });
  };

  return (
    <PageContainer>
      <Header>
        <h1>My Decks</h1>
        <ButtonGroup>
          <Button onClick={() => navigate("/deckbuilder")}>
            Create New Deck
          </Button>
          <Button onClick={() => navigate("/deck")}>Import Deck</Button>
        </ButtonGroup>
      </Header>

      {decks.length === 0 ? (
        <EmptyState>
          <p>You don't have any decks yet.</p>
          <Button onClick={() => navigate("/deckbuilder")}>
            Create Your First Deck
          </Button>
        </EmptyState>
      ) : (
        <DeckGrid>
          {decks.map((deckId) => (
            <DeckCard key={deckId}>
              <DeckTitle>{deckId.replace("deck_", "")}</DeckTitle>
              <ButtonGroup>
                <Button primary onClick={() => navigate(`/my/decks/${deckId}`)}>
                  View Details
                </Button>
                <Button onClick={() => navigate(`/duel?deck=${deckId}`)}>
                  Duel
                </Button>
              </ButtonGroup>
              <ActionBar>
                <ActionButton onClick={() => downloadDeckAsPng(deckId)}>
                  🖼️ PNG
                </ActionButton>
                <ActionButton onClick={() => downloadDeckAsYdk(deckId)}>
                  📂 YDK
                </ActionButton>
                <ActionButton onClick={() => deleteDeck(deckId)}>
                  🗑️ Delete
                </ActionButton>
              </ActionBar>
            </DeckCard>
          ))}
        </DeckGrid>
      )}
    </PageContainer>
  );
};

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;

  h1 {
    margin: 0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button<{ primary?: boolean }>`
  padding: 8px 16px;
  background-color: ${(props) => (props.primary ? "#0078d4" : "#2a2a2a")};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => (props.primary ? "#0056b3" : "#444")};
  }
`;

const DeckGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const DeckCard = styled.div`
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const DeckTitle = styled.h3`
  margin: 0;
  color: white;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

const ActionButton = styled.button`
  padding: 5px 10px;
  background-color: transparent;
  color: #ccc;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    background-color: #333;
    color: white;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 50px;
  background-color: #2a2a2a;
  border-radius: 8px;
  color: white;
`;

export default MyDecksPage;
