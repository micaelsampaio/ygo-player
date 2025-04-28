import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import theme from "../../../styles/theme";
import AppLayout from "../../Layout/AppLayout";
import { Card, Button } from "../../UI";
import { CardArtZoom } from "../../shared/CardArtZoom";
import { getCardImageUrl } from "../../../utils/cardImages";

// Salamangreat Spinny card ID - corrected ID
const SPINNY_CARD_ID = 52277807;

const SpinnerWheel: React.FC = () => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [options, setOptions] = useState([
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4",
    "Option 5",
    "Option 6",
  ]);
  const [newOption, setNewOption] = useState("");
  const wheelRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [showArtOnly, setShowArtOnly] = useState(true);

  const spinWheel = () => {
    if (spinning) return;

    setSpinning(true);
    setResult(null);
    const newRotation = rotation + 1800 + Math.random() * 360;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      const selectedIndex = calculateSelectedOption(newRotation);
      setResult(options[selectedIndex]);
    }, 3000);
  };

  const calculateSelectedOption = (currentRotation: number) => {
    const degreePerOption = 360 / options.length;
    const normalizedRotation = currentRotation % 360;
    const index = Math.floor((360 - normalizedRotation) / degreePerOption);
    return index % options.length;
  };

  const addOption = () => {
    if (newOption.trim() === "") return;
    setOptions([...options, newOption.trim()]);
    setNewOption("");
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      alert("Minimum 2 options required");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addOption();
    }
  };

  const toggleViewMode = () => {
    setShowArtOnly(!showArtOnly);
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>Spinner Wheel</h1>
          <p>Add options and spin the wheel to make a random decision</p>
        </PageHeader>

        <ViewModeToggle>
          <ViewModeLabel>View Mode:</ViewModeLabel>
          <ViewModeButton
            onClick={toggleViewMode}
            variant={showArtOnly ? "primary" : "tertiary"}
          >
            {showArtOnly ? "Card Art Only" : "Full Card"}
          </ViewModeButton>
        </ViewModeToggle>

        <ContentWrapper>
          <WheelSection>
            <WheelContainer>
              <Wheel
                ref={wheelRef}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? "transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)"
                    : "none",
                }}
              >
                <SpinnyImageContainer>
                  {showArtOnly ? (
                    <CardArtZoom cardId={SPINNY_CARD_ID} size={100} />
                  ) : (
                    <SpinnyImage
                      src={getCardImageUrl(SPINNY_CARD_ID)}
                      alt="Salamangreat Spinny"
                    />
                  )}
                </SpinnyImageContainer>

                {options.map((option, index) => {
                  const angle = (index * 360) / options.length;
                  return (
                    <WheelOption
                      key={index}
                      style={{
                        transform: `rotate(${angle}deg) translate(0, -50%)`,
                      }}
                      $background={getColorForSegment(index, options.length)}
                    >
                      <OptionText style={{ transform: `rotate(90deg)` }}>
                        {option}
                      </OptionText>
                    </WheelOption>
                  );
                })}
              </Wheel>
              <Pointer />
            </WheelContainer>

            <SpinButtonContainer>
              <Button
                onClick={spinWheel}
                disabled={spinning}
                variant="primary"
                size="lg"
              >
                {spinning ? "Spinning..." : "SPIN"}
              </Button>
            </SpinButtonContainer>

            {result && (
              <ResultContainer>
                <ResultText>
                  Result: <ResultValue>{result}</ResultValue>
                </ResultText>
              </ResultContainer>
            )}
          </WheelSection>

          <OptionsSection>
            <Card elevation="low">
              <Card.Content>
                <h2>Manage Options</h2>

                <AddOptionForm>
                  <Input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="New option"
                    onKeyDown={handleKeyDown}
                  />
                  <Button onClick={addOption} variant="primary">
                    Add
                  </Button>
                </AddOptionForm>

                <OptionsList>
                  {options.map((option, index) => (
                    <OptionItem key={index}>
                      <OptionLabel>{option}</OptionLabel>
                      <RemoveButton onClick={() => removeOption(index)}>
                        ✕
                      </RemoveButton>
                    </OptionItem>
                  ))}
                </OptionsList>
              </Card.Content>
            </Card>
          </OptionsSection>
        </ContentWrapper>
      </PageContainer>
    </AppLayout>
  );
};

// Helper function to generate colors for wheel segments
const getColorForSegment = (index: number, total: number) => {
  const colors = [
    "#FF5252",
    "#FF4081",
    "#E040FB",
    "#7C4DFF",
    "#536DFE",
    "#448AFF",
    "#40C4FF",
    "#18FFFF",
    "#64FFDA",
    "#69F0AE",
    "#B2FF59",
    "#EEFF41",
  ];

  return colors[index % colors.length];
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
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.xl};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const WheelSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const WheelContainer = styled.div`
  position: relative;
  width: 400px;
  height: 400px;
  margin: ${theme.spacing.lg} 0;

  @media (max-width: 500px) {
    width: 300px;
    height: 300px;
  }
`;

const Wheel = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  transform-origin: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  border: 5px solid #333;
`;

const SpinnyImageContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  z-index: 10;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
`;

const SpinnyImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const WheelOption = styled.div<{ $background: string }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: 0 0;
  width: 50%;
  height: 50px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-left: 30px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
  background-color: ${(props) => props.$background};
`;

const OptionText = styled.span`
  position: absolute;
  left: 30%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
`;

const Pointer = styled.div`
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-top: 40px solid #333;
  z-index: 5;
`;

const SpinButtonContainer = styled.div`
  margin: ${theme.spacing.md} 0;
`;

const ResultContainer = styled.div`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  text-align: center;
  box-shadow: ${theme.shadows.sm};
`;

const ResultText = styled.p`
  font-size: ${theme.typography.size.lg};
  color: ${theme.colors.text.primary};
  margin: 0;
`;

const ResultValue = styled.span`
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.primary.main};
`;

const OptionsSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const AddOptionForm = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

const Input = styled.input`
  flex: 1;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.size.md};
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  max-height: 400px;
  overflow-y: auto;
`;

const OptionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${theme.colors.background.light};
  border-radius: ${theme.borderRadius.sm};
`;

const OptionLabel = styled.span`
  color: ${theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.error.main};
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 50%;

  &:hover {
    background-color: rgba(244, 67, 54, 0.1);
  }
`;

const ViewModeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  align-self: flex-end;
  justify-content: flex-end;
  margin-bottom: ${theme.spacing.md};
`;

const ViewModeLabel = styled.span`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.md};
`;

const ViewModeButton = styled(Button)`
  min-width: 120px;
`;

export default SpinnerWheel;
