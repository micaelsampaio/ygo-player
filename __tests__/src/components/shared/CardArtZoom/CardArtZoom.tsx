import React, { useRef, useEffect, useState } from "react";
import styled from "styled-components";
import theme from "../../../styles/theme";
import { getCardImageUrl } from "../../../utils/cardImages";

interface CardArtZoomProps {
  cardId: number;
  size?: number;
  className?: string;
}

/**
 * CardArtZoom component
 *
 * This component extracts just the artwork portion from a Yu-Gi-Oh! card image.
 * It works by loading the full card image and then cropping it to show only
 * the artwork section.
 */
const CardArtZoom: React.FC<CardArtZoomProps> = ({
  cardId,
  size = 200,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Enable CORS for the image
    img.src = getCardImageUrl(cardId);

    img.onload = () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas dimensions to our desired size
      canvas.width = size;
      canvas.height = size;

      // The card art is approximately in this region of the card image
      // These ratios are approximations and might need adjustment
      const sourceX = img.width * 0.12;
      const sourceY = img.width * 0.22; // Start a bit lower to avoid the name box
      const sourceWidth = img.width * 0.76;
      const sourceHeight = img.width * 0.58; // Make it more square-like

      // Draw only the artwork portion to our canvas
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        size,
        size
      );

      setLoading(false);
    };

    img.onerror = () => {
      setError(true);
      setLoading(false);
    };
  }, [cardId, size]);

  return (
    <Container className={className} $size={size}>
      {loading && <LoadingIndicator>Loading...</LoadingIndicator>}
      {error && <ErrorMessage>Failed to load card art</ErrorMessage>}
      <Canvas
        ref={canvasRef}
        width={size}
        height={size}
        $visible={!loading && !error}
      />
    </Container>
  );
};

const Container = styled.div<{ $size: number }>`
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  background-color: ${theme.colors.background.card};
`;

const Canvas = styled.canvas<{ $visible: boolean }>`
  width: 100%;
  height: 100%;
  display: ${(props) => (props.$visible ? "block" : "none")};
`;

const LoadingIndicator = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${theme.colors.background.light};
  color: ${theme.colors.text.secondary};
`;

const ErrorMessage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${theme.colors.background.paper};
  color: ${theme.colors.error.main};
  padding: ${theme.spacing.sm};
  text-align: center;
`;

export default CardArtZoom;
