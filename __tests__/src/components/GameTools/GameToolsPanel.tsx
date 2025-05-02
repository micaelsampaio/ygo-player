import React, { useState } from "react";
import styled from "styled-components";
import Timer from "./Timer";
import LifePointsCounter from "./LifePointsCounter";
import theme from "../../styles/theme";

interface GameToolsPanelProps {
  initialLifePoints?: number;
  timerMode?: "countdown" | "countup";
  initialTimerValue?: number;
  players?: { name: string; initialPoints?: number }[];
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.default};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.lg};
  max-width: 100%;
`;

const Title = styled.h2`
  font-size: ${theme.typography.size["2xl"]};
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.sm} 0;
  text-align: center;
`;

const ToolsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
  justify-content: center;
`;

const LifePointsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const PlayersContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}) {
    flex-direction: row;
  }
`;

const TimerSection = styled.div`
  align-self: center;
`;

const FooterControls = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${theme.spacing.md};
  gap: ${theme.spacing.md};
`;

const Button = styled.button`
  background: ${theme.colors.primary.main};
  color: ${theme.colors.text.inverse};
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.typography.size.base};
  font-weight: ${theme.typography.weight.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.primary.dark};
    transform: translateY(-2px);
  }
`;

const GameToolsPanel: React.FC<GameToolsPanelProps> = ({
  initialLifePoints = 8000,
  timerMode = "countup",
  initialTimerValue = timerMode === "countdown" ? 2400 : 0, // Default 40 minutes for countdown
  players = [
    { name: "Player 1", initialPoints: initialLifePoints },
    { name: "Player 2", initialPoints: initialLifePoints },
  ],
}) => {
  const [showAllTools, setShowAllTools] = useState(true);

  return (
    <Container>
      <Title>Yu-Gi-Oh Duel Tools</Title>

      <ToolsContainer>
        {showAllTools && (
          <>
            <LifePointsSection>
              <PlayersContainer>
                {players.map((player, index) => (
                  <LifePointsCounter
                    key={index}
                    playerName={player.name}
                    initialPoints={player.initialPoints}
                    size="medium"
                  />
                ))}
              </PlayersContainer>
            </LifePointsSection>

            <TimerSection>
              <Timer
                initialTime={initialTimerValue}
                countDown={timerMode === "countdown"}
                onTimeUp={() => console.log("Time is up!")}
                size="large"
                showControls={true}
              />
            </TimerSection>
          </>
        )}
      </ToolsContainer>

      <FooterControls>
        <Button onClick={() => setShowAllTools(!showAllTools)}>
          {showAllTools ? "Hide Tools" : "Show Tools"}
        </Button>
      </FooterControls>
    </Container>
  );
};

export default GameToolsPanel;
