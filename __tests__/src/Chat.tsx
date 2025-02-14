import { useEffect, useState } from "react";
import styled from "styled-components";

import { dkeyedPeerToPeer } from "./p2p.js";

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
  background-color: ${({ isSelf }) => (isSelf ? "#0078D4" : "#444")};
  color: ${({ isSelf }) => (isSelf ? "#fff" : "#fff")};
  align-self: ${({ isSelf }) => (isSelf ? "flex-end" : "flex-start")};
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
  background-color: #0078d4;
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
  const [address, setAddress] = useState<string>("");
  const [opponentId, setOpponentId] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  useEffect(() => {
    const initializePeerToPeer = async () => {
      const peerToPeer = new dkeyedPeerToPeer();
      await peerToPeer.startP2P(); // Wait for the asynchronous startP2P function
      const peerId = peerToPeer.getPeerId();
      const ma = peerToPeer.getMultiaddrs();

      setPeerId(peerId);
      setAddress(ma);

      setNode(peerToPeer);
    };
    initializePeerToPeer(); // Call the async function
    return () => {
      node?.stop();
    };
  }, []);

  async function connectToPeer() {
    node.connectToPeer(opponentId);
  }

  async function sendMessage() {
    console.log("send message");
  }

  return (
    <ChatContainer>
      <ChatHeader>
        <h2>Chat</h2>
        <p>
          Your Peer ID: <strong>{peerId}</strong>
        </p>
        <p>
          Your Address: <strong>{address}</strong>
        </p>
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

      <Messages>
        {messages.map((msg, index) => (
          <MessageBubble key={index} isSelf={msg.startsWith(peerId)}>
            {msg}
          </MessageBubble>
        ))}
      </Messages>
    </ChatContainer>
  );
}
