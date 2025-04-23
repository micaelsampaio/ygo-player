import { useState } from "react";
import { useCommunicationType } from "../hooks/useKaibaNet";
import { CommunicationType } from "../network/communicationFactory";
import styled from "styled-components";
import { Logger } from "../utils/logger";
import theme from "../styles/theme";

const logger = Logger.createLogger("ConnectionSwitcher");

const SwitcherContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.background.paper};
  margin-bottom: 12px;
  max-width: 300px;
`;

const ConnectionInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: ${theme.typography.size.sm};
`;

const ConnectionStatus = styled.div<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: "";
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${(props) =>
      props.$active ? theme.colors.success.main : theme.colors.text.disabled};
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  width: 100%;
  border-radius: ${theme.borderRadius.sm};
  overflow: hidden;
  margin-top: 6px;
  background-color: ${theme.colors.background.card};
  position: relative;
`;

const ToggleOption = styled.button<{ isActive: boolean }>`
  flex: 1;
  padding: 6px 0;
  border: none;
  background: transparent;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  position: relative;
  z-index: 2;
  color: ${(props) =>
    props.isActive ? theme.colors.text.inverse : theme.colors.text.secondary};
  font-weight: ${(props) =>
    props.isActive
      ? theme.typography.weight.medium
      : theme.typography.weight.normal};
  font-size: ${theme.typography.size.sm};
  transition: color 0.3s;

  &:hover {
    color: ${(props) =>
      props.isActive ? theme.colors.text.inverse : theme.colors.text.primary};
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
        return theme.colors.primary.main; // Direct
      case 1:
        return theme.colors.secondary.main; // Server
      case 2:
        return theme.colors.warning.main; // Offline
      default:
        return theme.colors.primary.main;
    }
  }};
  border-radius: ${theme.borderRadius.sm};
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
    if (type === "p2p") return "Direct";
    if (type === "socketio") return "Server";
    return "Offline";
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
          {getConnectionName()} Mode
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
          Direct
        </ToggleOption>
        <ToggleOption
          isActive={type === "socketio"}
          disabled={isSwitching}
          onClick={() => handleToggle("socketio")}
        >
          Server
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
