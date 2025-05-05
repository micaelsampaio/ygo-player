import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card, Badge } from "../UI";
import { StoreService } from "../../services/store-service";

interface Replay {
  replayId: string;
  date: string;
  players: {
    name: string;
    deckId: string;
    mainDeck: any[];
    extraDeck: any[];
  }[];
  isLocal?: boolean;
}

const MyReplaysPage = () => {
  const navigate = useNavigate();
  const [replays, setReplays] = useState<Replay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load all replays using StoreService
    const loadReplays = async () => {
      try {
        const replayList = await StoreService.getAllReplays();

        // Sort by date (most recent first)
        replayList.sort((a, b) => {
          return (b.replayId || 0) - (a.replayId || 0);
        });

        setReplays(replayList);
      } catch (error) {
        console.error("Error loading replays:", error);
        setReplays([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReplays();
  }, []);

  const deleteReplay = async (replay: Replay) => {
    if (confirm(`Are you sure you want to delete this replay?`)) {
      try {
        const success = await StoreService.deleteReplay(replay);
        if (success) {
          setReplays((prevReplays) =>
            prevReplays.filter((r) => r.replayId !== replay.replayId)
          );
        } else {
          console.error("Failed to delete replay");
        }
      } catch (error) {
        console.error("Error deleting replay:", error);
      }
    }
  };

  const watchReplay = (replay: Replay) => {
    localStorage.setItem("duel-data", JSON.stringify(replay));
    navigate("/duel");
  };

  const createSpreadsheet = (replay: Replay) => {
    localStorage.setItem("duel-data", JSON.stringify(replay));
    navigate("/spreadsheet");
  };

  const getDeckName = (deck: string | undefined) => {
    if (!deck) return "Unknown Deck";
    if (deck.startsWith("deck_")) return deck.replace("deck_", "");
    return deck;
  };

  const formatDate = (timestamp: number | string) => {
    if (!timestamp) return "Unknown Date";
    const date = new Date(Number(timestamp));
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>My Replays</h1>
          <Button variant="secondary" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </PageHeader>

        {isLoading ? (
          <LoadingCard>
            <Card.Content>
              <LoadingText>Loading replays...</LoadingText>
            </Card.Content>
          </LoadingCard>
        ) : replays.length === 0 ? (
          <EmptyStateCard>
            <Card.Content>
              <p>You don't have any duel replays yet.</p>
              <Button variant="primary" onClick={() => navigate("/duel")}>
                Start a Duel
              </Button>
            </Card.Content>
          </EmptyStateCard>
        ) : (
          <ReplayList>
            {replays.map((replay) => (
              <ReplayItem key={replay.replayId} elevation="low">
                <Card.Content>
                  <ReplayContentWrapper>
                    <ReplayInfo>
                      <ReplayHeader>
                        <ReplayTitle>Duel Replay</ReplayTitle>
                        <Badge variant="info" size="sm">
                          {formatDate(replay.replayId || replay.date)}
                        </Badge>
                      </ReplayHeader>

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

                    <ReplayActions>
                      <Button
                        variant="primary"
                        onClick={() => watchReplay(replay)}
                      >
                        Watch Replay
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => createSpreadsheet(replay)}
                      >
                        Create Spreadsheet
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => deleteReplay(replay)}
                      >
                        Delete
                      </Button>
                    </ReplayActions>
                  </ReplayContentWrapper>
                </Card.Content>
              </ReplayItem>
            ))}
          </ReplayList>
        )}
      </PageContainer>
    </AppLayout>
  );
};

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};

  h1 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["3xl"]};
  }
`;

const LoadingCard = styled(Card)`
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const LoadingText = styled.div`
  font-size: ${theme.typography.size.lg};
  color: ${theme.colors.text.secondary};
`;

const EmptyStateCard = styled(Card)`
  padding: ${theme.spacing.xl};
  text-align: center;

  p {
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing.lg};
    font-size: ${theme.typography.size.md};
  }
`;

const ReplayList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const ReplayItem = styled(Card)`
  transition: transform ${theme.transitions.default};

  &:hover {
    transform: translateY(-2px);
  }
`;

const ReplayContentWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${theme.spacing.md};
  }
`;

const ReplayInfo = styled.div`
  flex: 1;
`;

const ReplayHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.sm};
`;

const ReplayTitle = styled.h3`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.lg};
`;

const DuelDetails = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.sm};
`;

const Player = styled.div`
  flex: 1;
`;

const PlayerName = styled.div`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.primary};
`;

const CardCount = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
`;

const VsContainer = styled.div`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background-color: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.sm};
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.weight.bold};
`;

const ReplayActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

export default MyReplaysPage;
