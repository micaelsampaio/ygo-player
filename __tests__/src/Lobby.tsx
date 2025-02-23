import { useEffect, useState } from "react";
import styled from "styled-components";
import { User, Users, Link } from "lucide-react";
import { dkeyedPeerToPeer } from "./p2p.js";

const LobbyContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  max-width: 1200px;
  padding: 2rem;
`;

const LobbyCard = styled.div`
  background-color: #1a1a1a;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
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

export default function PeerLobby({ onRoomReady }) {
  const [node, setNode] = useState<any>(null);
  const [peerId, setPeerId] = useState("");
  const [peers, setPeers] = useState(new Map());
  const [connecting, setConnecting] = useState("");

  useEffect(() => {
    const initializePeerToPeer = async () => {
      const peerToPeer = new dkeyedPeerToPeer(
        import.meta.env.VITE_BOOTSTRAP_NODE
      );

      await peerToPeer.startP2P();
      setPeerId(peerToPeer.getPeerId());
      setNode(peerToPeer);

      // Listen to our custom events
      peerToPeer.on("peer:discovery", ({ id, addresses }) => {
        setPeers((prev) =>
          new Map(prev).set(id, {
            id,
            addresses,
            connected: false,
          })
        );
      });

      peerToPeer.on("connection:open", ({ peerId }) => {
        setPeers((prev) => {
          const updated = new Map(prev);
          const peer = updated.get(peerId) || { id: peerId, addresses: [] };
          updated.set(peerId, { ...peer, connected: true });
          return updated;
        });
      });

      peerToPeer.on("connection:close", ({ peerId }) => {
        setPeers((prev) => {
          const updated = new Map(prev);
          const peer = updated.get(peerId);
          if (peer) {
            updated.set(peerId, { ...peer, connected: false });
          }
          return updated;
        });
      });
      peerToPeer.on("remove:peer", ({ peerId }) => {
        setPeers((prev) => {
          const updated = new Map(prev);
          updated.delete(peerId);
          return updated;
        });
      });
    };

    initializePeerToPeer();
  }, []);

  const handleConnect = async (peer) => {
    try {
      setConnecting(peer.id);
      await node.connectToPeer(peer.addresses[0]);
      setConnecting("");
      onRoomReady();
    } catch (err) {
      console.error("Failed to connect:", err);
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
          <Title>Kaiba Net</Title>
          <PeerId>Your ID: {truncateId(peerId)}</PeerId>
        </Header>

        <PeerGrid>
          {Array.from(peers.values()).map((peer) => (
            <PeerBox
              key={peer.id}
              connected={peer.connected ? "true" : undefined}
            >
              <StatusDot connected={peer.connected ? "true" : undefined} />
              <User size={48} color="#666" />
              <PeerId2>{truncateId(peer.id)}</PeerId2>

              {!peer.connected && (
                <ConnectButton
                  onClick={() => handleConnect(peer)}
                  disabled={connecting === peer.id}
                >
                  <Link size={16} />
                  {connecting === peer.id ? "Connecting..." : "Create Room"}
                </ConnectButton>
              )}

              {peer.connected && <ConnectedText>Connected</ConnectedText>}
            </PeerBox>
          ))}

          {peers.size === 0 && (
            <EmptyState>
              <EmptyStateIcon>
                <Users size={32} color="#666" />
              </EmptyStateIcon>
              <EmptyStateText>No peers discovered yet...</EmptyStateText>
              <EmptyStateSubtext>Waiting for connections</EmptyStateSubtext>
            </EmptyState>
          )}
        </PeerGrid>
      </LobbyCard>
    </LobbyContainer>
  );
}
