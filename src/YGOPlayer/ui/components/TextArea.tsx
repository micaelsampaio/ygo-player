import React, { forwardRef } from "react";

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const YGOTextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`ygo-input ygo-w-full ${className}`.trim()}
        {...props}
      />
    );
  }
);
