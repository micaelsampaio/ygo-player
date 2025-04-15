import styled from "styled-components";

interface StyledProps {
  isOpen?: boolean;
  isActive?: boolean;
  isMuted?: boolean;
  isSelf?: boolean;
  isCommand?: boolean;
}

export const ChatContainer = styled.div<StyledProps>`
  position: fixed;
  bottom: ${({ isOpen }) => (isOpen ? "20px" : "-600px")};
  left: 20px;
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

export const ChatHeader = styled.div`
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #444;
  min-height: 32px;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const HeaderText = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;

  &.room {
    color: #0078d4;
  }

  &.player {
    color: #888;
  }
`;

export const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  margin: 10px 0;
  position: relative;
`;

export const Messages = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const MessageBubble = styled.div<StyledProps>`
  padding: 8px 12px;
  border-radius: 12px;
  max-width: 85%;
  align-self: ${({ isSelf }) => (isSelf ? "flex-end" : "flex-start")};
  background-color: ${({ isSelf, isCommand }) =>
    isCommand ? "#2d2d2d" : isSelf ? "#0078d4" : "#333"};
  word-break: break-word;
  font-size: 14px;

  .id {
    color: ${({ isSelf }) => (isSelf ? "#fff" : "#0078d4")};
    font-weight: 500;
  }
`;

export const InputContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

export const InputField = styled.input`
  flex: 1;
  background-color: #333;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  color: white;
  font-size: 14px;

  &:focus {
    outline: none;
    background-color: #444;
  }
`;

export const SendButton = styled.button`
  background-color: #0078d4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 15px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0086ef;
  }
`;

export const ChatToggleButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 20px;
  background-color: #0078d4;
  color: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #0086ef;
  }
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;

  &:hover {
    color: #fff;
  }
`;

export const ControlButton = styled.button<StyledProps>`
  background: none;
  border: none;
  color: ${({ isActive, isMuted }) =>
    isMuted ? "#ff4444" : isActive ? "#0078d4" : "#888"};
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;

  &:hover {
    color: ${({ isMuted }) => (isMuted ? "#ff6666" : "#fff")};
  }
`;

export const TabContainer = styled.div`
  display: flex;
  gap: 2px;
  margin-bottom: 10px;
`;

export const Tab = styled.button<StyledProps>`
  background-color: ${({ isActive }) => (isActive ? "#0078d4" : "#333")};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ isActive }) => (isActive ? "#0086ef" : "#444")};
  }
`;

export const TabBadge = styled.span`
  background-color: #ff4444;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  margin-left: 6px;
`;

export const CommandText = styled.code`
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
