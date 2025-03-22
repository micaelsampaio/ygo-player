import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import debug from "debug";
import "./index.css";
import "../../dist";
import App from "./App.tsx";
import Duel from "./Duel.tsx";
import { DownloadDeck } from "./DownloadDeck.tsx";
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
      </Routes>
    </BrowserRouter>
  </KaibaNetProvider>
);
