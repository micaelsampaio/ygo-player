import { useEffect, useState } from "react";
import styled from "styled-components";

const ChatContainer = styled.div<{ isOpen: boolean }>`
  position: fixed;
  bottom: ${({ isOpen }) => (isOpen ? "20px" : "-600px")};
  left: 20px;  // Changed from right to left
  background-color: #222;
  color: #fff;
  border-radius: 8px;
  padding: 15px;
  width: 22em;
  height: 400px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  transition: bottom 0.3s ease-in-out;
`;

const ChatHeader = styled.div`
  font-size: 15px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #444;
`;

const HeaderInfo = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;  // Reduced gap
  max-width: calc(100% - 40px); // Leave space for close button
`;

const HeaderText = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  opacity: 0.7;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 20px; // Slightly reduced
  padding: 0;
  width: 28px;     // Slightly reduced
  height: 28px;    // Slightly reduced
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s;
  flex-shrink: 0;  // Prevent button from shrinking

  &:hover {
    opacity: 1;
  }
`;

const ChatToggleButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 20px;  // Changed from right to left
  background-color: #0078d4;
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

// ... existing imports and ChatContainer, ChatHeader, HeaderInfo, CloseButton, ChatToggleButton components ...

const Messages = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  margin: 10px -15px;
  padding: 0 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #333;
  }

  &::-webkit-scrollbar-thumb {
    background: #666;
    border-radius: 3px;
  }
`;

const MessageBubble = styled.div<{ isSelf: boolean }>`
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  background-color: ${({ isSelf }) => (isSelf ? '#0078d4' : '#444')};
  align-self: ${({ isSelf }) => (isSelf ? 'flex-end' : 'flex-start')};
  word-break: break-word;
  font-size: 14px;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #444;
`;

const InputField = styled.input`
  flex-grow: 1;
  background-color: #333;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  color: white;
  font-size: 14px;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.5);
  }

  &::placeholder {
    color: #888;
  }
`;

const SendButton = styled.button`
  background-color: #0078d4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0086ef;
  }

  &:active {
    background-color: #006cbd;
  }
`;

interface ChatProps {
  roomId: string;
  playerId: string;
  messages: string[];
  sendMessageCallback: (message: string) => void;
}

export default function Chat({ 
  roomId, 
  playerId, 
  messages, 
  sendMessageCallback 
}: ChatProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [inputMessage, setInputMessage] = useState("");

  // Remove messages state since it's now handled by parent
  // const [messages, setMessages] = useState<string[]>([]);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessageCallback(inputMessage);
      setInputMessage("");
    }
  };

  return (
    <>
      <ChatContainer isOpen={isOpen}>
        <ChatHeader>
          <HeaderInfo>
            <h2 style={{ margin: 0, fontSize: '16px' }}>Chat</h2>
            <HeaderText>ID: {roomId.slice(0, 8)}...</HeaderText>
            <HeaderText>Player: {playerId.slice(0, 8)}...</HeaderText>
          </HeaderInfo>
          <CloseButton onClick={() => setIsOpen(false)}>×</CloseButton>
        </ChatHeader>

        <Messages>
          {messages.map((msg, index) => (
            <MessageBubble key={index} isSelf={msg.startsWith(playerId)}>
              {msg}
            </MessageBubble>
          ))}
        </Messages>

        <InputContainer>
          <InputField
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <SendButton onClick={handleSendMessage}>Send</SendButton>
        </InputContainer>
      </ChatContainer>

      {!isOpen && (
        <ChatToggleButton onClick={() => setIsOpen(true)}>
          💬
        </ChatToggleButton>
      )}
    </>
  );
}