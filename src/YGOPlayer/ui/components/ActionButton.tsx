import { CSSProperties, ReactNode } from "react";

interface ActionButtonProps {
  icon?: ReactNode;                // optional icon element
  children: ReactNode;             // button text/content
  onClick?: () => void;            // click handler
  disabled?: boolean;              // optional disabled state
  className?: string;              // extra CSS classes
  style?: CSSProperties;           // inline styles
}

export function ActionButton({
  icon,
  children,
  onClick,
  disabled = false,
  className = "",
  style,
}: ActionButtonProps) {
  // if (icon) {
  //   return (
  //     <button
  //       className={`ygo-card-item ygo-card-item-flex ${className}`}
  //       onClick={onClick}
  //       disabled={disabled}
  //       style={style}
  //       type="button"
  //     >
  //       <div className="ygo-card-item-icon">{icon}</div>
  //       <div className="ygo-card-item-text">{children}</div>
  //     </button>
  //   );
  // }

  return (
    <button
      className={`ygo-card-item ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
      type="button"
    >
      {children}
    </button>
  );
}
