import styled, { css } from "styled-components";
import { ReactNode, ElementType, ButtonHTMLAttributes } from "react";
import theme from "../../styles/theme";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger"
  | "success"
  | "warning";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: ReactNode;
  iconOnly?: boolean;
  as?: ElementType;
  href?: string;
  children: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  target?: string;
}

// Button variants
const buttonVariants = {
  primary: css`
    background-color: ${theme.colors.primary.main};
    color: ${theme.colors.text.inverse};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.primary.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  `,
  secondary: css`
    background-color: ${theme.colors.secondary.main};
    color: ${theme.colors.text.inverse};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.secondary.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  `,
  tertiary: css`
    background-color: transparent;
    color: ${theme.colors.primary.main};
    border: 1px solid ${theme.colors.border.default};

    &:hover:not(:disabled) {
      background-color: ${theme.colors.background.card};
      border-color: ${theme.colors.primary.main};
      transform: translateY(-2px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `,
  danger: css`
    background-color: ${theme.colors.error.main};
    color: ${theme.colors.text.inverse};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.error.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  `,
  success: css`
    background-color: ${theme.colors.success.main};
    color: ${theme.colors.text.inverse};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.success.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  `,
  warning: css`
    background-color: ${theme.colors.warning.main};
    color: ${theme.colors.text.primary};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.warning.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  `,
};

// Button sizes
const buttonSizes = {
  sm: css`
    padding: 4px 8px;
    font-size: ${theme.typography.size.xs};
  `,
  md: css`
    padding: 6px 12px;
    font-size: ${theme.typography.size.sm};
  `,
  lg: css`
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    font-size: ${theme.typography.size.base};
  `,
};

const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.md};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: all ${theme.transitions.default};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  font-family: ${theme.typography.fontFamily};
  font-weight: ${theme.typography.weight.medium};
  text-decoration: none;

  ${({ size = "md" }) => buttonSizes[size]};
  ${({ variant = "primary" }) => buttonVariants[variant]};
  ${({ fullWidth }) => fullWidth && "width: 100%;"}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.4);
  }

  ${({ iconOnly, size = "md" }) =>
    iconOnly &&
    `
    width: ${size === "sm" ? "28px" : size === "lg" ? "44px" : "36px"};
    height: ${size === "sm" ? "28px" : size === "lg" ? "44px" : "36px"};
    padding: ${size === "sm"
      ? theme.spacing.xs
      : size === "lg"
        ? theme.spacing.sm
        : theme.spacing.xs
    };
  `}
`;

const Button = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  iconOnly = false,
  isLoading = false,
  disabled = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) => {
  const buttonClass = `btn btn-${variant} ${size !== "md" ? `btn-${size}` : ""
    } ${fullWidth ? "btn-full-width" : ""} ${icon && !iconOnly ? "btn-icon" : ""
    } ${iconOnly ? "btn-icon-only" : ""} ${className}`.trim();

  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      iconOnly={iconOnly}
      isLoading={isLoading}
      disabled={disabled || isLoading}
      className={buttonClass}
      type={type}
      {...rest}
    >
      {icon && icon}
      {!iconOnly && (isLoading ? "Loading..." : children)}
    </StyledButton>
  );
};

export default Button;
