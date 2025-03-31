import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import debug from "debug";
import "./index.css";
import "ygo-player";
import App from "./App.tsx";
import Duel from "./Duel.tsx";
import { DownloadDeck } from "./DownloadDeck.tsx";
// Update this import to use the index.tsx file (or just the folder)
import DeckBuilder from "./components/DeckBuilder";
import { KaibaNetProvider } from "./hooks/useKaibaNet";
import { Logger } from "./utils/logger";

debug.enable("ygo:*");
localStorage.setItem("debug", "ygo:*");

const logger = Logger.createLogger("Main");
logger.debug("Application starting...");

createRoot(document.getElementById("root")!).render(
  <KaibaNetProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/duel" element={<Duel />} />
        <Route path="/duel/:roomId" element={<Duel />} />
        <Route path="/deck" element={<DownloadDeck />} />
        <Route path="/deckbuilder" element={<DeckBuilder />} />
      </Routes>
    </BrowserRouter>
  </KaibaNetProvider>
);
