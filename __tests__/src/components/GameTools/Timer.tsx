import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import theme from "../../styles/theme";

interface TimerProps {
  initialTime?: number; // Initial time in seconds
  countDown?: boolean; // Whether to count down or up
  onTimeUp?: () => void; // Callback for when time runs out (only for countdown)
  showControls?: boolean; // Whether to show play/pause/reset controls
  size?: "small" | "medium" | "large"; // Size of the timer
}

const TimerContainer = styled.div<{ $size: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: ${theme.colors.background.card};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.md};
  padding: ${(props) =>
    props.$size === "small"
      ? theme.spacing.xs
      : props.$size === "medium"
      ? theme.spacing.sm
      : theme.spacing.md};
  box-shadow: ${theme.shadows.sm};
  width: ${(props) =>
    props.$size === "small"
      ? "120px"
      : props.$size === "medium"
      ? "150px"
      : "180px"};
  transition: all 0.3s ${theme.transitions.default};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
`;

const TimerDisplay = styled.div<{
  $isWarning: boolean;
  $isDanger: boolean;
  $size: string;
}>`
  font-family: ${theme.typography.fontFamily};
  font-size: ${(props) =>
    props.$size === "small"
      ? theme.typography.size.lg
      : props.$size === "medium"
      ? theme.typography.size.xl
      : theme.typography.size["2xl"]};
  font-weight: ${theme.typography.weight.bold};
  color: ${(props) =>
    props.$isDanger
      ? theme.colors.error.main
      : props.$isWarning
      ? theme.colors.warning.main
      : theme.colors.text.primary};
  margin: ${theme.spacing.xs} 0;
  transition: color 0.3s ease;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.xs};
`;

const Button = styled.button`
  background: ${theme.colors.primary.main};
  color: ${theme.colors.text.inverse};
  border: none;
  border-radius: ${theme.borderRadius.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.size.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.primary.dark};
  }

  &:disabled {
    background: ${theme.colors.action.disabled};
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const TimerTitle = styled.div<{ $size: string }>`
  font-size: ${(props) =>
    props.$size === "small"
      ? theme.typography.size.xs
      : props.$size === "medium"
      ? theme.typography.size.sm
      : theme.typography.size.base};
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xs};
`;

const Timer: React.FC<TimerProps> = ({
  initialTime = 0,
  countDown = false,
  onTimeUp,
  showControls = true,
  size = "medium",
}) => {
  const [seconds, setSeconds] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const countRef = useRef<NodeJS.Timeout | null>(null);

  // Reset timer or stop it when it reaches zero
  useEffect(() => {
    if (countDown && seconds <= 0 && isActive) {
      handleReset();
      if (onTimeUp) onTimeUp();
    }
  }, [seconds, countDown, isActive, onTimeUp]);

  // Handle timer tick
  useEffect(() => {
    if (isActive && !isPaused) {
      countRef.current = setInterval(() => {
        setSeconds((prevSeconds) => {
          if (countDown) {
            return Math.max(0, prevSeconds - 1);
          } else {
            return prevSeconds + 1;
          }
        });
      }, 1000);
    }

    return () => {
      if (countRef.current) clearInterval(countRef.current);
    };
  }, [isActive, isPaused, countDown]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (countRef.current) clearInterval(countRef.current);
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleReset = () => {
    if (countRef.current) clearInterval(countRef.current);
    setIsActive(false);
    setIsPaused(false);
    setSeconds(initialTime);
  };

  // Format time as MM:SS
  const formatTime = () => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Determine if time should show warning or danger colors
  // For countdown: warning at 30 seconds, danger at 10 seconds
  // For countup: different thresholds based on initial time
  const getTimeStatus = () => {
    if (countDown) {
      return {
        isWarning: seconds <= 30 && seconds > 10,
        isDanger: seconds <= 10,
      };
    } else {
      const thirdOfInitial = Math.max(60, initialTime / 3);
      const twoThirdsOfInitial = Math.max(180, (2 * initialTime) / 3);
      return {
        isWarning: seconds >= thirdOfInitial && seconds < twoThirdsOfInitial,
        isDanger: seconds >= twoThirdsOfInitial,
      };
    }
  };

  const { isWarning, isDanger } = getTimeStatus();

  return (
    <TimerContainer $size={size}>
      <TimerTitle $size={size}>
        {countDown ? "Time Remaining" : "Elapsed Time"}
      </TimerTitle>
      <TimerDisplay $isWarning={isWarning} $isDanger={isDanger} $size={size}>
        {formatTime()}
      </TimerDisplay>

      {showControls && (
        <ControlsContainer>
          {!isActive && !isPaused ? (
            <Button onClick={handleStart}>Start</Button>
          ) : isPaused ? (
            <Button onClick={handleResume}>Resume</Button>
          ) : (
            <Button onClick={handlePause}>Pause</Button>
          )}
          <Button onClick={handleReset}>Reset</Button>
        </ControlsContainer>
      )}
    </TimerContainer>
  );
};

export default Timer;
