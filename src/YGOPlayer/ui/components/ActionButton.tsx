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
  if (icon) {
    return (
      <button
        className={`ygo-card-item ygo-card-item-flex ${className}`}
        onClick={onClick}
        disabled={disabled}
        style={style}
        type="button"
      >
        <div className="ygo-card-item-icon">{icon}</div>
        <div className="ygo-card-item-text">{children}</div>
      </button>
    );
  }

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

type YGOFontIcons = "b"
  | "b_fd"
  | "destroy"
  | "gy"
  | "normal_summon"
  | "set"
  | "special_summon"
  | "special_summon_def"
  | "to_hand"

export function YGOIcon({ icon, className = '' }: { icon: YGOFontIcons, className?: string }) {
  return <div className={`ygo-i--${icon} ${className}`}></div>
}
