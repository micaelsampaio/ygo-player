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
  gap: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  font-weight: ${theme.typography.weight.medium};
  cursor: pointer;
  transition: all ${theme.transitions.default};
  outline: none;

  // Apply variant styles
  ${({ variant = "primary" }) => buttonVariants[variant]}

  // Apply size styles
  ${({ size = "md" }) => buttonSizes[size]}
  
  // Full width option
  ${({ fullWidth }) =>
    fullWidth &&
    css`
      width: 100%;
    `}
  
  // Loading state
  ${({ isLoading }) =>
    isLoading &&
    css`
      cursor: wait;
      opacity: 0.7;
      &:hover {
        background-color: ${theme.colors.primary.main};
      }
    `}
  
  // Disabled state
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    background-color: ${theme.colors.background.card};
    color: ${theme.colors.text.disabled};
    border-color: ${theme.colors.border.default};
  }
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
