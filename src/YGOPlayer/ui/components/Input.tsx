import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function YGOInput({ className = "", ...props }: InputProps) {
  return (
    <input
      type="text"
      className={`ygo-input ${className}`.trim()}
      {...props}
    />
  );
}
