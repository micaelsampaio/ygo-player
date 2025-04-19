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

const ConnectionStatus = styled.div<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "";
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: ${(props) => (props.active ? "#4caf50" : "#999")};
  }
`;

const SwitchButton = styled.button`
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0b7dda;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

export function ConnectionSwitcher() {
  const { type, setType } = useCommunicationType();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchConnection = async () => {
    try {
      setIsSwitching(true);

      // Toggle between p2p and socketio
      const newType: CommunicationType = type === "p2p" ? "socketio" : "p2p";
      logger.debug(`Switching connection from ${type} to ${newType}`);

      await setType(newType);

      // Update localStorage to remember the setting
      localStorage.setItem("commType", newType);

      logger.debug(`Successfully switched to ${newType}`);
    } catch (error) {
      logger.error("Failed to switch connection type:", error);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <SwitcherContainer>
      <ConnectionInfo>
        <ConnectionStatus active={true}>
          {type === "p2p" ? "P2P Connection (libp2p)" : "Socket.IO Connection"}
        </ConnectionStatus>
      </ConnectionInfo>

      <SwitchButton onClick={handleSwitchConnection} disabled={isSwitching}>
        {isSwitching
          ? "Switching..."
          : `Switch to ${type === "p2p" ? "Socket.IO" : "P2P"}`}
      </SwitchButton>
    </SwitcherContainer>
  );
}
