import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { AudioConfig } from "../../audio/types";

const VisualizerContainer = styled.div`
  width: 100%;
  padding: 0 15px;
  margin: 10px 0;
  background: #1a1a1a;
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
`;

const VisualizerCanvas = styled.canvas`
  width: 100%;
  height: 40px;
  display: block;
`;

interface AudioVisualizerProps {
  analyser: AnalyserNode;
  config?: Partial<AudioConfig>;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  config,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const dataArrayRef = useRef<Uint8Array>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    if (!dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArrayRef.current!);

      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00ff00";

      const sliceWidth = canvas.width / analyser.frequencyBinCount;
      let x = 0;

      for (let i = 0; i < analyser.frequencyBinCount; i++) {
        const v = dataArrayRef.current![i] / 128.0;
        const y = v * (canvas.height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      dataArrayRef.current = undefined;
    };
  }, [analyser]);

  return (
    <VisualizerContainer>
      <VisualizerCanvas ref={canvasRef} />
    </VisualizerContainer>
  );
};
