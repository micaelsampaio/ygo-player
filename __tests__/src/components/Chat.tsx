import { useEffect, useState } from "react";
import styled from "styled-components";
import { AudioVisualizer } from "./AudioVisualizer";
import { Logger } from "../utils/logger";

const logger = Logger.createLogger("Chat");

// Update the truncateId helper function
const truncateId = (id: string, type: "room" | "player" = "player") => {
  if (!id || id.length <= 6) return id;
  const firstPart = id.slice(0, 4);
  const lastPart = id.slice(-2);
  return `${type === "room" ? "🔑" : "👤"} ${firstPart}..${lastPart}`;
};

// Add this helper function
const formatCommandOptions = (commandStr: string) => {
  const [cmdType, jsonStr] = commandStr.split(" ");
  try {
    const options = JSON.parse(jsonStr);
    const formattedOptions = Object.entries(options)
      .map(
        ([key, value]) =>
          `<span class="param-key">--${key}</span> <span class="param-value">${value}</span>`
      )
      .join(" ");
    return `<span class="command-type">${cmdType}</span> ${formattedOptions}`;
  } catch (e) {
    return commandStr;
  }
};

interface StyledProps {
  isOpen?: boolean;
  isActive?: boolean;
  isMuted?: boolean;
}

const ChatContainer = styled.div<StyledProps>`
  position: fixed;
  bottom: ${({ isOpen }) => (isOpen ? "20px" : "-600px")};
  left: 20px; // Changed from right to left
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
  gap: 2px; // Reduced gap
  max-width: calc(100% - 40px); // Leave space for close button
`;

// Update the styled components
const HeaderText = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 4px;

  span.id {
    font-weight: bold;
    color: #0078d4;
    font-family: monospace;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 20px; // Slightly reduced
  padding: 0;
  width: 28px; // Slightly reduced
  height: 28px; // Slightly reduced
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s;
  flex-shrink: 0; // Prevent button from shrinking

  &:hover {
    opacity: 1;
  }
`;

const ChatToggleButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 20px; // Changed from right to left
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

const MessageBubble = styled.div<{ isSelf: boolean; isCommand?: boolean }>`
  max-width: 85%;
  padding: ${({ isCommand }) => (isCommand ? "8px 10px" : "8px 12px")};
  border-radius: 12px;
  background-color: ${({ isSelf, isCommand }) => {
    if (isCommand) return "#1e2837";
    return isSelf ? "#0078d4" : "#444";
  }};
  align-self: ${({ isSelf }) => (isSelf ? "flex-end" : "flex-start")};
  word-break: break-word;
  font-size: 14px;
  border: ${({ isCommand }) => (isCommand ? "1px solid #2a3343" : "none")};
  box-shadow: ${({ isCommand }) =>
    isCommand ? "0 2px 4px rgba(0,0,0,0.2)" : "none"};
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
  onSendMessage: (message: string) => void;
  onVoiceChatToggle: (enabled: boolean) => void;
  onMicMuteToggle: (muted: boolean) => void;
  onAudioMuteToggle: (muted: boolean) => void;
  analyser: AnalyserNode | null;
}

const AudioControls = styled.div`
  display: flex;
  gap: 8px;
  margin-right: 8px;
`;

const ControlButton = styled.button<StyledProps>`
  background: none;
  border: none;
  color: ${({ isMuted }) => (isMuted ? "#ff4444" : "white")};
  cursor: pointer;
  font-size: 20px;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: all 0.2s;
  background-color: ${({ isActive }) => (isActive ? "#0078d4" : "transparent")};

  &:hover {
    opacity: 1;
  }
`;

const MessagesContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
`;

// Add new styled component for command text
const CommandText = styled.code`
  background-color: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
  font-size: 13px;
  color: #a8ff60;
  white-space: pre-wrap;
  word-break: break-all;

  .command-type {
    color: #ff79c6;
  }

  .param-key {
    color: #8be9fd;
  }

  .param-value {
    color: #f1fa8c;
  }
`;

export default function Chat({
  roomId,
  playerId,
  messages,
  onSendMessage,
  onVoiceChatToggle,
  onMicMuteToggle,
  onAudioMuteToggle,
  analyser,
}: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage("");
    }
  };

  const toggleVoice = () => {
    const newState = !isVoiceEnabled;
    setIsVoiceEnabled(newState);
    onVoiceChatToggle?.(newState);
  };

  const toggleMic = () => {
    const newState = !isMicMuted;
    setIsMicMuted(newState);
    onMicMuteToggle?.(newState);
  };

  const toggleAudio = () => {
    setIsAudioMuted(!isAudioMuted);
    onAudioMuteToggle?.(!isAudioMuted);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) {
      logger.debug("Preventing empty message submission");
      return;
    }

    logger.debug("Sending chat message:", { roomId, playerId, inputMessage });
    onSendMessage(inputMessage);
    setInputMessage("");
  };

  return (
    <>
      <ChatContainer isOpen={isOpen}>
        <ChatHeader>
          <HeaderInfo>
            <h2 style={{ margin: 0, fontSize: "16px" }}>Chat</h2>
            <HeaderText>
              <span className="id">{truncateId(roomId, "room")}</span>
            </HeaderText>
            <HeaderText>
              <span className="id">{truncateId(playerId, "player")}</span>
            </HeaderText>
          </HeaderInfo>

          <AudioControls>
            <ControlButton
              isActive={isVoiceEnabled}
              onClick={toggleVoice}
              title={
                isVoiceEnabled ? "Disable voice chat" : "Enable voice chat"
              }
            >
              {isVoiceEnabled ? "🎧" : "📞"}
            </ControlButton>

            {isVoiceEnabled && (
              <>
                <ControlButton
                  isMuted={isMicMuted}
                  onClick={toggleMic}
                  title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMicMuted ? "🚫" : "🎤"}
                </ControlButton>

                <ControlButton
                  isMuted={isAudioMuted}
                  onClick={toggleAudio}
                  title={isAudioMuted ? "Unmute audio" : "Mute audio"}
                >
                  {isAudioMuted ? "🔇" : "🔊"}
                </ControlButton>
              </>
            )}
          </AudioControls>

          <CloseButton onClick={() => setIsOpen(false)}>×</CloseButton>
        </ChatHeader>

        <MessagesContainer>
          {isVoiceEnabled && analyser && (
            <AudioVisualizer analyser={analyser} />
          )}

          <Messages>
            {messages.map((msg, index) => {
              const isCommand = msg.includes(":/cmd/");
              const isSelf = msg.startsWith(playerId);

              let displayMessage = msg;
              // Update the message rendering section to format commands
              if (isCommand) {
                const [playerId, command] = msg.split(":/cmd/");
                displayMessage = (
                  <>
                    <span className="id">{truncateId(playerId, "player")}</span>
                    {" executed: "}
                    <CommandText
                      dangerouslySetInnerHTML={{
                        __html: `$ ${formatCommandOptions(command)}`,
                      }}
                    />
                  </>
                );
              } else {
                const [id, ...rest] = msg.split(":");
                displayMessage = (
                  <>
                    <span className="id">{truncateId(id, "player")}</span>
                    {":"}
                    {rest.join(":")}
                  </>
                );
              }

              return (
                <MessageBubble
                  key={index}
                  isSelf={isSelf}
                  isCommand={isCommand}
                >
                  {displayMessage}
                </MessageBubble>
              );
            })}
          </Messages>
        </MessagesContainer>

        <InputContainer>
          <InputField
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
          />
          <SendButton onClick={handleSendMessage}>Send</SendButton>
        </InputContainer>
      </ChatContainer>

      {!isOpen && (
        <ChatToggleButton onClick={() => setIsOpen(true)}>💬</ChatToggleButton>
      )}
    </>
  );
}
