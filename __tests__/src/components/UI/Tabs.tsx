import React, { useState } from "react";
import styled from "styled-components";
import theme from "../../styles/theme";

// Tab component props
interface TabProps {
  label: string;
  value: string;
}

// TabList props
interface TabListProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

// Individual Tab component
export const Tab: React.FC<TabProps> = ({ label, value }) => {
  // The Tab component itself doesn't render anything
  // It's just a data container that the parent Tabs component uses
  return null;
};

// Tabs component
const Tabs: React.FC<TabListProps> = ({
  value,
  onChange,
  children,
  className,
}) => {
  // Extract tab values and labels from children
  const tabs = React.Children.toArray(children)
    .filter((child) => React.isValidElement(child) && child.type === Tab)
    .map((child) => {
      const tabChild = child as React.ReactElement<TabProps>;
      return {
        value: tabChild.props.value,
        label: tabChild.props.label,
      };
    });

  return (
    <TabsContainer className={className}>
      {tabs.map((tab) => (
        <TabButton
          key={tab.value}
          $active={value === tab.value}
          onClick={() => onChange(tab.value)}
          type="button"
        >
          {tab.label}
        </TabButton>
      ))}
    </TabsContainer>
  );
};

// Styled components
const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.border.default};
  margin-bottom: ${theme.spacing.md};
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: none;
  border: none;
  border-bottom: 3px solid
    ${(props) => (props.$active ? theme.colors.primary.main : "transparent")};
  color: ${(props) =>
    props.$active ? theme.colors.primary.main : theme.colors.text.secondary};
  font-weight: ${(props) =>
    props.$active
      ? theme.typography.weight.semibold
      : theme.typography.weight.medium};
  cursor: pointer;
  transition: all ${theme.transitions.default};
  white-space: nowrap;

  &:hover {
    color: ${(props) =>
      props.$active ? theme.colors.primary.dark : theme.colors.text.primary};
  }
`;

export default Tabs;
