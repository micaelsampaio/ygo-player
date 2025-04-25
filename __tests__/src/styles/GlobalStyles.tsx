import { createGlobalStyle } from "styled-components";
import theme from "./theme";

const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html, body {
    height: 100%;
  }

  body {
    font-family: ${theme.typography.fontFamily};
    font-size: ${theme.typography.size.base};
    line-height: ${theme.typography.lineHeight.normal};
    color: ${theme.colors.text.primary};
    background-color: ${theme.colors.background.default};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  a {
    color: ${theme.colors.primary.main};
    text-decoration: none;
    transition: color ${theme.transitions.default};
    
    &:hover {
      color: ${theme.colors.primary.dark};
      text-decoration: underline;
    }
  }
  
  h1, h2, h3, h4, h5, h6 {
    margin-bottom: ${theme.spacing.md};
    font-weight: ${theme.typography.weight.semibold};
    line-height: ${theme.typography.lineHeight.tight};
    color: ${theme.colors.text.primary};
  }
  
  h1 {
    font-size: ${theme.typography.size["3xl"]};
  }
  
  h2 {
    font-size: ${theme.typography.size["2xl"]};
  }
  
  h3 {
    font-size: ${theme.typography.size.xl};
  }
  
  h4 {
    font-size: ${theme.typography.size.lg};
  }
  
  h5 {
    font-size: ${theme.typography.size.md};
  }
  
  h6 {
    font-size: ${theme.typography.size.base};
  }
  
  p {
    margin-bottom: ${theme.spacing.md};
  }

  button {
    cursor: pointer;
  }

  input, select, textarea, button {
    font-family: inherit;
    font-size: inherit;
  }
  
  /* New YGO Variables - to replace existing CSS variables */
  :root {
    --ygo-primary-color: ${theme.colors.primary.main};
    --ygo-primary-color-light: ${theme.colors.primary.light};
    --ygo-primary-color-dark: ${theme.colors.primary.dark};

    --ygo-secondary-color: ${theme.colors.secondary.main};
    
    --ygo-success-color: ${theme.colors.success.main};
    --ygo-error-color: ${theme.colors.error.main};
    --ygo-warning-color: ${theme.colors.warning.main};
    
    --ygo-bg-color: ${theme.colors.background.default};
    --ygo-bg-card-color: ${theme.colors.background.paper};
    --ygo-bg-alt-color: ${theme.colors.background.card};
    --ygo-bg-dark-color: ${theme.colors.background.dark};
    
    --ygo-text-color: ${theme.colors.text.primary};
    --ygo-text-secondary-color: ${theme.colors.text.secondary};
    --ygo-text-light-color: ${theme.colors.text.inverse};
    
    --ygo-border-color: ${theme.colors.border.default};
    --ygo-border-light-color: ${theme.colors.border.light};
    
    --ygo-action-color: ${theme.colors.action.active};
    --ygo-action-color-dark: #0056b3;
    --ygo-action-hover-color: ${theme.colors.action.hover};
    
    --ygo-font-family: ${theme.typography.fontFamily};
    --ygo-font-xs: ${theme.typography.size.xs};
    --ygo-font-sm: ${theme.typography.size.sm};
    --ygo-font-base: ${theme.typography.size.base};
    --ygo-font-md: ${theme.typography.size.md};
    --ygo-font-lg: ${theme.typography.size.lg};
    --ygo-font-xl: ${theme.typography.size.xl};
    --ygo-font-2xl: ${theme.typography.size["2xl"]};
    --ygo-font-3xl: ${theme.typography.size["3xl"]};
    --ygo-font-4xl: ${theme.typography.size["4xl"]};
    
    --ygo-space-xs: ${theme.spacing.xs};
    --ygo-space-sm: ${theme.spacing.sm};
    --ygo-space-md: ${theme.spacing.md};
    --ygo-space-lg: ${theme.spacing.lg};
    --ygo-space-xl: ${theme.spacing.xl};
    
    --ygo-border-radius-small: ${theme.borderRadius.sm};
    --ygo-border-radius-medium: ${theme.borderRadius.md};
    --ygo-border-radius-large: ${theme.borderRadius.lg};
    
    --ygo-shadow-sm: ${theme.shadows.sm};
    --ygo-shadow-md: ${theme.shadows.md};
    --ygo-shadow-lg: ${theme.shadows.lg};
    
    /* Card dimensions for deck builder */
    --card-width: 80px;
    --card-height: 116px;
    --card-border-radius: 4px;
  }
`;

export default GlobalStyles;
