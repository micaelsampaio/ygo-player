import React from "react";
import styled, { css } from "styled-components";
import theme from "../../styles/theme";
import Badge from "./Badge";
import Card from "./Card";

// Using environment variable for CDN URL
const cdnUrl = String(
  import.meta.env.VITE_YGO_CDN_URL || "https://ygo-player.s3.amazonaws.com"
);

interface YGOCardProps {
  cardId: number | string;
  name?: string;
  description?: string;
  type?: string;
  atk?: number | string;
  def?: number | string;
  level?: number;
  attribute?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  selected?: boolean;
  showDetails?: boolean;
  className?: string;
  hoverable?: boolean;
}

const CardSizes = {
  sm: { width: "60px", height: "87px" },
  md: { width: "100px", height: "145px" },
  lg: { width: "180px", height: "262px" },
};

const CardWrapper = styled.div<{
  size: "sm" | "md" | "lg";
  selected?: boolean;
  hoverable?: boolean;
}>`
  position: relative;
  border-radius: ${theme.borderRadius.sm};
  overflow: hidden;
  width: ${(props) => CardSizes[props.size].width};
  height: ${(props) => CardSizes[props.size].height};
  box-shadow: ${(props) =>
    props.selected
      ? `0 0 0 2px ${theme.colors.primary.main}, ${theme.shadows.md}`
      : theme.shadows.sm};
  transition: transform 0.2s, box-shadow 0.2s;

  ${(props) =>
    props.hoverable &&
    css`
      cursor: pointer;
      &:hover {
        transform: translateY(-5px);
        box-shadow: ${theme.shadows.md};
      }
    `}
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: ${theme.borderRadius.sm};
`;

const CardOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    transparent 60%,
    rgba(0, 0, 0, 0.8) 100%
  );
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: ${theme.spacing.sm};
  color: white;

  ${CardWrapper}:hover & {
    opacity: 1;
  }
`;

const AttributeBadge = styled(Badge)`
  position: absolute;
  top: ${theme.spacing.xs};
  right: ${theme.spacing.xs};
  font-size: 0.6rem;
  padding: 2px 4px;
`;

const LevelIndicator = styled.div`
  position: absolute;
  top: ${theme.spacing.xs};
  left: ${theme.spacing.xs};
  display: flex;
  align-items: center;
`;

const LevelStar = styled.div`
  width: 12px;
  height: 12px;
  background-color: gold;
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
  margin-right: 2px;
`;

const CardDetails = styled.div<{ size: "sm" | "md" | "lg" }>`
  margin-top: ${theme.spacing.xs};

  h4 {
    margin: 0 0 ${theme.spacing.xs} 0;
    font-size: ${(props) =>
      props.size === "lg"
        ? theme.typography.size.md
        : props.size === "md"
        ? theme.typography.size.sm
        : theme.typography.size.xs};
    color: ${theme.colors.text.primary};
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p {
    margin: 0;
    font-size: ${(props) =>
      props.size === "lg"
        ? theme.typography.size.sm
        : theme.typography.size.xs};
    color: ${theme.colors.text.secondary};
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const CardStats = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${theme.spacing.xs};
  font-size: ${theme.typography.size.xs};
  color: ${theme.colors.text.primary};

  span {
    font-weight: ${theme.typography.weight.semibold};
  }
`;

// Helper function to get attribute color
const getAttributeColor = (attribute: string): string => {
  const attributeColors: Record<string, string> = {
    DARK: "secondary",
    LIGHT: "warning",
    EARTH: "success",
    FIRE: "danger",
    WATER: "primary",
    WIND: "info",
    DIVINE: "warning",
  };

  return attributeColors[attribute] || "primary";
};

const YGOCard: React.FC<YGOCardProps> = ({
  cardId,
  name,
  description,
  type,
  atk,
  def,
  level,
  attribute,
  size = "md",
  onClick,
  selected = false,
  showDetails = false,
  className,
  hoverable = true,
}) => {
  const imageUrl = `${cdnUrl}/images/cards/${cardId}.jpg`;

  return (
    <div className={className}>
      <CardWrapper
        size={size}
        selected={selected}
        onClick={onClick}
        hoverable={hoverable && !!onClick}
      >
        <CardImage
          src={imageUrl}
          alt={name || `Card ${cardId}`}
          loading="lazy"
        />

        {attribute && (
          <AttributeBadge
            variant={getAttributeColor(attribute.toUpperCase())}
            pill
            size="sm"
          >
            {attribute}
          </AttributeBadge>
        )}

        {level && level > 0 && (
          <LevelIndicator>
            {[...Array(level)].map((_, i) => (
              <LevelStar key={i} />
            ))}
          </LevelIndicator>
        )}

        <CardOverlay>{name && <div>{name}</div>}</CardOverlay>
      </CardWrapper>

      {showDetails && (name || description || (atk && def)) && (
        <CardDetails size={size}>
          {name && <h4 title={name}>{name}</h4>}
          {type && <small>{type}</small>}
          {description && <p>{description}</p>}

          {(atk || def) && (
            <CardStats>
              <div>
                ATK: <span>{atk}</span>
              </div>
              <div>
                DEF: <span>{def}</span>
              </div>
            </CardStats>
          )}
        </CardDetails>
      )}
    </div>
  );
};

// Component to display a grid of cards with consistent spacing
export const YGOCardGrid = styled.div<{ gap?: string }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: ${(props) => props.gap || theme.spacing.md};
  width: 100%;
`;

export default YGOCard;
