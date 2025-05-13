import React, { useState, useRef, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import theme from "../../../styles/theme";
import AppLayout from "../../Layout/AppLayout";
import { Card, Button } from "../../UI";
import { CardArtZoom } from "../../shared/CardArtZoom";
import {
  getCardImageUrl,
  getCardBackImageUrl,
} from "../../../utils/cardImages";
import confetti from "canvas-confetti";

// Salamangreat Spinny card ID - corrected ID
const SPINNY_CARD_ID = 52277807;

const SpinnerWheel: React.FC = () => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [options, setOptions] = useState([
    "Option A",
    "Option B",
    "Option C",
    "Option D",
    "Option E",
    "Option F",
  ]);
  const [newOption, setNewOption] = useState("");
  const wheelRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [spinSpeed, setSpinSpeed] = useState(3);

  const spinWheel = () => {
    if (spinning) return;

    setSpinning(true);
    setResult(null);

    const spinMultiplier = spinSpeed + Math.random() * 2;
    const newRotation = rotation + 1800 * spinMultiplier + Math.random() * 360;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      const selectedIndex = calculateSelectedOption(newRotation);
      const optionIdentifier = String.fromCharCode(65 + (selectedIndex % 26));
      setResult(`${optionIdentifier}: ${options[selectedIndex]}`);

      if (confettiRef.current) {
        const rect = confettiRef.current.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { x: x / window.innerWidth, y: y / window.innerHeight },
          colors: [
            "#FF5252",
            "#FF4081",
            "#7C4DFF",
            "#536DFE",
            "#18FFFF",
            "#B2FF59",
          ],
        });
      }
    }, spinSpeed * 1000);
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

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpinSpeed(Number(e.target.value));
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>Spinner Wheel</h1>
          <p>Add options and spin the wheel to make a random decision</p>
        </PageHeader>

        <ControlsContainer>
          <SpeedControl>
            <SpeedLabel>Spin Speed:</SpeedLabel>
            <SpeedSlider
              type="range"
              min="1"
              max="5"
              step="1"
              value={spinSpeed}
              onChange={handleSpeedChange}
            />
            <SpeedValue>
              {spinSpeed === 1 ? "Slow" : spinSpeed === 5 ? "Fast" : "Medium"}
            </SpeedValue>
          </SpeedControl>
        </ControlsContainer>

        <ContentWrapper>
          <WheelSection>
            <WheelContainer ref={confettiRef}>
              <WheelGlow spinning={spinning} />
              <Wheel
                ref={wheelRef}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? `transform ${spinSpeed}s cubic-bezier(0.2, 0.8, 0.2, 1)`
                    : "none",
                }}
              >
                <SpinnyImageContainer spinning={spinning}>
                  <img
                    src={getCardImageUrl(SPINNY_CARD_ID, "cropped")}
                    alt="Salamangreat Spinny"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      // Provide fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = getCardBackImageUrl();
                    }}
                  />
                </SpinnyImageContainer>

                {options.map((option, index) => {
                  const angle = (index * 360) / options.length;
                  // Use letters for options (A, B, C, etc.)
                  const optionIdentifier = String.fromCharCode(
                    65 + (index % 26)
                  ); // A-Z
                  
                  // Calculate optimal position based on segment angle
                  // This ensures the identifiers are properly positioned in each segment
                  let adjustedPosition = 70; // Default position from center
                  
                  return (
                    <WheelOption
                      key={index}
                      style={{
                        transform: `rotate(${angle}deg) translate(0, -50%)`,
                      }}
                      $background={getColorForSegment(index, options.length)}
                      $total={options.length}
                    >
                      <OptionIdentifierCenter
                        style={{
                          transform: `rotate(${90 - angle}deg)`,
                          left: `${adjustedPosition}px`,
                        }}
                      >
                        {optionIdentifier}
                      </OptionIdentifierCenter>
                    </WheelOption>
                  );
                })}
                <WheelCenterBorder />
              </Wheel>
              <PointerContainer>
                <Pointer />
              </PointerContainer>
            </WheelContainer>

            <SpinButtonContainer>
              <SpinButton
                onClick={spinWheel}
                disabled={spinning}
                variant={spinning ? "tertiary" : "primary"}
                size="lg"
                spinning={spinning}
              >
                {spinning ? "Spinning..." : "SPIN"}
              </SpinButton>
            </SpinButtonContainer>

            {result && (
              <ResultContainer>
                <ResultStars />
                <ResultText>
                  Result: <ResultValue>{result}</ResultValue>
                </ResultText>
              </ResultContainer>
            )}
          </WheelSection>

          <OptionsSection>
            <Card elevation="low">
              <Card.Content>
                <OptionsHeader>Manage Options</OptionsHeader>

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
                  {options.map((option, index) => {
                    const optionIdentifier = String.fromCharCode(
                      65 + (index % 26)
                    ); // A-Z
                    return (
                      <OptionItem
                        key={index}
                        $color={getColorForSegment(index, options.length)}
                      >
                        <OptionColor
                          $background={getColorForSegment(
                            index,
                            options.length
                          )}
                        />
                        <OptionIdentifier>{optionIdentifier}</OptionIdentifier>
                        <OptionLabel>{option}</OptionLabel>
                        <RemoveButton onClick={() => removeOption(index)}>
                          ✕
                        </RemoveButton>
                      </OptionItem>
                    );
                  })}
                </OptionsList>
              </Card.Content>
            </Card>
          </OptionsSection>
        </ContentWrapper>
      </PageContainer>
    </AppLayout>
  );
};

const getColorForSegment = (index: number, total: number) => {
  const colors = [
    "#FF5252",
    "#FF4081",
    "#7C4DFF",
    "#536DFE",
    "#448AFF",
    "#40C4FF",
    "#18FFFF",
    "#64FFDA",
    "#69F0AE",
    "#B2FF59",
    "#EEFF41",
    "#FFEB3B",
    "#FFC107",
    "#FF9800",
  ];

  const baseColor = colors[index % colors.length];
  const hueShift = (index * (360 / Math.max(total, colors.length))) % 30;

  return baseColor;
};

const glowAnimation = keyframes`
  0% { box-shadow: 0 0 20px rgba(94, 53, 177, 0.5); }
  50% { box-shadow: 0 0 30px rgba(94, 53, 177, 0.8); }
  100% { box-shadow: 0 0 20px rgba(94, 53, 177, 0.5); }
`;

const spinGlow = keyframes`
  0% { box-shadow: 0 0 20px rgba(94, 53, 177, 0.5); }
  25% { box-shadow: 0 0 30px rgba(233, 30, 99, 0.8); }
  50% { box-shadow: 0 0 40px rgba(0, 188, 212, 0.8); }
  75% { box-shadow: 0 0 30px rgba(139, 195, 74, 0.8); }
  100% { box-shadow: 0 0 20px rgba(94, 53, 177, 0.5); }
`;

const spin = keyframes`
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
`;

const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const rotate = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
`;

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const PageHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.lg};

  h1 {
    margin-bottom: ${theme.spacing.sm};
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["2xl"]};
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  p {
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.size.lg};
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  gap: ${theme.spacing.md};
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
  display: flex;
  justify-content: center;
  align-items: center;

  @media (max-width: 500px) {
    width: 300px;
    height: 300px;
  }
`;

const WheelGlow = styled.div<{ spinning: boolean }>`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: ${(props) => (props.spinning ? spinGlow : glowAnimation)} 2s
    infinite;
  pointer-events: none;
  z-index: 0;

  &::before {
    content: "";
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      rgba(255, 82, 82, 0.5),
      rgba(255, 64, 129, 0.5),
      rgba(124, 77, 255, 0.5),
      rgba(83, 109, 254, 0.5),
      rgba(68, 138, 255, 0.5),
      rgba(64, 196, 255, 0.5),
      rgba(24, 255, 255, 0.5),
      rgba(100, 255, 218, 0.5),
      rgba(105, 240, 174, 0.5),
      rgba(178, 255, 89, 0.5),
      rgba(238, 255, 65, 0.5),
      rgba(255, 235, 59, 0.5),
      rgba(255, 193, 7, 0.5),
      rgba(255, 152, 0, 0.5),
      rgba(255, 82, 82, 0.5)
    );
    opacity: ${(props) => (props.spinning ? 0.8 : 0.4)};
    z-index: -1;
    filter: blur(10px);
    animation: ${rotate} ${(props) => (props.spinning ? "5s" : "20s")} linear
      infinite;
  }
`;

const Wheel = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  transform-origin: center;
  box-shadow: 0 0 25px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.3);
  border: 12px solid #333;
  overflow: hidden;
  background: radial-gradient(circle at center, #444 0%, #222 100%);
  z-index: 1;
  transform: perspective(800px) rotateX(5deg);
  transition: transform 0.3s ease;

  &:hover {
    transform: perspective(800px) rotateX(8deg);
  }

  &::before {
    content: "";
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      #ff5252,
      #ff4081,
      #7c4dff,
      #536dfe,
      #448aff,
      #40c4ff,
      #18ffff,
      #64ffda,
      #69f0ae,
      #b2ff59,
      #eeff41,
      #ffeb3b,
      #ffc107,
      #ff9800,
      #ff5252
    );
    opacity: 0.15;
    z-index: -1;
    filter: blur(10px);
    animation: rotate 20s linear infinite;
  }
`;

const WheelCenterBorder = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle at center, #333 0%, #111 100%);
  z-index: 8;
`;

const SpinnyImageContainer = styled.div<{ spinning: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  z-index: 10;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.6);
  animation: ${(props) => (props.spinning ? spin : "none")} 1s linear infinite;
  border: 5px solid #222;
`;

const WheelOption = styled.div<{ $background: string; $total: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: 0 0;
  width: 50%;
  height: ${(props) => Math.max(30, Math.min(60, 350 / props.$total))}px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-left: 40px;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0, 0, 0, 1);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
  background-color: ${(props) => props.$background};
  background-image: linear-gradient(
    to right,
    ${(props) => props.$background}BB,
    ${(props) => props.$background}
  );
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.3);

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0.2),
      transparent
    );
  }

  border: 1px solid rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  &:hover {
    filter: brightness(1.1);
  }
`;

const OptionIdentifierCenter = styled.div`
  position: absolute;
  left: 15px; /* Moved more to the left */
  top: 25%; /* Keeping the requested top position */
  transform: translateY(-50%);
  width: 24px; /* Decreased size */
  height: 24px; /* Decreased size */
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  font-size: 14px; /* Smaller font */
  font-weight: bold;
  border-radius: 50%;
  border: 2px solid white; /* Thinner border */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  z-index: 11;
`;

const PointerContainer = styled.div`
  position: absolute;
  top: -40px; /* Moved closer to the wheel */
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Pointer = styled.div`
  width: 40px; /* Reduced from 70px */
  height: 50px; /* Reduced from 90px */
  background: ${theme.colors.primary.dark};
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 7px; /* Adjusted for smaller size */
    left: 50%;
    transform: translateX(-50%);
    width: 16px; /* Reduced from 30px */
    height: 16px; /* Reduced from 30px */
    border-radius: 50%;
    background: white;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.4);
  }
`;

const SpinButtonContainer = styled.div`
  margin: ${theme.spacing.md} 0;
`;

const SpinButton = styled(Button)<{ spinning: boolean }>`
  padding: 12px 48px;
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 1px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  animation: ${(props) => (props.spinning ? pulseAnimation : "none")} 1s
    ease-in-out infinite;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const ResultStars = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: -1;

  &::before,
  &::after {
    content: "⭐";
    position: absolute;
    font-size: 16px;
    animation: ${float} 2s ease-in-out infinite;
  }

  &::before {
    top: 5px;
    left: 15px;
  }

  &::after {
    top: 8px;
    right: 20px;
    animation-delay: 0.5s;
  }

  /* Add more stars with different positions and animations */
  &::after {
    content: "🎉";
    position: absolute;
    top: -10px;
    left: 40%;
    font-size: 20px;
    animation: ${float} 2.5s ease-in-out infinite reverse;
  }
`;

const ResultContainer = styled.div`
  position: relative;
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, #ffffff, #f5f5f5);
  border-radius: ${theme.borderRadius.md};
  text-align: center;
  box-shadow: ${theme.shadows.md}, 0 5px 15px rgba(0, 0, 0, 0.1);
  border: 2px solid ${theme.colors.primary.light};
  animation: ${pulseAnimation} 2s ease-in-out;
  overflow: hidden;

  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${theme.colors.primary.light};
    animation: ${sparkle} 2s infinite;
    z-index: 0;
  }

  &::before {
    top: 15%;
    left: 10%;
    animation-delay: 0.3s;
  }

  &::after {
    bottom: 15%;
    right: 10%;
    animation-delay: 0.7s;
  }
`;

const ResultText = styled.p`
  font-size: ${theme.typography.size.lg};
  color: ${theme.colors.text.primary};
  margin: 0;
  position: relative;
  z-index: 1;
`;

const ResultValue = styled.span`
  font-weight: ${theme.typography.weight.bold};
  background: linear-gradient(
    45deg,
    ${theme.colors.primary.main},
    ${theme.colors.secondary.main}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: ${theme.typography.size.xl};
  display: block;
  margin-top: ${theme.spacing.sm};
  position: relative;
  z-index: 1;

  &::after {
    content: "✨";
    position: absolute;
    right: -25px;
    animation: ${float} 1.5s infinite ease-in-out;
  }
`;

const OptionsSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const OptionsHeader = styled.h2`
  margin-top: 0;
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.xl};
  border-bottom: 2px solid ${theme.colors.border.default};
  padding-bottom: ${theme.spacing.sm};
`;

const AddOptionForm = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

const Input = styled.input`
  flex: 1;
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.size.md};
  transition: all 0.3s ease;

  &:focus {
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${theme.colors.primary.light}40;
    outline: none;
  }
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  max-height: 400px;
  overflow-y: auto;
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background.paper};
`;

const OptionItem = styled.div<{ $color: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background.light};
  border-radius: ${theme.borderRadius.sm};
  border-left: 4px solid ${(props) => props.$color};
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const OptionColor = styled.div<{ $background: string }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${(props) => props.$background};
  margin-right: ${theme.spacing.sm};
`;

const OptionIdentifier = styled.span`
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  font-weight: ${theme.typography.weight.bold};
  color: white;
  background-color: ${theme.colors.primary.main};
  border-radius: 50%;
  margin-right: ${theme.spacing.md};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const OptionLabel = styled.span`
  color: ${theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.error.main};
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(244, 67, 54, 0.1);
    transform: scale(1.2);
  }
`;

const SpeedControl = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const SpeedLabel = styled.span`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.md};
  font-weight: ${theme.typography.weight.medium};
`;

const SpeedSlider = styled.input`
  -webkit-appearance: none;
  width: 120px;
  height: 6px;
  border-radius: 3px;
  background: ${theme.colors.background.dark};
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${theme.colors.primary.main};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.2);
      background: ${theme.colors.primary.dark};
    }
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${theme.colors.primary.main};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.2);
      background: ${theme.colors.primary.dark};
    }
  }
`;

const SpeedValue = styled.span`
  min-width: 50px;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.sm};
`;

export default SpinnerWheel;
