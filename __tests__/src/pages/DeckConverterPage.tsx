import React from "react";
import { DeckConverter } from "../components/GameTools";
import AppLayout from "../components/Layout/AppLayout";
import styled from "styled-components";
import theme from "../styles/theme";

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Title = styled.h1`
  font-size: ${theme.typography.size["3xl"]};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
`;

const Description = styled.p`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.xl};
  text-align: center;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const DeckConverterPage: React.FC = () => {
  return (
    <AppLayout>
      <PageContainer>
        <Title>Deck Format Converter</Title>
        <Description>
          Convert your Yu-Gi-Oh decks between readable text list format and YDK
          files. Simply paste your deck list or YDK content below and convert it
          to the desired format.
        </Description>
        <DeckConverter size="large" />
      </PageContainer>
    </AppLayout>
  );
};

export default DeckConverterPage;
