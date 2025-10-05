import { createContext, useContext, useState, type FC, type ReactNode } from "react";
import styled from "styled-components";
import { darkTheme } from "../css/theme";
import { Link, useSearchParams } from "react-router-dom";

// Layout
export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

export const Title = styled.h1`
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2rem;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const Card = styled.div`
  background: ${(props: any) => props.theme.cardBackground};
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 0 8px rgba(0,0,0,0.3);
`;

export const SectionTitle = styled.h2`
  font-size: 1.25rem;
  padding-top: 0px;
  margin-top: 0px;
  margin-bottom: 1rem;
`;

export const Button = styled.button<{ color?: string }>`
  background-color: ${(props: any) => props.color || props.theme.primary};
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    opacity: 0.9;
  }
  &:active {
    opacity: 0.8;
  }
`;

export const DeckList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const DeckItem = styled.li`
  display: flex;
  align-items: center;
  background: #1f1f1f;
  border: 1px solid ${(props: any) => props.theme.border};
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
`;

export const TextArea = styled.textarea`
  box-sizing: border-box;
  width: 100%;
  height: 400px;
  background: #111;
  color: ${(props: any) => props.theme.text};
  border: 1px solid ${(props: any) => props.theme.border};
  border-radius: 6px;
  padding: 1rem;
  font-family: monospace;
  font-size: 0.9rem;
  resize: none;

  &:focus {
    outline: 2px solid ${(props: any) => props.theme.accent};
  }
`;

export const InputSelect = styled.select`
  flex: 1;
  padding: 0.5rem;
  background-color: var(--ygo-surface, #1c1c1c);
  color: var(--ygo-text, #fff);
  border: 1px solid var(--ygo-border, #444);
  border-radius: 6px;
  font-size: 1rem;

  option {
    background-color: var(--ygo-surface, #1c1c1c);
    color: var(--ygo-text, #fff);
  }
`;


interface FlexBoxProps {
  direction?: 'row' | 'column';
  justify?: string;
  align?: string;
  wrap?: string;
  gap?: string;
  mobileDirection?: 'row' | 'column';
  mobileGap?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

interface FlexBoxProps {
  direction?: 'row' | 'column';
  justify?: string;
  align?: string;
  wrap?: string;
  gap?: string;
  gapX?: string;
  gapY?: string;
  mobileDirection?: 'row' | 'column';
  mobileGap?: string;
  mobileGapX?: string;
  mobileGapY?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const FlexBox = styled.div<FlexBoxProps>`
  display: flex;
  flex-direction: ${({ direction = 'row' }) => direction};
  justify-content: ${({ justify = 'flex-start' }) => justify};
  align-items: ${({ align = 'stretch' }) => align};
  flex-wrap: ${({ wrap = 'nowrap' }) => wrap};

  ${({ gap, gapX, gapY }) =>
    gap || gapX || gapY
      ? `
    column-gap: ${gapX || gap || '0'};
    row-gap: ${gapY || gap || '0'};
  `
      : ''}

  @media (max-width: 768px) {
    flex-direction: ${({ mobileDirection, direction = 'row' }) =>
    mobileDirection || direction};

    ${({ mobileGap, mobileGapX, mobileGapY, gap, gapX, gapY }) =>
    mobileGap || mobileGapX || mobileGapY
      ? `
      column-gap: ${mobileGapX || mobileGap || gapX || gap || '0'};
      row-gap: ${mobileGapY || mobileGap || gapY || gap || '0'};
    `
      : ''}
  }
`;


interface FlexItemProps {
  grow?: number;
  shrink?: number;
  basis?: string;
  alignSelf?: string;
  order?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const FlexItem = styled.div<FlexItemProps>`
  flex-grow: ${({ grow = 0 }) => grow};
  flex-shrink: ${({ shrink = 1 }) => shrink};
  flex-basis: ${({ basis = 'auto' }) => basis};
  align-self: ${({ alignSelf = 'auto' }) => alignSelf};
  order: ${({ order = 0 }) => order};
`;


interface TabContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabContext = createContext<TabContextValue | undefined>(undefined);

export const useTabContext = () => {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTabContext must be used within <TabProvider>");
  return ctx;
};

interface TabProviderProps {
  defaultTab: string;
  children: ReactNode;
}

export const TabProvider: FC<TabProviderProps> = ({ defaultTab, children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || defaultTab);

  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
    searchParams.set("tab", tab);
    setSearchParams(searchParams, { replace: true });
  };
  return (
    <TabContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      {children}
    </TabContext.Provider>
  );
};

interface TabListProps {
  children: ReactNode;
}

export const TabList: FC<TabListProps> = ({ children }) => {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: `2px solid ${darkTheme.border}`,
        marginBottom: "1rem",
      }}
    >
      {children}
    </div>
  );
};

interface TabProps {
  id: string;
  children: ReactNode;
  href?: string
}

export const Tab: FC<TabProps> = ({ id, href, children }) => {
  const { activeTab, setActiveTab } = useTabContext();
  const isActive = activeTab === id
  const Component = href ? Link : "button"

  return (
    <TabStyled>
      <Component
        to={href || ""}
        onClick={href ? undefined : () => setActiveTab(id)}
        style={{
          flexShrink: 0,
          padding: "8px 16px",
          fontSize: "14px",
          cursor: "pointer",
          border: "none",
          background: "none",
          color: isActive ? darkTheme.text : darkTheme.textMuted,
          borderBottom: `3px solid ${isActive ? darkTheme.accent : "transparent"
            }`,
          transition: "all 0.2s ease",
        }}
      >
        {children}
      </Component>
    </TabStyled>
  );
};
const TabStyled = styled.div`
  a {text-decoration: none; color: ${darkTheme.textMuted};}
`
interface TabContentProps {
  id: string;
  children: ReactNode;
}

export const TabContent: FC<TabContentProps> = ({ id, children }) => {
  const { activeTab } = useTabContext();
  if (activeTab !== id) return null;
  return <div style={{ flexGrow: 1, paddingTop: "0.5rem" }}>{children}</div>;
};