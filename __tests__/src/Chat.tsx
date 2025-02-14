import { createLibp2p } from 'libp2p';
import { identify } from '@libp2p/identify';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { webSockets } from '@libp2p/websockets';
import { webTransport } from '@libp2p/webtransport';
import { webRTC, webRTCDirect } from '@libp2p/webrtc';
import * as filters from '@libp2p/websockets/filters';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { useEffect, useState } from 'react';
import styled from 'styled-components';

// Styled Components
const ChatContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #222;
  color: #fff;
  border-radius: 8px;
  padding: 15px;
  width: 22em;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
`;

const ChatHeader = styled.div`
  font-size: 15px;
`;

const Messages = styled.div`
  max-height: 25em;
  overflow-y: auto;
  background: #333;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
  margin-top: 10px;
  flex-grow: 1;
`;

const MessageBubble = styled.div<{ isSelf: boolean }>`
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 5px;
  background-color: ${({ isSelf }) => (isSelf ? '#0078D4' : '#444')};
  color: ${({ isSelf }) => (isSelf ? '#fff' : '#fff')};
  align-self: ${({ isSelf }) => (isSelf ? 'flex-end' : 'flex-start')};
  word-wrap: break-word;
`;

const InputContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
`;

const InputField = styled.input`
  width: 70%;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #444;
  background-color: #333;
  color: #fff;
`;

const SendButton = styled.button`
  width: 5em;
  padding: 8px;
  background-color: #0078D4;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background-color: #005f8a;
  }
`;

export default function Chat() {
  const [node, setNode] = useState<any>(null);
  const [peerId, setPeerId] = useState<string>("");
  const [opponentId, setOpponentId] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  useEffect(() => {
    async function startP2P() {
      const libp2p = await createLibp2p({
        addresses: {
          listen: [
            '/webrtc',
          ],
        },
        transports: [
          webSockets({
            filter: filters.all,
          }),
          webTransport(),
          webRTC(),
          webRTCDirect(),
          // Use circuitRelayTransport to support relay functionality
          circuitRelayTransport({ discoverRelays: 1 })
        ],
        connectionEncrypters: [noise()],
        streamMuxers: [yamux()],
        connectionGater: {
          denyDialMultiaddr: async () => false,
        },
        peerDiscovery: [
            pubsubPeerDiscovery()
          ],
        services: {
        pubsub: gossipsub(),
        identify: identify(),
        },
      });

      await libp2p.start();
      console.log("libp2p started! Peer ID:", libp2p.peerId.toString());
      console.log("protocols: ",libp2p.getProtocols())
      console.log("Multiaddrs: ",libp2p.getMultiaddrs())

      setNode(libp2p);
      setPeerId(libp2p.peerId.toString());
    }

    startP2P();

    return () => {
      node?.stop();
    };
  }, []);

  async function connectToPeer() {
    if (!node) return;
    try {

      const peer = await node.peerStore.get(opponentId);

      if (!peer) {
        console.error("Peer not found");
        return;
      }
      console.log("Dialling:", opponentId);
      console.log(opponentId)
      const addr = peer.multiaddrs[0];
      await node.dial(addr);
      setConnected(true);
      console.log("Connected to:", opponentId);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  }

  async function sendMessage() {
    if (!node || !inputMessage.trim()) return;
    const message = `${peerId}: ${inputMessage}`;
    const data = new TextEncoder().encode(message);
    await node.services.pubsub.publish("ygo-chat", data);
    setMessages((prev) => [...prev, message]);
    setInputMessage("");
  }

  return (
    <ChatContainer>
      <ChatHeader>
        <h2>Chat</h2>
        <p>Your Peer ID: <strong>{peerId}</strong></p>
      </ChatHeader>

      {!connected && (
        <InputContainer>

          <InputField
            type="text"
            placeholder="Opponent Peer ID"
            value={opponentId}
            onChange={(e) => setOpponentId(e.target.value)}
          />
          <SendButton onClick={connectToPeer}>Connect</SendButton>
          </InputContainer>
      )}
      <InputContainer>
        <InputField
          type="text"
          placeholder="Type a message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
        />
        <SendButton onClick={sendMessage}>Send</SendButton>
      </InputContainer>

      <Messages >
        {messages.map((msg, index) => (
          <MessageBubble key={index} isSelf={msg.startsWith(peerId)}>
            {msg}
          </MessageBubble>
        ))}
      </Messages>
    </ChatContainer>
  );
}