import { useEffect, useState } from "react";
import styled from "styled-components";
import { User, Users, Link } from "lucide-react";
import { Logger } from "../utils/logger";

const logger = Logger.createLogger("RoomLobby");

const LobbyContainer = styled.div`
  min-height: 100dvh;
`;

const LobbyCard = styled.div`
  background-color: #1a1a1a;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
  min-height: 100dvh;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const IconBox = styled.div`
  background-color: #0078d4;
  padding: 0.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  margin: 0;
`;

const PeerId = styled.div`
  color: #888;
  font-size: 0.875rem;
  margin-left: 1rem;
`;

const PeerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 2rem;
  padding: 1rem;
  width: 100%;
`;

const PeerBox = styled.div<{ connected: string }>`
  position: relative;
  min-height: 200px; // Set a fixed minimum height
  background-color: #2a2a2a;
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid ${(props) => (props.connected ? "#22c55e" : "#444")};
  transition: all 0.3s ease;

  &:hover {
    border-color: ${(props) => (props.connected ? "#22c55e" : "#0078d4")};
  }
`;

const StatusDot = styled.div<{ connected: string }>`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background-color: ${(props) => (props.connected ? "#22c55e" : "#666")};
`;

const PeerId2 = styled.div`
  font-family: monospace;
  color: #ddd;
  font-size: 0.875rem;
  margin: 0.5rem 0;
  text-align: center;
`;

const ConnectButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #0078d4;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #004080;
    cursor: wait;
  }
`;

const ConnectedText = styled.div`
  color: #22c55e;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 0;
  grid-column: 1 / -1;
`;

const EmptyStateIcon = styled.div`
  background-color: #2a2a2a;
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
`;

const EmptyStateText = styled.p`
  color: #666;
  margin: 0;
  margin-bottom: 0.5rem;
`;

const EmptyStateSubtext = styled.p`
  color: #444;
  font-size: 0.875rem;
  margin: 0;
`;

const truncateId = (id: string) => `${id.slice(0, 6)}...${id.slice(-4)}`;

export default function RoomLobby({ playerId, rooms, onRoomJoin }) {
  const [connecting, setConnecting] = useState("");
  useEffect(() => {
    console.log("RoomLobby: playerId changed:", playerId);
  }, [playerId]);

  useEffect(() => {
    console.log("RoomLobby: rooms changed:", rooms);
  }, [rooms]);

  const handleRoomJoin = async (room) => {
    try {
      setConnecting(room.id);
      await onRoomJoin(room.id);
      setConnecting("");
    } catch (err) {
      console.error("Failed to join room:", err);
      setConnecting("");
    }
  };

  return (
    <LobbyContainer>
      <LobbyCard>
        <Header>
          <IconBox>
            <Users size={24} color="white" />
          </IconBox>
          <Title>Room Lobby</Title>
          <PeerId>Your ID: {truncateId(playerId)}</PeerId>
        </Header>

        <PeerGrid>
          {Array.from(rooms.values()).map(
            (room) =>
              room.id !== playerId ? (
                <PeerBox
                  key={room.id}
                  connected={room.connected ? "true" : undefined}
                >
                  <StatusDot connected={room.connected ? "true" : undefined} />
                  <User size={48} color="#666" />
                  <PeerId2>{truncateId(room.id)}</PeerId2>

                  {!room.connected && (
                    <ConnectButton
                      onClick={() => handleRoomJoin(room)}
                      disabled={connecting === room.id}
                    >
                      <Link size={16} />
                      {connecting === room.id ? "Connecting..." : "Join Room"}
                    </ConnectButton>
                  )}

                  {room.connected && <ConnectedText>Connected</ConnectedText>}
                </PeerBox>
              ) : null // If the condition is false, return null
          )}
          {(rooms.size === 0 || (rooms.size === 1 && rooms.has(playerId))) && (
            <EmptyState>
              <EmptyStateIcon>
                <Users size={32} color="#666" />
              </EmptyStateIcon>
              <EmptyStateText>No rooms discovered yet...</EmptyStateText>
              <EmptyStateSubtext>Waiting for connections</EmptyStateSubtext>
            </EmptyState>
          )}
        </PeerGrid>
      </LobbyCard>
    </LobbyContainer>
  );
}
