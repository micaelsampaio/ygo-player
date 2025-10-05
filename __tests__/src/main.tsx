import { createRoot } from 'react-dom/client'
import Router from './Router.tsx'
import { ThemeProvider } from 'styled-components'
import { darkTheme } from './css/theme.ts'
import { GlobalStyle } from './css/global-style.ts'
import type { YGOSocketClient } from "./scripts/ygo-client";
import './index.css'

declare global {
  interface Window {
    ygoSocketClient?: YGOSocketClient;
  }
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={darkTheme}>
    <GlobalStyle />
    <Router />
  </ThemeProvider>
)
