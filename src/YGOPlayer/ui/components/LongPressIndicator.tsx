import React, { useEffect, useState } from "react";

interface LongPressIndicatorProps {
  position: { x: number; y: number };
  progress: number;
  visible: boolean;
  completed: boolean;
}

export function LongPressIndicator({
  position,
  progress,
  visible,
  completed = false,
}: LongPressIndicatorProps) {
  const [showRipple, setShowRipple] = useState(false);

  // Create a "ripple" effect when completed
  useEffect(() => {
    if (completed) {
      setShowRipple(true);
      const timer = setTimeout(() => {
        setShowRipple(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [completed]);

  if (!visible) return null;

  const size = 40; // Size of indicator in pixels
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      className={`long-press-indicator ${completed ? "completed" : ""} ${
        showRipple ? "ripple" : ""
      }`}
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          strokeOpacity={0.3}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={completed ? "#4CAF50" : "#ffffff"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />

        {/* Center dot */}
        {completed && (
          <circle cx={size / 2} cy={size / 2} r={radius / 3} fill="#4CAF50" />
        )}
      </svg>
    </div>
  );
}
