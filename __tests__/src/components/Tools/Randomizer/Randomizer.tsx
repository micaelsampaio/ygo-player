import React, { useState, useRef } from "react";
import styled from "styled-components";
import theme from "../../../styles/theme";
import AppLayout from "../../Layout/AppLayout";
import { Card, Button } from "../../UI";

interface HistoryItem {
  type: "dice" | "coin";
  value: string;
  timestamp: string;
}

// Available dice types
const diceTypes = [4, 6, 8, 10, 12, 20, 100];

const Randomizer: React.FC = () => {
  // Dice state
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceType, setDiceType] = useState<number>(6);
  const [isRollingDice, setIsRollingDice] = useState(false);

  // Coin state
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Refs for animation elements
  const diceRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLDivElement>(null);

  /**
   * Roll the dice based on selected type
   */
  const rollDice = () => {
    if (isRollingDice) return;

    setIsRollingDice(true);

    // Animate the dice
    if (diceRef.current) {
      diceRef.current.style.animation = "none";
      setTimeout(() => {
        if (diceRef.current) {
          diceRef.current.style.animation = "rollDice 1s";
        }
      }, 10);
    }

    // Generate random results during animation
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setDiceResult(Math.floor(Math.random() * diceType) + 1);
      rollCount++;

      if (rollCount >= 10) {
        clearInterval(rollInterval);

        // Final result
        const finalResult = Math.floor(Math.random() * diceType) + 1;
        setDiceResult(finalResult);

        // Add to history
        setHistory((prev) => [
          {
            type: "dice",
            value: `D${diceType}: ${finalResult}`,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 19),
        ]);

        setTimeout(() => {
          setIsRollingDice(false);
        }, 500);
      }
    }, 100);
  };

  /**
   * Flip the coin
   */
  const flipCoin = () => {
    if (isFlippingCoin) return;

    setIsFlippingCoin(true);

    // Animate the coin
    if (coinRef.current) {
      coinRef.current.style.animation = "none";
      setTimeout(() => {
        if (coinRef.current) {
          coinRef.current.style.animation = "flipCoin 1s";
        }
      }, 10);
    }

    // Generate random results during animation
    let flipCount = 0;
    const flipInterval = setInterval(() => {
      setCoinResult(Math.random() > 0.5 ? "heads" : "tails");
      flipCount++;

      if (flipCount >= 10) {
        clearInterval(flipInterval);

        // Final result
        const finalResult = Math.random() > 0.5 ? "heads" : "tails";
        setCoinResult(finalResult);

        // Add to history
        setHistory((prev) => [
          {
            type: "coin",
            value: finalResult.charAt(0).toUpperCase() + finalResult.slice(1),
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 19),
        ]);

        setTimeout(() => {
          setIsFlippingCoin(false);
        }, 500);
      }
    }, 100);
  };

  /**
   * Clear the history
   */
  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>Yu-Gi-Oh! Randomizer Tools</h1>
          <p>Tools to help with random decisions during your duels</p>
        </PageHeader>

        <ContentWrapper>
          {/* Dice and Coin Tools */}
          <ToolsSection>
            {/* Dice Roller */}
            <ToolCard elevation="low">
              <Card.Content>
                <ToolTitle>Dice Roller</ToolTitle>

                <DiceContainer>
                  <Dice ref={diceRef} $diceType={diceType}>
                    <DiceValue>
                      {diceResult !== null ? diceResult : "?"}
                    </DiceValue>
                  </Dice>

                  <DiceControls>
                    <DiceTypeSelector>
                      {diceTypes.map((type) => (
                        <DiceTypeButton
                          key={type}
                          $active={diceType === type}
                          onClick={() => setDiceType(type)}
                          disabled={isRollingDice}
                        >
                          D{type}
                        </DiceTypeButton>
                      ))}
                    </DiceTypeSelector>

                    <Button
                      onClick={rollDice}
                      disabled={isRollingDice}
                      variant="primary"
                      size="md"
                      fullWidth
                    >
                      {isRollingDice ? "Rolling..." : "Roll Dice"}
                    </Button>
                  </DiceControls>
                </DiceContainer>
              </Card.Content>
            </ToolCard>

            {/* Coin Flipper */}
            <ToolCard elevation="low">
              <Card.Content>
                <ToolTitle>Coin Flipper</ToolTitle>

                <CoinContainer>
                  <Coin ref={coinRef} $side={coinResult}>
                    <CoinFace className="heads">H</CoinFace>
                    <CoinFace className="tails">T</CoinFace>
                  </Coin>

                  <CoinResult>
                    {coinResult && (
                      <ResultLabel>{coinResult.toUpperCase()}</ResultLabel>
                    )}
                  </CoinResult>

                  <Button
                    onClick={flipCoin}
                    disabled={isFlippingCoin}
                    variant="primary"
                    size="md"
                  >
                    {isFlippingCoin ? "Flipping..." : "Flip Coin"}
                  </Button>
                </CoinContainer>
              </Card.Content>
            </ToolCard>
          </ToolsSection>

          {/* History Section */}
          <HistorySection>
            <Card elevation="low">
              <Card.Content>
                <HistoryHeader>
                  <h2>Results History</h2>
                  {history.length > 0 && (
                    <Button onClick={clearHistory} variant="tertiary" size="sm">
                      Clear
                    </Button>
                  )}
                </HistoryHeader>

                {history.length > 0 ? (
                  <HistoryList>
                    {history.map((item, index) => (
                      <HistoryItem key={index} $type={item.type}>
                        <HistoryTime>{item.timestamp}</HistoryTime>
                        <HistoryIcon>
                          {item.type === "dice" ? "🎲" : "🪙"}
                        </HistoryIcon>
                        <HistoryValue>{item.value}</HistoryValue>
                      </HistoryItem>
                    ))}
                  </HistoryList>
                ) : (
                  <EmptyHistory>No results yet</EmptyHistory>
                )}
              </Card.Content>
            </Card>
          </HistorySection>
        </ContentWrapper>
      </PageContainer>
    </AppLayout>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const PageHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};

  h1 {
    margin-bottom: ${theme.spacing.sm};
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["2xl"]};
  }

  p {
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.size.lg};
  }
`;

const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: ${theme.spacing.xl};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ToolsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const HistorySection = styled.div``;

const ToolCard = styled(Card)``;

const ToolTitle = styled.h2`
  margin-top: 0;
  margin-bottom: ${theme.spacing.md};
  font-size: ${theme.typography.size.xl};
  color: ${theme.colors.text.primary};
`;

// Dice Styled Components
const DiceContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const Dice = styled.div<{ $diceType: number }>`
  position: relative;
  width: 80px;
  height: 80px;
  ${(props) => {
    switch (props.$diceType) {
      case 4:
        return `clip-path: polygon(50% 0%, 0% 100%, 100% 100%);`;
      case 8:
        return `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);`;
      case 10:
      case 100:
        return `clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);`;
      case 12:
        return `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);`;
      case 20:
        return `clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%); transform: rotate(180deg);`;
      default: // D6
        return `border-radius: 10px;`;
    }
  }}
  background-color: #e53935;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transform-origin: center;

  @keyframes rollDice {
    0% {
      transform: rotateX(0) rotateY(0) rotateZ(0);
    }
    25% {
      transform: rotateX(90deg) rotateY(45deg) rotateZ(45deg);
    }
    50% {
      transform: rotateX(180deg) rotateY(90deg) rotateZ(90deg);
    }
    75% {
      transform: rotateX(270deg) rotateY(135deg) rotateZ(135deg);
    }
    100% {
      transform: rotateX(360deg) rotateY(180deg) rotateZ(180deg);
    }
  }
`;

const DiceValue = styled.span`
  font-size: 36px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  ${(props) => props.children === "?" && `opacity: 0.7;`}
`;

const DiceControls = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const DiceTypeSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  justify-content: center;
`;

const DiceTypeButton = styled.button<{ $active: boolean }>`
  padding: 6px 10px;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid
    ${(props) =>
      props.$active ? theme.colors.primary.main : theme.colors.border.default};
  background-color: ${(props) =>
    props.$active ? theme.colors.primary.main : "transparent"};
  color: ${(props) => (props.$active ? "white" : theme.colors.text.primary)};
  font-weight: ${theme.typography.weight.medium};
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: ${(props) =>
      props.$active
        ? theme.colors.primary.dark
        : theme.colors.background.light};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Coin Styled Components
const CoinContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const Coin = styled.div<{ $side: "heads" | "tails" | null }>`
  width: 100px;
  height: 100px;
  position: relative;
  transition: transform 0.1s;
  transform-style: preserve-3d;

  ${(props) => {
    if (props.$side === "heads") {
      return `transform: rotateY(0deg);`;
    } else if (props.$side === "tails") {
      return `transform: rotateY(180deg);`;
    }
    return "";
  }}

  @keyframes flipCoin {
    0% {
      transform: rotateY(0) rotateX(0);
    }
    100% {
      transform: rotateY(1800deg) rotateX(1080deg);
    }
  }
`;

const CoinFace = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  backface-visibility: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 40px;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);

  &.heads {
    background: linear-gradient(45deg, #ffd700, #ffcc00);
    color: #a67c00;
  }

  &.tails {
    background: linear-gradient(45deg, #c0c0c0, #e0e0e0);
    color: #808080;
    transform: rotateY(180deg);
  }
`;

const CoinResult = styled.div`
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ResultLabel = styled.span`
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.text.primary};
`;

// History Styled Components
const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};

  h2 {
    margin: 0;
    font-size: ${theme.typography.size.lg};
  }
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  max-height: 500px;
  overflow-y: auto;
`;

const HistoryItem = styled.div<{ $type: "dice" | "coin" }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.background.light};
  border-left: 3px solid
    ${(props) =>
      props.$type === "dice" ? theme.colors.primary.main : "#ffc107"};
`;

const HistoryTime = styled.span`
  font-size: ${theme.typography.size.xs};
  color: ${theme.colors.text.secondary};
  width: 70px;
`;

const HistoryIcon = styled.span`
  font-size: 20px;
  margin: 0 ${theme.spacing.xs};
`;

const HistoryValue = styled.span`
  font-weight: ${theme.typography.weight.medium};
  color: ${theme.colors.text.primary};
`;

const EmptyHistory = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
  color: ${theme.colors.text.secondary};
  font-style: italic;
`;

export default Randomizer;
