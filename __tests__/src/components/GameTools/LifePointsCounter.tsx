import React, { useState } from "react";
import styled from "styled-components";
import theme from "../../styles/theme";

interface LifePointsProps {
  initialPoints?: number; // Initial life points (default 8000)
  playerName?: string; // Player name
  maxPoints?: number; // Maximum life points limit
  size?: "small" | "medium" | "large"; // Size of the counter
  onLifePointsChange?: (newPoints: number) => void; // Callback when life points change
}

const Container = styled.div<{ $size: string }>`
  display: flex;
  flex-direction: column;
  width: ${(props) =>
    props.$size === "small"
      ? "200px"
      : props.$size === "medium"
      ? "250px"
      : "300px"};
  background: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  padding: ${(props) =>
    props.$size === "small"
      ? theme.spacing.sm
      : props.$size === "medium"
      ? theme.spacing.md
      : theme.spacing.lg};
  transition: transform 0.2s ${theme.transitions.default};
  position: relative;

  &:hover {
    transform: translateY(-2px);
  }
`;

const PlayerInfo = styled.div<{ $size: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xs};
`;

const PlayerName = styled.div<{ $size: string }>`
  font-size: ${(props) =>
    props.$size === "small"
      ? theme.typography.size.sm
      : props.$size === "medium"
      ? theme.typography.size.base
      : theme.typography.size.lg};
  font-weight: ${theme.typography.weight.semibold};
  color: ${theme.colors.text.primary};
`;

const PointsDisplay = styled.div<{
  $low: boolean;
  $critical: boolean;
  $size: string;
}>`
  font-size: ${(props) =>
    props.$size === "small"
      ? theme.typography.size.xl
      : props.$size === "medium"
      ? theme.typography.size["2xl"]
      : theme.typography.size["3xl"]};
  font-weight: ${theme.typography.weight.bold};
  text-align: center;
  color: ${(props) =>
    props.$critical
      ? theme.colors.error.main
      : props.$low
      ? theme.colors.warning.main
      : theme.colors.primary.main};
  padding: ${theme.spacing.sm} 0;
  transition: color 0.3s ease;
`;

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const ActionButton = styled.button<{ $secondary?: boolean }>`
  flex: 1;
  padding: ${theme.spacing.xs} 0;
  background: ${(props) =>
    props.$secondary
      ? theme.colors.background.default
      : theme.colors.primary.main};
  color: ${(props) =>
    props.$secondary ? theme.colors.text.primary : theme.colors.text.inverse};
  border: 1px solid
    ${(props) =>
      props.$secondary
        ? theme.colors.border.default
        : theme.colors.primary.main};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.size.sm};
  font-weight: ${theme.typography.weight.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.$secondary
        ? theme.colors.background.paper
        : theme.colors.primary.dark};
  }
`;

const PointChangeInput = styled.div`
  display: flex;
  margin-top: ${theme.spacing.xs};
`;

const Input = styled.input`
  flex: 1;
  padding: ${theme.spacing.xs};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.sm} 0 0 ${theme.borderRadius.sm};
  font-size: ${theme.typography.size.sm};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
  }
`;

const ApplyButton = styled.button`
  background: ${theme.colors.success.main};
  color: white;
  border: none;
  border-radius: 0 ${theme.borderRadius.sm} ${theme.borderRadius.sm} 0;
  padding: 0 ${theme.spacing.md};
  cursor: pointer;

  &:hover {
    background: ${theme.colors.success.dark};
  }
`;

const HistoryContainer = styled.div`
  margin-top: ${theme.spacing.sm};
  max-height: 100px;
  overflow-y: auto;
  border-top: 1px solid ${theme.colors.border.light};
`;

const HistoryEntry = styled.div<{ $isPositive: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: ${theme.spacing.xs} 0;
  font-size: ${theme.typography.size.xs};
  color: ${(props) =>
    props.$isPositive ? theme.colors.success.main : theme.colors.error.main};
`;

const HistoryValue = styled.span<{ $isPositive: boolean }>`
  font-weight: ${theme.typography.weight.medium};
`;

interface HistoryItem {
  value: number;
  timestamp: Date;
}

const LifePointsCounter: React.FC<LifePointsProps> = ({
  initialPoints = 8000,
  playerName = "Player",
  maxPoints = 999999,
  size = "medium",
  onLifePointsChange,
}) => {
  const [lifePoints, setLifePoints] = useState(initialPoints);
  const [customValue, setCustomValue] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Update life points and trigger callback
  const updateLifePoints = (change: number) => {
    const newPoints = Math.max(0, Math.min(maxPoints, lifePoints + change));

    // Only record non-zero changes
    if (change !== 0) {
      setHistory((prev) => [
        { value: change, timestamp: new Date() },
        ...prev.slice(0, 9), // Keep last 10 entries
      ]);
    }

    setLifePoints(newPoints);
    if (onLifePointsChange) onLifePointsChange(newPoints);
  };

  // Handle quick changes
  const handleQuickChange = (change: number) => {
    updateLifePoints(change);
  };

  // Handle custom value change
  const handleCustomChange = () => {
    const value = parseInt(customValue);
    if (!isNaN(value)) {
      updateLifePoints(value);
      setCustomValue("");
    }
  };

  // Format the timestamp for history entries
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Container $size={size}>
      <PlayerInfo $size={size}>
        <PlayerName $size={size}>{playerName}</PlayerName>
        <ActionButton
          $secondary
          onClick={() => setShowHistory(!showHistory)}
          style={{ flex: "none", padding: `0 ${theme.spacing.sm}` }}
        >
          {showHistory ? "Hide History" : "Show History"}
        </ActionButton>
      </PlayerInfo>

      <PointsDisplay
        $low={lifePoints <= 2000}
        $critical={lifePoints <= 1000}
        $size={size}
      >
        {lifePoints.toLocaleString()}
      </PointsDisplay>

      <ControlsContainer>
        <ButtonRow>
          <ActionButton onClick={() => handleQuickChange(-1000)}>
            -1000
          </ActionButton>
          <ActionButton onClick={() => handleQuickChange(-500)}>
            -500
          </ActionButton>
          <ActionButton onClick={() => handleQuickChange(-100)}>
            -100
          </ActionButton>
          <ActionButton onClick={() => handleQuickChange(-50)}>
            -50
          </ActionButton>
        </ButtonRow>

        <ButtonRow>
          <ActionButton onClick={() => handleQuickChange(50)}>+50</ActionButton>
          <ActionButton onClick={() => handleQuickChange(100)}>
            +100
          </ActionButton>
          <ActionButton onClick={() => handleQuickChange(500)}>
            +500
          </ActionButton>
          <ActionButton onClick={() => handleQuickChange(1000)}>
            +1000
          </ActionButton>
        </ButtonRow>

        <PointChangeInput>
          <Input
            type="number"
            placeholder="Enter value..."
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCustomChange()}
          />
          <ApplyButton onClick={handleCustomChange}>Apply</ApplyButton>
        </PointChangeInput>

        <ButtonRow style={{ marginTop: theme.spacing.xs }}>
          <ActionButton $secondary onClick={() => setLifePoints(initialPoints)}>
            Reset
          </ActionButton>
          <ActionButton
            $secondary
            onClick={() => setLifePoints(lifePoints / 2)}
          >
            Half
          </ActionButton>
        </ButtonRow>
      </ControlsContainer>

      {showHistory && history.length > 0 && (
        <HistoryContainer>
          {history.map((entry, index) => (
            <HistoryEntry key={index} $isPositive={entry.value > 0}>
              <span>{formatTime(entry.timestamp)}</span>
              <HistoryValue $isPositive={entry.value > 0}>
                {entry.value > 0 ? "+" : ""}
                {entry.value}
              </HistoryValue>
            </HistoryEntry>
          ))}
        </HistoryContainer>
      )}
    </Container>
  );
};

export default LifePointsCounter;
