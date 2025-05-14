import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import theme from "../styles/theme";
import AppLayout from "../components/Layout/AppLayout";
import { CardMouseHover } from "@/components/Cards/CardMouseHover";

const LandingPage: React.FC = () => {
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    // Check if the application is running on localhost
    const host = window.location.hostname;
    setIsLocalhost(host === "localhost" || host === "127.0.0.1");
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <AppLayout>
        <LandingContainer>
          <Hero>
            <HeroContent>
              <LogoContainer>
                <Logo>YGO Player</Logo>
                <Tagline>The ultimate Yu-Gi-Oh! companion app</Tagline>
              </LogoContainer>
              <HeroDescription>
                Build decks, duel opponents, analyze strategies, and master your
                game with our comprehensive Yu-Gi-Oh! toolset designed for
                duelists of all levels.
              </HeroDescription>
              <CallToActionContainer>
                <PrimaryButton as={Link} to="/deckbuilder">
                  Get Started
                </PrimaryButton>
                {isLocalhost && (
                  <SecondaryButton as={Link} to="/tests">
                    Developer View
                  </SecondaryButton>
                )}
              </CallToActionContainer>
            </HeroContent>
          </Hero>

          <FeaturesSection>
            <SectionTitle>Features</SectionTitle>
            {/* <Features>
              <FeatureCard>
                <FeatureIcon>🃏</FeatureIcon>
                <FeatureTitle>Deck Builder</FeatureTitle>
                <FeatureDescription>
                  Build and optimize your decks with our intuitive deck builder.
                  Access the entire Yu-Gi-Oh! card database and create winning
                  strategies.
                </FeatureDescription>
                <FeatureLink as={Link} to="/deckbuilder">
                  Build a Deck →
                </FeatureLink>
              </FeatureCard>

              <FeatureCard>
                <FeatureIcon>⚔️</FeatureIcon>
                <FeatureTitle>Dueling System</FeatureTitle>
                <FeatureDescription>
                  Battle opponents in real-time duels with our advanced dueling
                  system. Practice your strategies and improve your skills.
                </FeatureDescription>
                <FeatureLink as={Link} to="/duel/lobby">
                  Join a Duel →
                </FeatureLink>
              </FeatureCard>

              <FeatureCard>
                <FeatureIcon>📊</FeatureIcon>
                <FeatureTitle>Deck Analysis</FeatureTitle>
                <FeatureDescription>
                  Get insights on your deck's performance, discover combos, and
                  optimize your strategy with our advanced analytics tools.
                </FeatureDescription>
                <FeatureLink as={Link} to="/my/decks">
                  Analyze Decks →
                </FeatureLink>
              </FeatureCard>

              <FeatureCard>
                <FeatureIcon>🏆</FeatureIcon>
                <FeatureTitle>Collections</FeatureTitle>
                <FeatureDescription>
                  Organize your cards into collections, track your combos, and
                  keep a record of your duels and strategies.
                </FeatureDescription>
                <FeatureLink as={Link} to="/collections">
                  View Collections →
                </FeatureLink>
              </FeatureCard>
            </Features> */}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 gap-y-8 justify-center justify-items-center">

              <Link to={"/my/decks"}>
                <CardMouseHover.Wrapper
                  backgroundImage="/images/features-cards/my_decks.png"
                  gradientColor="from-black/50 to-blue-500/70"
                >
                  <CardMouseHover.Content>
                    <CardMouseHover.Icon iconUrl="/images/features-cards/ic_deck_analysis.png" />
                    <CardMouseHover.Title title="My Decks" />
                  </CardMouseHover.Content>
                </CardMouseHover.Wrapper>
              </Link>

              <Link to={"/pre-duel"}>
                <CardMouseHover.Wrapper
                  backgroundImage="/images/features-cards/deck_builder.png"
                  gradientColor="from-black/50 to-purple-500/70"
                >
                  <CardMouseHover.Content>
                    <CardMouseHover.Icon iconUrl="/images/features-cards/ic_deck_analysis.png" />
                    <CardMouseHover.Title title="Duel Practice" />
                  </CardMouseHover.Content>
                </CardMouseHover.Wrapper>
              </Link>
              <Link to={"/my/replays"}>
                <CardMouseHover.Wrapper
                  backgroundImage="/images/features-cards/replays.png"
                  gradientColor="from-black/50 to-yellow-500/70"
                >
                  <CardMouseHover.Content>
                    <CardMouseHover.Icon iconUrl="/images/features-cards/ic_deck_analysis.png" />
                    <CardMouseHover.Title title="My Replays" />
                  </CardMouseHover.Content>
                </CardMouseHover.Wrapper>
              </Link>
              <Link to={"/cards/database"}>
                <CardMouseHover.Wrapper
                  backgroundImage="/images/features-cards/cards_database.png"
                  gradientColor="from-black/50 to-pink-500/70"
                >
                  <CardMouseHover.Content>
                    <CardMouseHover.Icon iconUrl="/images/features-cards/ic_deck_analysis.png" />
                    <CardMouseHover.Title title="Cards Database" />
                  </CardMouseHover.Content>
                </CardMouseHover.Wrapper>
              </Link>

              <Link to={"/rulings"}>
                <CardMouseHover.Wrapper
                  backgroundImage="/images/features-cards/rulings.png"
                  gradientColor="from-black/50 to-violet-500/70"
                >
                  <CardMouseHover.Content>
                    <CardMouseHover.Icon iconUrl="/images/features-cards/ic_deck_analysis.png" />
                    <CardMouseHover.Title title="Ruling" />
                  </CardMouseHover.Content>
                </CardMouseHover.Wrapper>
              </Link>

              <Link to={"/my/cards/groups"}>
                <CardMouseHover.Wrapper
                  backgroundImage="/images/features-cards/matchup_maker.png"
                  gradientColor="from-black/50 to-green-500/70"
                >
                  <CardMouseHover.Content>
                    <CardMouseHover.Icon iconUrl="/images/features-cards/ic_deck_analysis.png" />
                    <CardMouseHover.Title title="Matchup Maker" />
                  </CardMouseHover.Content>
                </CardMouseHover.Wrapper>
              </Link>
            </div>
          </FeaturesSection>

          <ResourcesSection>
            <SectionTitle>Quick Access</SectionTitle>
            <ResourceGrid>
              <ResourceCard as={Link} to="/my/decks">
                <ResourceTitle>My Decks</ResourceTitle>
              </ResourceCard>
              <ResourceCard as={Link} to="/my/combos">
                <ResourceTitle>My Combos</ResourceTitle>
              </ResourceCard>
              <ResourceCard as={Link} to="/my/replays">
                <ResourceTitle>My Replays</ResourceTitle>
              </ResourceCard>
              <ResourceCard as={Link} to="/cards/database">
                <ResourceTitle>Card Database</ResourceTitle>
              </ResourceCard>
              <ResourceCard as={Link} to="/rulings">
                <ResourceTitle>Card Rulings</ResourceTitle>
              </ResourceCard>
              <ResourceCard as={Link} to="/my/cards/groups">
                <ResourceTitle>Card Groups</ResourceTitle>
              </ResourceCard>
            </ResourceGrid>
          </ResourcesSection>
        </LandingContainer>
      </AppLayout>
    </ThemeProvider>
  );
};

// Styled components
const LandingContainer = styled.div`
  color: ${(props) => props.theme.colors.text.primary};
  font-family: ${(props) => props.theme.typography.fontFamily};
`;

const Hero = styled.section`
  background: linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%);
  color: white;
  padding: 6rem 2rem;
  text-align: center;
`;

const HeroContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const LogoContainer = styled.div`
  margin-bottom: 2rem;
`;

const Logo = styled.h1`
  font-size: 3.5rem;
  font-weight: ${(props) => props.theme.typography.weight.bold};
  margin: 0;
  background: linear-gradient(90deg, #00b4db 0%, #0083b0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Tagline = styled.p`
  font-size: 1.5rem;
  margin-top: 0.5rem;
  color: #a0aec0;
`;

const HeroDescription = styled.p`
  font-size: 1.25rem;
  max-width: 800px;
  margin: 0 auto 2.5rem;
  line-height: 1.6;
`;

const CallToActionContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.a`
  display: inline-block;
  background-color: ${(props) => props.theme.colors.primary.main};
  color: white;
  font-weight: ${(props) => props.theme.typography.weight.medium};
  text-decoration: none;
  padding: 1rem 2rem;
  border-radius: ${(props) => props.theme.borderRadius.md};
  font-size: 1.125rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.colors.primary.dark};
    text-decoration: none;
    color: white;
  }
`;

const SecondaryButton = styled.a`
  display: inline-block;
  background-color: transparent;
  color: white;
  font-weight: ${(props) => props.theme.typography.weight.medium};
  text-decoration: none;
  padding: 1rem 2rem;
  border-radius: ${(props) => props.theme.borderRadius.md};
  font-size: 1.125rem;
  border: 1px solid white;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    text-decoration: none;
    color: white;
  }
`;

const FeaturesSection = styled.section`
  padding: 5rem 0rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 3rem;
  color: ${(props) => props.theme.colors.text.primary};
  font-weight: ${(props) => props.theme.typography.weight.semibold};
`;

const Features = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
`;

const FeatureCard = styled.div`
  background-color: ${(props) => props.theme.colors.background.paper};
  border-radius: ${(props) => props.theme.borderRadius.lg};
  padding: 2rem;
  box-shadow: ${(props) => props.theme.shadows.md};
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-5px);
    box-shadow: ${(props) => props.theme.shadows.lg};
  }
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1.5rem;
`;

const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: ${(props) => props.theme.typography.weight.semibold};
  margin: 0 0 1rem;
  color: ${(props) => props.theme.colors.text.primary};
`;

const FeatureDescription = styled.p`
  font-size: 1rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 1.5rem;
  flex: 1;
  line-height: 1.6;
`;

const FeatureLink = styled.a`
  color: ${(props) => props.theme.colors.primary.main};
  text-decoration: none;
  font-weight: ${(props) => props.theme.typography.weight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

const ResourcesSection = styled.section`
  background-color: ${(props) => props.theme.colors.background.card};
  padding: 5rem 2rem;
`;

const ResourceGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
`;

const ResourceCard = styled.a`
  background-color: ${(props) => props.theme.colors.background.paper};
  border-radius: ${(props) => props.theme.borderRadius.md};
  padding: 2rem;
  text-align: center;
  text-decoration: none;
  box-shadow: ${(props) => props.theme.shadows.sm};
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${(props) => props.theme.shadows.md};
    text-decoration: none;
  }
`;

const ResourceTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: ${(props) => props.theme.typography.weight.medium};
  margin: 0;
  color: ${(props) => props.theme.colors.text.primary};
`;

export default LandingPage;
