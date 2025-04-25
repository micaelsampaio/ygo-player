import styled, { css } from "styled-components";
import { ReactNode, ElementType, ButtonHTMLAttributes } from "react";
import theme from "../../styles/theme";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: ReactNode;
  as?: ElementType;
  href?: string;
  children: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
}

// Button variants
const buttonVariants = {
  primary: css`
    background-color: ${theme.colors.primary.main};
    color: ${theme.colors.text.inverse};
    border: none;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.primary.dark};
    }

    &:active:not(:disabled) {
      background-color: ${theme.colors.primary.dark};
    }
  `,
  secondary: css`
    background-color: ${theme.colors.secondary.main};
    color: ${theme.colors.text.inverse};
    border: none;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.secondary.dark};
    }

    &:active:not(:disabled) {
      background-color: ${theme.colors.secondary.dark};
    }
  `,
  tertiary: css`
    background-color: transparent;
    color: ${theme.colors.primary.main};
    border: 1px solid ${theme.colors.border.default};

    &:hover:not(:disabled) {
      background-color: ${theme.colors.background.card};
      border-color: ${theme.colors.primary.main};
    }

    &:active:not(:disabled) {
      background-color: ${theme.colors.background.card};
    }
  `,
  danger: css`
    background-color: ${theme.colors.error.main};
    color: ${theme.colors.text.inverse};
    border: none;

    &:hover:not(:disabled) {
      background-color: ${theme.colors.error.dark};
    }

    &:active:not(:disabled) {
      background-color: ${theme.colors.error.dark};
    }
  `,
};

// Button sizes
const buttonSizes = {
  sm: css`
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.typography.size.sm};
  `,
  md: css`
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    font-size: ${theme.typography.size.base};
  `,
  lg: css`
    padding: ${theme.spacing.md} ${theme.spacing.lg};
    font-size: ${theme.typography.size.md};
  `,
};

const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ size }) => buttonSizes[size || "md"]};
  border-radius: ${theme.borderRadius.md};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: all ${theme.transitions.default};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  font-weight: ${theme.typography.weight.medium};

  ${({ variant }) => buttonVariants[variant || "primary"]};
  ${({ fullWidth }) => fullWidth && "width: 100%;"}

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.4);
  }

  ${({ iconOnly, size }) =>
    iconOnly &&
    `
    width: ${size === "sm" ? "32px" : size === "lg" ? "48px" : "40px"};
    height: ${size === "sm" ? "32px" : size === "lg" ? "48px" : "40px"};
    padding: 0;
  `}
`;

const Button = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  isLoading = false,
  disabled = false,
  children,
  ...rest
}: ButtonProps) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      isLoading={isLoading}
      disabled={disabled || isLoading}
      {...rest}
    >
      {icon && icon}
      {isLoading ? "Loading..." : children}
    </StyledButton>
  );
};

export default Button;
