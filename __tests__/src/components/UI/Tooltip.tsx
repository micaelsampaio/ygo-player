import React, { useState } from "react";
import styled from "styled-components";
import theme from "../../styles/theme";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = "top",
  delay = 300,
}) => {
  const [active, setActive] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setActive(true);
    }, delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setActive(false);
  };

  return (
    <TooltipWrapper
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {active && (
        <TooltipContent position={position}>
          <TooltipArrow position={position} />
          {content}
        </TooltipContent>
      )}
    </TooltipWrapper>
  );
};

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipContent = styled.div<{ position: string }>`
  position: absolute;
  background-color: ${theme.colors.text.primary};
  color: white;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.size.xs};
  white-space: nowrap;
  z-index: 1000;
  filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2));

  ${({ position }) => {
    switch (position) {
      case "top":
        return `
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
        `;
      case "bottom":
        return `
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
        `;
      case "left":
        return `
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-right: 8px;
        `;
      case "right":
        return `
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 8px;
        `;
      default:
        return "";
    }
  }}
`;

const TooltipArrow = styled.span<{ position: string }>`
  position: absolute;
  width: 0;
  height: 0;
  border: 6px solid transparent;

  ${({ position }) => {
    switch (position) {
      case "top":
        return `
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-top-color: ${theme.colors.text.primary};
        `;
      case "bottom":
        return `
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-bottom-color: ${theme.colors.text.primary};
        `;
      case "left":
        return `
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          border-left-color: ${theme.colors.text.primary};
        `;
      case "right":
        return `
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          border-right-color: ${theme.colors.text.primary};
        `;
      default:
        return "";
    }
  }}
`;

export default Tooltip;
