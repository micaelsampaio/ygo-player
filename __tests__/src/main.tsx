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
import { SpreadsheetBuilder } from "./spreadsheet/SpreadsheetBuilder.tsx";
import { CollectionsPage } from "./components/Collections/CollectionsPage.tsx";
import RulingsPage from "./components/Rulings/RulingsPage.tsx";
// Import new pages
import MyDecksPage from "./components/MyDecks/MyDecksPage.tsx";
import DeckDetailPage from "./components/MyDecks/DeckDetailPage.tsx";
import MyCombosPage from "./components/MyCombos/MyCombosPage.tsx";
import MyReplaysPage from "./components/MyReplays/MyReplaysPage.tsx";
// Import the new MyCardGroupsPage component
import MyCardGroupsPage from "./components/Cards/MyCardGroupsPage.tsx";
// Import our DuelLobbyPage
import DuelLobbyPage from "./components/DuelLobby/DuelLobbyPage.tsx";
// Import for new Card Database page
import CardDatabasePage from "./components/Cards/CardDatabasePage.tsx";
// Import Settings page
import SettingsPage from "./components/Settings/SettingsPage.tsx";
// Import SharedDeckPage component
import SharedDeckPage from "./components/MyDecks/SharedDeckPage";

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
        <Route path="/spreadsheet" element={<SpreadsheetBuilder />} />
        <Route
          path="/spreadsheet/collection/:collectionId/:comboId"
          element={<SpreadsheetBuilder />}
        />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route
          path="/collections/:collectionId"
          element={<CollectionsPage />}
        />
        <Route path="/rulings" element={<RulingsPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* New routes for deck management */}
        <Route path="/my/decks" element={<MyDecksPage />} />
        
        {/* Route for shared decks - must be defined BEFORE the generic deck route */}
        <Route path="/my/decks/public/:deckName" element={<SharedDeckPage />} />
        
        {/* Individual deck routes */}
        <Route path="/my/decks/:deckId" element={<DeckDetailPage />} />
        <Route
          path="/my/decks/:deckId/collections"
          element={<DeckDetailPage />}
        />
        <Route path="/my/decks/:deckId/combos" element={<DeckDetailPage />} />
        <Route path="/my/decks/:deckId/replays" element={<DeckDetailPage />} />

        {/* New routes for combos and replays */}
        <Route path="/my/combos" element={<MyCombosPage />} />
        <Route path="/my/replays" element={<MyReplaysPage />} />

        {/* New route for card groups */}
        <Route path="/my/cards/groups" element={<MyCardGroupsPage />} />

        {/* Updated route for duel lobby */}
        <Route path="/duel/lobby" element={<DuelLobbyPage />} />

        {/* Add Card Database page */}
        <Route path="/cards/database" element={<CardDatabasePage />} />
      </Routes>
    </BrowserRouter>
  </KaibaNetProvider>
);
