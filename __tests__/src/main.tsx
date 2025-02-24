import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import "../../dist";
import App from "./App.tsx";
import Duel from "./Duel.tsx";
import { DownloadDeck } from "./DownloadDeck.tsx";
import { KaibaNetProvider } from "./useKaibaNet";

createRoot(document.getElementById("root")!).render(
  <KaibaNetProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/duel" element={<Duel />} />
        <Route path="/deck" element={<DownloadDeck />} />
      </Routes>
    </BrowserRouter>
  </KaibaNetProvider>
);
