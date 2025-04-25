import React from "react";
import styled from "styled-components";
import { ThemeProvider } from "styled-components";
import GlobalStyles from "../styles/GlobalStyles";
import theme from "../styles/theme";
import { App } from "../App";

const TestingPage: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <TestingContainer>
        <TestingHeader>
          <h1>YGO Player - Developer Testing View</h1>
          <p>This page contains the original app layout for testing purposes</p>
        </TestingHeader>
        <TestingContent>
          <App />
        </TestingContent>
      </TestingContainer>
    </ThemeProvider>
  );
};

const TestingContainer = styled.div`
  padding: 1rem;
  background-color: ${({ theme }) => theme.colors.background.default};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
`;

const TestingHeader = styled.header`
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 1rem;
  margin-bottom: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};

  h1 {
    margin: 0;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    color: ${({ theme }) => theme.colors.primary.main};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const TestingContent = styled.div`
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 1rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

export default TestingPage;
