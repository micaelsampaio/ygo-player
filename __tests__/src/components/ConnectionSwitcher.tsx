import { useState } from "react";
import { useCommunicationType } from "../hooks/useKaibaNet";
import { CommunicationType } from "../network/communicationFactory";
import styled from "styled-components";
import { Logger } from "../utils/logger";

const logger = Logger.createLogger("ConnectionSwitcher");

const SwitcherContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f5f5f5;
  margin-bottom: 16px;
`;

const ConnectionInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ConnectionStatus = styled.div<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "";
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: ${(props) => (props.$active ? "#4caf50" : "#999")};
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
  background-color: #e0e0e0;
  position: relative;
`;

const ToggleOption = styled.button<{ isActive: boolean }>`
  flex: 1;
  padding: 8px 0;
  border: none;
  background: transparent;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  position: relative;
  z-index: 2;
  color: ${(props) => (props.isActive ? "#fff" : "#333")};
  font-weight: ${(props) => (props.isActive ? "bold" : "normal")};
  transition: color 0.3s;

  &:hover {
    color: ${(props) => (props.isActive ? "#fff" : "#000")};
  }
`;

const ToggleSlider = styled.div<{ position: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 33.33%;
  height: 100%;
  background-color: ${(props) => {
    switch (props.position) {
      case 0:
        return "#2196f3"; // P2P
      case 1:
        return "#9c27b0"; // Socket.IO
      case 2:
        return "#f44336"; // Offline
      default:
        return "#2196f3";
    }
  }};
  border-radius: 4px;
  transition: transform 0.3s ease;
  transform: translateX(${(props) => props.position * 100}%);
  z-index: 1;
`;

export function ConnectionSwitcher() {
  const { type, setType } = useCommunicationType();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleToggle = async (newType: CommunicationType) => {
    if (newType === type || isSwitching) return;

    try {
      setIsSwitching(true);
      logger.debug(`Switching connection from ${type} to ${newType}`);

      await setType(newType);

      logger.debug(`Successfully switched to ${newType}`);
    } catch (error) {
      logger.error(`Failed to switch connection type to ${newType}:`, error);
    } finally {
      setIsSwitching(false);
    }
  };

  // Get friendly display name for current connection type
  const getConnectionName = (): string => {
    if (type === "p2p") return "P2P Connection (libp2p)";
    if (type === "socketio") return "Socket.IO Connection";
    return "Offline Mode (No Connection)";
  };

  // Get the position for the toggle slider
  const getTogglePosition = (): number => {
    if (type === "p2p") return 0;
    if (type === "socketio") return 1;
    return 2; // offline
  };

  return (
    <SwitcherContainer>
      <ConnectionInfo>
        <ConnectionStatus $active={type !== "offline"}>
          {getConnectionName()}
          {isSwitching && " (Switching...)"}
        </ConnectionStatus>
      </ConnectionInfo>

      <ToggleContainer>
        <ToggleSlider position={getTogglePosition()} />
        <ToggleOption
          isActive={type === "p2p"}
          disabled={isSwitching}
          onClick={() => handleToggle("p2p")}
        >
          P2P
        </ToggleOption>
        <ToggleOption
          isActive={type === "socketio"}
          disabled={isSwitching}
          onClick={() => handleToggle("socketio")}
        >
          Socket.IO
        </ToggleOption>
        <ToggleOption
          isActive={type === "offline"}
          disabled={isSwitching}
          onClick={() => handleToggle("offline")}
        >
          Offline
        </ToggleOption>
      </ToggleContainer>
    </SwitcherContainer>
  );
}
