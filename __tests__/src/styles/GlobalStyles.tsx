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
    font-family: inherit;
    font-size: inherit;
    border: none;
    border-radius: ${theme.borderRadius.md};
    transition: all ${theme.transitions.default};
  }

  /* Global button styles */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 12px;
    font-weight: ${theme.typography.weight.medium};
    border-radius: ${theme.borderRadius.sm};
    cursor: pointer;
    transition: all ${theme.transitions.default};
    text-decoration: none;
    border: 1px solid transparent;
    font-size: ${theme.typography.size.sm};
  }

  /* Button sizes */
  .btn-sm {
    padding: 4px 8px;
    font-size: ${theme.typography.size.xs};
    border-radius: ${theme.borderRadius.sm};
  }

  .btn-md {
    padding: 6px 12px;
    font-size: ${theme.typography.size.sm};
  }

  .btn-lg {
    padding: ${theme.spacing.xs} ${theme.spacing.md};
    font-size: ${theme.typography.size.base};
    border-radius: ${theme.borderRadius.md};
  }

  /* Button variants */
  .btn-primary {
    background-color: ${theme.colors.primary.main};
    color: ${theme.colors.text.inverse};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.primary.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  }

  .btn-secondary {
    background-color: ${theme.colors.secondary.main};
    color: ${theme.colors.text.inverse};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.secondary.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  }

  .btn-tertiary {
    background-color: transparent;
    color: ${theme.colors.primary.main};
    border: 1px solid ${theme.colors.border.default};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.background.card};
      border-color: ${theme.colors.primary.main};
      transform: translateY(-2px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }

  .btn-danger {
    background-color: ${theme.colors.error.main};
    color: ${theme.colors.text.inverse};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.error.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  }

  .btn-success {
    background-color: ${theme.colors.success.main};
    color: ${theme.colors.text.inverse};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.success.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  }

  .btn-warning {
    background-color: ${theme.colors.warning.main};
    color: ${theme.colors.text.primary};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.warning.dark};
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.md};
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${theme.shadows.sm};
    }
  }

  /* Button states */
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  .btn-full-width {
    width: 100%;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing.xs};
  }

  /* For icon-only buttons */
  .btn-icon-only {
    padding: ${theme.spacing.xs};
    width: 36px;
    height: 36px;
    
    &.btn-sm {
      padding: ${theme.spacing.xs};
      width: 28px;
      height: 28px;
    }
    
    &.btn-lg {
      padding: ${theme.spacing.sm};
      width: 44px;
      height: 44px;
    }
  }

  /* YGO legacy class compatibility */
  .ygo-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    font-weight: ${theme.typography.weight.medium};
    border-radius: ${theme.borderRadius.md};
    cursor: pointer;
    transition: all ${theme.transitions.default};
    border: none;
  }

  .ygo-btn-primary {
    background-color: var(--ygo-primary-color);
    color: var(--ygo-text-light-color);
    
    &:hover:not(:disabled) {
      background-color: var(--ygo-primary-color-dark);
    }
  }

  .ygo-btn-secondary {
    background-color: var(--ygo-border-color);
    color: var(--ygo-text-color);
    
    &:hover:not(:disabled) {
      background-color: var(--ygo-action-color-dark);
    }
  }

  .ygo-btn-action {
    background-color: var(--ygo-border-color);
    color: var(--ygo-text-color);
    
    &:hover:not(:disabled) {
      background-color: var(--ygo-action-color-dark);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  input, select, textarea {
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
