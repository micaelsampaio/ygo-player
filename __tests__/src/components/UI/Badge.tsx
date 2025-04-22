import React, { ReactNode } from "react";
import styled, { css } from "styled-components";
import theme from "../../styles/theme";

type BadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "warning"
  | "info";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  pill?: boolean;
  outline?: boolean;
  className?: string;
}

const getVariantStyles = (variant: BadgeVariant, outline: boolean) => {
  const variantMap = {
    primary: {
      bg: theme.colors.primary.main,
      color: "#fff",
      border: theme.colors.primary.main,
    },
    secondary: {
      bg: theme.colors.secondary.main,
      color: "#fff",
      border: theme.colors.secondary.main,
    },
    success: {
      bg: theme.colors.success.main,
      color: "#fff",
      border: theme.colors.success.main,
    },
    error: {
      bg: theme.colors.error.main,
      color: "#fff",
      border: theme.colors.error.main,
    },
    warning: {
      bg: theme.colors.warning.main,
      color: "#000",
      border: theme.colors.warning.main,
    },
    info: {
      bg: theme.colors.info.main,
      color: "#fff",
      border: theme.colors.info.main,
    },
  };

  const { bg, color, border } = variantMap[variant];

  if (outline) {
    return css`
      background-color: transparent;
      color: ${bg};
      border: 1px solid ${border};
    `;
  }

  return css`
    background-color: ${bg};
    color: ${color};
    border: 1px solid transparent;
  `;
};

const getSizeStyles = (size: BadgeSize) => {
  const sizeMap = {
    sm: {
      fontSize: theme.typography.size.xs,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    },
    md: {
      fontSize: theme.typography.size.sm,
      padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    },
    lg: {
      fontSize: theme.typography.size.base,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    },
  };

  return css`
    font-size: ${sizeMap[size].fontSize};
    padding: ${sizeMap[size].padding};
  `;
};

const StyledBadge = styled.span<BadgeProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: ${theme.typography.weight.medium};
  border-radius: ${(props) => (props.pill ? "9999px" : theme.borderRadius.sm)};
  ${(props) => getVariantStyles(props.variant || "primary", !!props.outline)}
  ${(props) => getSizeStyles(props.size || "md")}
  line-height: 1;
  white-space: nowrap;
`;

const Badge: React.FC<BadgeProps> = ({
  variant = "primary",
  size = "md",
  pill = false,
  outline = false,
  children,
  className,
}) => {
  return (
    <StyledBadge
      variant={variant}
      size={size}
      pill={pill}
      outline={outline}
      className={className}
    >
      {children}
    </StyledBadge>
  );
};

export default Badge;
