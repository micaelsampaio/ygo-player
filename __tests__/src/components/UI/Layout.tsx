import React from "react";
import styled from "styled-components";
import theme from "../../styles/theme";

interface LayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  contentMaxWidth?: string;
}

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${theme.colors.background.default};
`;

const MainContent = styled.main<{ hasSidebar: boolean }>`
  display: flex;
  flex: 1;
  width: 100%;
`;

const ContentWrapper = styled.div<{ maxWidth?: string }>`
  flex: 1;
  padding: ${theme.spacing.lg};
  max-width: ${(props) => props.maxWidth || "none"};
  margin: 0 auto;
  width: 100%;

  @media (max-width: 768px) {
    padding: ${theme.spacing.md};
  }
`;

const SidebarWrapper = styled.aside`
  width: 280px;
  flex-shrink: 0;
  background-color: ${theme.colors.background.paper};
  border-right: 1px solid ${theme.colors.border.light};
  box-shadow: ${theme.shadows.sm};
  padding: ${theme.spacing.md};
  overflow-y: auto;
  height: calc(100vh - 60px);
  position: sticky;
  top: 60px; /* This should match the header height */

  @media (max-width: 768px) {
    position: fixed;
    transform: translateX(-100%);
    z-index: 100;
    transition: transform 0.3s ease;

    &.active {
      transform: translateX(0);
    }
  }
`;

const HeaderWrapper = styled.header`
  height: 60px;
  background-color: ${theme.colors.background.paper};
  border-bottom: 1px solid ${theme.colors.border.light};
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: ${theme.shadows.sm};
  display: flex;
  align-items: center;
  padding: 0 ${theme.spacing.lg};

  @media (max-width: 768px) {
    padding: 0 ${theme.spacing.md};
  }
`;

const FooterWrapper = styled.footer`
  background-color: ${theme.colors.background.paper};
  border-top: 1px solid ${theme.colors.border.light};
  padding: ${theme.spacing.lg} ${theme.spacing.lg};

  @media (max-width: 768px) {
    padding: ${theme.spacing.md};
  }
`;

export const Layout: React.FC<LayoutProps> = ({
  children,
  sidebar,
  header,
  footer,
  contentMaxWidth,
}) => {
  return (
    <LayoutContainer>
      {header && <HeaderWrapper>{header}</HeaderWrapper>}

      <MainContent hasSidebar={!!sidebar}>
        {sidebar && <SidebarWrapper>{sidebar}</SidebarWrapper>}
        <ContentWrapper maxWidth={contentMaxWidth}>{children}</ContentWrapper>
      </MainContent>

      {footer && <FooterWrapper>{footer}</FooterWrapper>}
    </LayoutContainer>
  );
};

export default Layout;
