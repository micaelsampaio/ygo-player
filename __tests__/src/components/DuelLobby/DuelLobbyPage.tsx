// filepath: /Users/ivoribeiro/Code/ivo/ygo/ygo-player/__tests__/src/components/DuelLobby/DuelLobbyPage.tsx
import { useState, useEffect } from "react";
import styled from "styled-components";
import { Users, User, Link } from "lucide-react";
import { Logger } from "../../utils/logger";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Button, Card, Badge } from "../UI";
import { useNavigate } from "react-router-dom";
import { useKaibaNet } from "../../hooks/useKaibaNet";
import { cleanDuelData } from "../../utils/roomUtils";

const logger = Logger.createLogger("DuelLobby");

interface Room {
  id: string;
  connected: boolean;
}

const DuelLobbyPage = () => {
  const kaibaNet = useKaibaNet();
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState<string>("");
  const [rooms, setRooms] = useState<Map<string, Room>>(() =>
    kaibaNet.getRooms()
  );
  const playerId = kaibaNet.getPlayerId();

  // Set up room update listener
  useEffect(() => {
    const onRoomsUpdated = (updatedRooms: any) => {
      logger.log("DuelLobby: Updated rooms", updatedRooms);
      setRooms(new Map(updatedRooms));
    };

    kaibaNet.removeAllListeners("rooms:updated");
    kaibaNet.on("rooms:updated", onRoomsUpdated);

    return () => {
      kaibaNet.removeAllListeners("rooms:updated");
    };
  }, [kaibaNet]);

  const handleRoomJoin = async (roomId: string) => {
    try {
      setConnecting(roomId);

      // Clean up any previous duel data
      cleanDuelData();

      // Check if we're in offline mode
      const isOffline = kaibaNet.getCommunicationType() === "offline";

      if (!isOffline) {
        // For online modes, join the room
        await kaibaNet.joinRoom(roomId);
      }

      // Navigate to the duel page with appropriate state
      navigate(`/duel/${roomId}`, {
        state: {
          roomId,
          playerId: kaibaNet.getPlayerId(),
          offline: isOffline,
        },
      });

      setConnecting("");
    } catch (err) {
      console.error("Failed to join room:", err);
      setConnecting("");
    }
  };

  // Helper function to truncate room IDs for display
  const truncateId = (id: string) => `${id.slice(0, 6)}...${id.slice(-4)}`;

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <HeaderContent>
            <h1>Duel Lobby</h1>
            <UserIdBadge>
              Your ID: <code>{truncateId(playerId)}</code>
            </UserIdBadge>
          </HeaderContent>
        </PageHeader>

        <MainContent>
          <Card>
            <Card.Content>
              <SectionHeader>
                <SectionIcon>
                  <Users size={24} />
                </SectionIcon>
                <h2>Available Rooms</h2>
              </SectionHeader>

              {rooms.size === 0 || (rooms.size === 1 && rooms.has(playerId)) ? (
                <EmptyState>
                  <EmptyStateIcon>
                    <Users size={40} />
                  </EmptyStateIcon>
                  <EmptyStateTitle>No rooms available</EmptyStateTitle>
                  <EmptyStateMessage>
                    Waiting for other players to connect...
                  </EmptyStateMessage>
                </EmptyState>
              ) : (
                <RoomGrid>
                  {Array.from(rooms.values()).map(
                    (room) =>
                      room.id !== playerId && (
                        <RoomCard key={room.id} elevation="low">
                          <Card.Content>
                            <StatusIndicator connected={room.connected} />
                            <RoomCardContent>
                              <UserIcon>
                                <User size={40} />
                              </UserIcon>
                              <RoomId>{truncateId(room.id)}</RoomId>

                              {room.connected ? (
                                <Badge variant="success">Connected</Badge>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={connecting === room.id}
                                  onClick={() => handleRoomJoin(room.id)}
                                  icon={<Link size={16} />}
                                >
                                  {connecting === room.id
                                    ? "Connecting..."
                                    : "Join Room"}
                                </Button>
                              )}
                            </RoomCardContent>
                          </Card.Content>
                        </RoomCard>
                      )
                  )}
                </RoomGrid>
              )}
            </Card.Content>
          </Card>
        </MainContent>
      </PageContainer>
    </AppLayout>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
  height: 100%;
`;

const PageHeader = styled.div`
  margin-bottom: ${theme.spacing.xl};
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h1 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["3xl"]};
  }
`;

const UserIdBadge = styled.div`
  background-color: ${theme.colors.background.card};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};

  code {
    font-family: monospace;
    color: ${theme.colors.primary.main};
  }
`;

const MainContent = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};

  h2 {
    margin: 0;
    font-size: ${theme.typography.size.xl};
    color: ${theme.colors.text.primary};
  }
`;

const SectionIcon = styled.div`
  background-color: ${theme.colors.primary.main};
  color: ${theme.colors.text.inverse};
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${theme.spacing.lg};
`;

const RoomCard = styled(Card)`
  position: relative;
  transition: transform ${theme.transitions.default};

  &:hover {
    transform: translateY(-4px);
  }
`;

const StatusIndicator = styled.div<{ connected: boolean }>`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${(props) =>
    props.connected ? theme.colors.success.main : theme.colors.text.disabled};
`;

const RoomCardContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme.spacing.md} 0;
  gap: ${theme.spacing.md};
`;

const UserIcon = styled.div`
  background-color: ${theme.colors.background.dark};
  color: ${theme.colors.text.secondary};
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RoomId = styled.div`
  font-family: monospace;
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
  margin: ${theme.spacing.xs} 0;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${theme.spacing.xl} 0;
  color: ${theme.colors.text.secondary};
`;

const EmptyStateIcon = styled.div`
  background-color: ${theme.colors.background.dark};
  color: ${theme.colors.text.disabled};
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.md};
`;

const EmptyStateTitle = styled.h3`
  margin: 0;
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.lg};
`;

const EmptyStateMessage = styled.p`
  margin: 0;
  color: ${theme.colors.text.disabled};
  font-size: ${theme.typography.size.md};
`;

export default DuelLobbyPage;
