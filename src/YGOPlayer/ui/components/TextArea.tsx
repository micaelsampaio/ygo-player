import React from "react";

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function YGOTextArea({ className = "", ...props }: TextAreaProps) {
  return (
    <textarea
      className={`ygo-input ygo-w-full ${className}`.trim()}
      {...props}
    />
  );
}