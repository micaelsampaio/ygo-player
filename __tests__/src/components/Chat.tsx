import { useEffect, useState, useRef } from "react";
import { AudioVisualizer } from "./AudioVisualizer";
import { Logger } from "../utils/logger";
import {
  ChatContainer,
  ChatHeader,
  HeaderLeft,
  HeaderRight,
  HeaderText,
  CloseButton,
  ChatToggleButton,
  Messages,
  MessageBubble,
  InputContainer,
  InputField,
  SendButton,
  AudioControls,
  ControlButton,
  MessagesContainer,
  CommandText,
  TabContainer,
  Tab,
  TabBadge,
} from "./Chat.styles";

const logger = Logger.createLogger("Chat");

// Keep helper functions in the component file
const truncateId = (id: string, type: "room" | "player" = "player") => {
  if (!id || id.length <= 6) return id;
  const firstPart = id.slice(0, 4);
  const lastPart = id.slice(-2);
  return `${type === "room" ? "🔑" : "👤"} ${firstPart}..${lastPart}`;
};

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

// Keep the interfaces in the component file
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

type TabType = "chat" | "commands";

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
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadCommands, setUnreadCommands] = useState(0);
  const [globalUnread, setGlobalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  // Add this helper function to filter messages
  const filteredMessages = messages.filter((msg) => {
    const isCommand = msg.includes(":/cmd/");
    return activeTab === "commands" ? isCommand : !isCommand;
  });

  // Single effect to handle new messages
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      const isCommand = lastMessage.includes(":/cmd/");

      // Update global counter
      setGlobalUnread((prev) => prev + 1);

      // Update tab-specific counters only if message belongs to other tab
      if (isCommand && activeTab === "chat") {
        setUnreadCommands((prev) => prev + 1);
      } else if (!isCommand && activeTab === "commands") {
        setUnreadChat((prev) => prev + 1);
      }

      prevMessagesLength.current = messages.length;
    }
  }, [messages, activeTab]);

  // Reset counters only when switching tabs
  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "chat") {
      setUnreadChat(0);
      setGlobalUnread((prev) => prev - unreadChat);
    } else {
      setUnreadCommands(0);
      setGlobalUnread((prev) => prev - unreadCommands);
    }
  };

  // Chat toggle should not affect counters
  const handleChatToggle = () => {
    setIsOpen((prev) => !prev);
  };

  // Add scroll effect when messages change or tab changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTab]);

  // Update the return statement to include tabs
  return (
    <>
      <ChatContainer isOpen={isOpen}>
        <ChatHeader>
          <HeaderLeft>
            <HeaderText className="room">
              {truncateId(roomId, "room")}
            </HeaderText>
            <HeaderText className="player">
              {truncateId(playerId, "player")}
            </HeaderText>
          </HeaderLeft>

          <HeaderRight>
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
            <CloseButton onClick={() => setIsOpen(false)}>×</CloseButton>
          </HeaderRight>
        </ChatHeader>

        <TabContainer>
          <Tab
            isActive={activeTab === "chat"}
            onClick={() => handleTabClick("chat")}
          >
            💬 Chat {unreadChat > 0 && <TabBadge>{unreadChat}</TabBadge>}
          </Tab>
          <Tab
            isActive={activeTab === "commands"}
            onClick={() => handleTabClick("commands")}
          >
            ⌘ Commands{" "}
            {unreadCommands > 0 && <TabBadge>{unreadCommands}</TabBadge>}
          </Tab>
        </TabContainer>

        <MessagesContainer>
          {isVoiceEnabled && analyser && (
            <AudioVisualizer analyser={analyser} />
          )}

          <Messages>
            {filteredMessages.map((msg, index) => {
              const isCommand = msg.includes(":/cmd/");
              const isSelf = msg.startsWith(playerId);

              let displayMessage = msg;
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
            <div ref={messagesEndRef} /> {/* Add this div at the end */}
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
        <ChatToggleButton onClick={handleChatToggle}>
          💬
          {globalUnread > 0 && <TabBadge>{globalUnread}</TabBadge>}
        </ChatToggleButton>
      )}
    </>
  );
}
