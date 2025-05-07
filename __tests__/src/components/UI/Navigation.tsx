import React from "react";
import { Link, useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import theme from "../../styles/theme";

interface NavigationItem {
  to: string;
  label: string;
  icon?: React.ReactNode;
}

interface NavigationProps {
  items: NavigationItem[];
  orientation?: "horizontal" | "vertical";
  variant?: "primary" | "secondary";
  showIcons?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const getActiveStyles = (variant: string) => {
  const activeMap = {
    primary: css`
      color: ${theme.colors.primary.main};
      font-weight: ${theme.typography.weight.medium};
      border-color: ${theme.colors.primary.main};
      background-color: rgba(0, 120, 212, 0.05);
      &::before {
        opacity: 1;
      }
    `,
    secondary: css`
      color: ${theme.colors.primary.main};
      font-weight: ${theme.typography.weight.medium};

      &::after {
        transform: scaleX(1);
      }
    `,
  };

  return (activeMap as any)[variant];
};

const NavContainer = styled.nav<{
  orientation: "horizontal" | "vertical";
  variant: "primary" | "secondary";
  collapsed?: boolean;
}>`
  display: flex;
  flex-direction: ${({ orientation }) =>
    orientation === "horizontal" ? "row" : "column"};
  align-items: ${({ orientation }) =>
    orientation === "horizontal" ? "center" : "stretch"};
  gap: ${({ orientation }) =>
    orientation === "horizontal" ? theme.spacing.md : theme.spacing.sm};

  ${({ orientation, collapsed }) =>
    orientation === "vertical" &&
    collapsed &&
    css`
      width: 60px;
      overflow: hidden;
    `}

  ${({ variant, orientation }) =>
    variant === "primary" &&
    orientation === "vertical" &&
    css`
      background-color: ${theme.colors.background.paper};
      border-radius: ${theme.borderRadius.md};
      box-shadow: ${theme.shadows.sm};
      padding: ${theme.spacing.sm};
    `}
`;

const getSizeStyles = (size: string) => {
  const sizeMap = {
    sm: css`
      font-size: ${theme.typography.size.sm};
      padding: ${theme.spacing.xs} ${theme.spacing.sm};
    `,
    md: css`
      font-size: ${theme.typography.size.base};
      padding: ${theme.spacing.sm} ${theme.spacing.md};
    `,
    lg: css`
      font-size: ${theme.typography.size.md};
      padding: ${theme.spacing.md} ${theme.spacing.lg};
    `,
  };

  return (sizeMap as any)[size];
};

const StyledNavLink = styled(Link) <{
  orientation: "horizontal" | "vertical";
  variant: "primary" | "secondary";
  active: boolean;
  size: "sm" | "md" | "lg";
  collapsed?: boolean;
  showIcons?: boolean;
}>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  text-decoration: none;
  color: #AAA;
  border-radius: ${({ orientation, variant }) =>
    orientation === "vertical" && variant === "primary"
      ? theme.borderRadius.md
      : orientation === "horizontal"
        ? "0"
        : "0"};
  transition: all ${theme.transitions.default};
  position: relative;
  white-space: nowrap;
  font-weight: ${theme.typography.weight.medium};

  ${({ size }) => getSizeStyles(size)}

  ${({ active, variant }) => active && getActiveStyles(variant)}
  
  ${({ variant, orientation }) =>
    variant === "secondary" &&
    orientation === "horizontal" &&
    css`
      position: relative;

      &::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background-color: ${theme.colors.primary.main};
        transform: scaleX(0);
        transition: transform 0.2s ease-in-out;
        transform-origin: center;
        border-radius: 3px;
      }

      &:hover::after {
        transform: scaleX(0.6);
      }
    `}
  
  ${({ variant, orientation }) =>
    variant === "primary" &&
    orientation === "vertical" &&
    css`
      &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 4px;
        background-color: ${theme.colors.primary.main};
        border-radius: 0 ${theme.borderRadius.sm} ${theme.borderRadius.sm} 0;
        opacity: 0;
        transition: opacity ${theme.transitions.default};
      }
    `}
  
  ${({ collapsed }) =>
    collapsed &&
    css`
      justify-content: center;

      span {
        display: none;
      }
    `}
  
  &:hover {
    color: ${({ variant }) =>
    variant === "primary"
      ? theme.colors.primary.main
      : theme.colors.text.primary};
    background-color: ${({ orientation, variant }) =>
    orientation === "vertical" && variant === "primary"
      ? "rgba(0, 120, 212, 0.05)"
      : "transparent"};
  }
`;

const CollapsibleToggle = styled.button<{ collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  padding: ${theme.spacing.sm};
  align-self: flex-end;

  svg {
    transition: transform ${theme.transitions.default};
    transform: rotate(${({ collapsed }) => (collapsed ? "0deg" : "180deg")});
  }

  &:hover {
    color: ${theme.colors.primary.main};
  }
`;

const ChevronIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.5 4L5.5 8L10.5 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Navigation: React.FC<NavigationProps> = ({
  items,
  orientation = "horizontal",
  variant = "primary",
  showIcons = true,
  size = "md",
  className,
  collapsed = false,
  onToggleCollapse,
}) => {
  const location = useLocation();

  return (
    <NavContainer
      orientation={orientation}
      variant={variant}
      collapsed={collapsed}
      className={className}
    >
      {orientation === "vertical" && onToggleCollapse && (
        <CollapsibleToggle
          onClick={onToggleCollapse}
          collapsed={collapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <ChevronIcon />
        </CollapsibleToggle>
      )}

      {items.map((item) => (
        <StyledNavLink
          key={item.to}
          to={item.to}
          orientation={orientation}
          variant={variant}
          active={
            location.pathname === item.to ||
            location.pathname.startsWith(`${item.to}/`)
          }
          showIcons={showIcons}
          size={size}
          collapsed={collapsed}
        >
          {item.icon && showIcons && <span className="icon">{item.icon}</span>}
          <span>{item.label}</span>
        </StyledNavLink>
      ))}
    </NavContainer>
  );
};

export default Navigation;
