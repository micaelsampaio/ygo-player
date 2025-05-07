import React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import theme from "../../styles/theme";
import Navigation from "../UI/Navigation";
import Layout from "../UI/Layout";

const { colors, typography, spacing } = theme;

interface AppLayoutProps {
  children: React.ReactNode;
}

const Logo = styled(Link)`
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
`;

const LogoText = styled.span`
  color: ${colors.primary.main};
  font-size: ${typography.size.lg};
  font-weight: ${typography.weight.bold};
  font-family: ${typography.fontFamily};
`;

const LogoImage = styled.div`
  background-image: url("${import.meta.env.VITE_YGO_CDN_URL}/images/logo_dark.png");
  background-size: contain;
  background-position: left center;
  background-repeat: no-repeat;
  width: 100px;
  height: 40px;
`;
const LogoImageFooter = styled.div`
  background-image: url("${import.meta.env.VITE_YGO_CDN_URL}/images/logo_dark.png");
  background-size: contain;
  background-position: left center;
  background-repeat: no-repeat;
  width: 150px;
  height: 80px;
`;

const UserControlsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.md};
`;

const SettingsIconLink = styled(Link) <{ active?: boolean }>`
  color: ${colors.text.primary};
  padding: ${spacing.xs};
  border-radius: 50%;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;

  &:hover {
    background-color: ${colors.background.card};
    color: ${theme.colors.primary.main};
  }

  & .icon {
    transition: transform 0.25s ease-in-out, color 0.25s ease-in-out;
  }

  &:hover .icon {
    transform: rotate(180deg);
  }

  ${props => props.active && css`
    & .icon {
      color: ${theme.colors.primary.main};
  }
  `}
`;

const HeaderContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FooterContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const FooterContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.lg};
`;

const FooterTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${spacing.lg};
  }
`;

const FooterLogoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm};
`;

const FooterTagline = styled.span`
  color: ${colors.text.secondary};
  font-size: ${typography.size.sm};
`;

const FooterLinks = styled.div`
  display: flex;
  gap: ${spacing.xl};
  justify-content: flex-end;
  margin-left: auto;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const FooterSection = styled.div`
  min-width: 120px;
`;

const FooterSectionTitle = styled.h4`
  color: ${colors.text.primary};
  margin-top: 0;
  margin-bottom: ${spacing.sm};
  font-size: ${typography.size.md};
  font-weight: ${typography.weight.semibold};
`;

const FooterLinksList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};
`;

const FooterLinkItem = styled.li``;

const FooterLink = styled(Link)`
  color: ${colors.text.secondary};
  text-decoration: none;
  font-size: ${typography.size.sm};
  transition: color 0.2s ease;

  &:hover {
    color: ${colors.primary.main};
  }
`;

const ExternalLink = styled.a`
  color: ${colors.text.secondary};
  text-decoration: none;
  font-size: ${typography.size.sm};
  transition: color 0.2s ease;

  &:hover {
    color: ${colors.primary.main};
  }
`;

const FooterBottom = styled.div`
  margin-top: ${spacing.lg};
  padding-top: ${spacing.md};
  border-top: 1px solid ${colors.border.light};
  text-align: center;
`;

const Copyright = styled.p`
  color: ${colors.text.secondary};
  font-size: ${typography.size.sm};
  margin: 0;
`;

const globalWindow = (window as any);

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  // Navigation items - organized into primary categories without tool links in header
  const navItems = [
    { to: "/duel/lobby", label: "Duel Lobby" },
    { to: "/my/decks", label: "My Decks" },
    { to: "/deckbuilder", label: "Deck Builder" },
    { to: "/matchup-maker", label: "Matchup Maker" },
    { to: "/cards/database", label: "Card Database" },
    { to: "/rulings", label: "Rulings" },
    { to: "/contact", label: "Contact" },
  ];

  // Header content
  const headerContent = (
    <HeaderContainer>
      <Logo to="/">
        {/* <LogoText>YGO101</LogoText> */}
        <LogoImage></LogoImage>
      </Logo>

      <Navigation
        items={navItems}
        size="sm"
        orientation="horizontal"
        variant="secondary"
      />

      <UserControlsContainer>
        <UserData />
        <SettingsIconLink active={location.pathname.includes(`/settings`)} to="/settings" title="Settings">
          <span className="icon">
            <i className="fa fa-cog" aria-hidden="true"></i>
          </span>
        </SettingsIconLink>
      </UserControlsContainer>
    </HeaderContainer>
  );

  // Footer content
  const footerContent = (
    <FooterContainer>
      <FooterContent>
        <FooterTop>
          <FooterLogoSection>
            {/* <LogoText>YGO101</LogoText> */}
            <LogoImageFooter />
            <FooterTagline>The ultimate Yu-Gi-Oh! companion app</FooterTagline>
          </FooterLogoSection>

          <FooterLinks>
            <FooterSection>
              <FooterSectionTitle>Tools</FooterSectionTitle>
              <FooterLinksList>
                <FooterLinkItem>
                  <FooterLink to="/deckbuilder">Deck Builder</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/matchup-maker">Matchup Maker</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/duel">Duel Simulator</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/tools/spinner">Spinner Wheel</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/tools/tierlist">Tier List Maker</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/tools/randomizer">Dice & Coin</FooterLink>
                </FooterLinkItem>
              </FooterLinksList>
            </FooterSection>

            <FooterSection>
              <FooterSectionTitle>Collections</FooterSectionTitle>
              <FooterLinksList>
                <FooterLinkItem>
                  <FooterLink to="/my/decks">My Decks</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/my/combos">My Combos</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/my/replays">My Replays</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/my/cards/groups">My Card Groups</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/cards/database">Card Database</FooterLink>
                </FooterLinkItem>
              </FooterLinksList>
            </FooterSection>

            <FooterSection>
              <FooterSectionTitle>Resources</FooterSectionTitle>
              <FooterLinksList>
                <FooterLinkItem>
                  <FooterLink to="/rulings">Rulings</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/help">Help Center</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/contact">Contact</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <FooterLink to="/privacy">Privacy Policy</FooterLink>
                </FooterLinkItem>
                <FooterLinkItem>
                  <ExternalLink
                    href="https://x.com/ygo101com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Twitter
                  </ExternalLink>
                </FooterLinkItem>
              </FooterLinksList>
            </FooterSection>
          </FooterLinks>
        </FooterTop>

        <FooterBottom>
          <Copyright>
            © {new Date().getFullYear()} YGO101. All rights reserved.
          </Copyright>
        </FooterBottom>
      </FooterContent>
    </FooterContainer>
  );

  return (
    <Layout
      header={headerContent}
      footer={footerContent}
      contentMaxWidth="1800px"
    >
      {children}
    </Layout>
  );
};

function UserData() {

  return null;
  // TODO
  // const tokenData = globalWindow.ygo101_token_data;

  // if (tokenData) {
  //   return <div>
  //     {tokenData.name}
  //   </div>
  // }

  // return <div>
  //   <a href={`${import.meta.env.VITE_API_BASE_URL}/auth/login`}>Login</a>
  // </div>
}

export default AppLayout;
