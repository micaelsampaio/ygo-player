import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

interface Replay {
  id: string;
  date: string;
  players: {
    name: string;
    mainDeck: any[];
    extraDeck: any[];
  }[];
  data?: any;
}

const MyReplaysPage = () => {
  const navigate = useNavigate();
  const [replays, setReplays] = useState<Replay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load all replays from localStorage
    const loadReplays = () => {
      const allKeys = Object.keys(localStorage);
      const replayKeys = allKeys.filter((key) => key.startsWith("replay_"));

      const replayList: Replay[] = [];

      for (const key of replayKeys) {
        try {
          const replayData = JSON.parse(localStorage.getItem(key) || "{}");

          // Format date from replay key (replay_YYYY-MM-DD-HHMMSS)
          const dateString = key.replace("replay_", "");
          const formattedDate = new Date(dateString).toLocaleDateString(
            undefined,
            {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          );

          replayList.push({
            id: key,
            date: formattedDate || dateString,
            players: replayData.players || [],
            data: replayData,
          });
        } catch (error) {
          console.error(`Error parsing replay ${key}:`, error);
        }
      }

      // Sort by date (most recent first)
      replayList.sort((a, b) => {
        return b.id.localeCompare(a.id);
      });

      setReplays(replayList);
      setIsLoading(false);
    };

    loadReplays();
  }, []);

  const deleteReplay = (replayId: string) => {
    if (confirm(`Are you sure you want to delete this replay?`)) {
      localStorage.removeItem(replayId);
      setReplays((prevReplays) => prevReplays.filter((r) => r.id !== replayId));
    }
  };

  const watchReplay = (replayId: string) => {
    localStorage.setItem("duel-data", localStorage.getItem(replayId) || "");
    navigate("/duel");
  };

  const createSpreadsheet = (replay: Replay) => {
    localStorage.setItem("duel-data", JSON.stringify(replay.data));
    navigate("/spreadsheet");
  };

  const getDeckName = (deck: string | undefined) => {
    if (!deck) return "Unknown Deck";
    if (deck.startsWith("deck_")) return deck.replace("deck_", "");
    return deck;
  };

  return (
    <PageContainer>
      <Header>
        <h1>My Replays</h1>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </Header>

      {isLoading ? (
        <Loading>Loading replays...</Loading>
      ) : replays.length === 0 ? (
        <EmptyState>
          <p>You don't have any duel replays yet.</p>
          <Button onClick={() => navigate("/")}>Start a Duel</Button>
        </EmptyState>
      ) : (
        <ReplayList>
          {replays.map((replay) => (
            <ReplayItem key={replay.id}>
              <ReplayInfo>
                <ReplayTitle>Duel Replay</ReplayTitle>
                <ReplayDate>{replay.date}</ReplayDate>
                <DuelDetails>
                  {replay.players && replay.players.length >= 2 ? (
                    <>
                      <Player>
                        <PlayerName>
                          {getDeckName(replay.players[0].name)}
                        </PlayerName>
                        <CardCount>
                          {replay.players[0].mainDeck?.length || 0} cards
                        </CardCount>
                      </Player>
                      <VsContainer>VS</VsContainer>
                      <Player>
                        <PlayerName>
                          {getDeckName(replay.players[1].name)}
                        </PlayerName>
                        <CardCount>
                          {replay.players[1].mainDeck?.length || 0} cards
                        </CardCount>
                      </Player>
                    </>
                  ) : (
                    <p>Replay data unavailable</p>
                  )}
                </DuelDetails>
              </ReplayInfo>

              <ButtonGroup>
                <Button primary onClick={() => watchReplay(replay.id)}>
                  Watch Replay
                </Button>
                <Button onClick={() => createSpreadsheet(replay)}>
                  Create Spreadsheet
                </Button>
                <ActionButton onClick={() => deleteReplay(replay.id)}>
                  🗑️ Delete
                </ActionButton>
              </ButtonGroup>
            </ReplayItem>
          ))}
        </ReplayList>
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

const ActionButton = styled.button`
  padding: 8px 16px;
  background-color: transparent;
  color: #ff4444;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 68, 68, 0.1);
  }
`;

const ReplayList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ReplayItem = styled.div`
  padding: 20px;
  background-color: #2a2a2a;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
`;

const ReplayInfo = styled.div`
  flex: 1;
`;

const ReplayTitle = styled.h3`
  margin: 0 0 5px 0;
  color: white;
`;

const ReplayDate = styled.div`
  color: #999;
  font-size: 14px;
  margin-bottom: 10px;
`;

const DuelDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
`;

const Player = styled.div`
  flex: 1;
`;

const PlayerName = styled.div`
  font-weight: bold;
  color: white;
`;

const CardCount = styled.div`
  font-size: 12px;
  color: #999;
`;

const VsContainer = styled.div`
  padding: 5px 10px;
  background-color: #333;
  border-radius: 4px;
  color: white;
  font-weight: bold;
`;

const Loading = styled.div`
  text-align: center;
  padding: 50px;
  font-size: 16px;
  color: #999;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 50px;
  background-color: #2a2a2a;
  border-radius: 8px;
  color: white;
`;

export default MyReplaysPage;
