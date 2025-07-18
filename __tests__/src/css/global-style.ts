import { createGlobalStyle } from "styled-components";

// Global styles
export const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${(props: any) => props.theme.background};
    color: ${(props: any) => props.theme.text};
    font-family: sans-serif;
    margin: 0;
    padding: 0;
  }
`;