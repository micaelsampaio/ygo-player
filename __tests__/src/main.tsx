import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import debug from "debug";
import "./index.css";
import "ygo-player";
import Duel from "./Duel.tsx";
import { DownloadDeck } from "./DownloadDeck.tsx";
// Import our new pages
import LandingPage from "./pages/LandingPage";
import TestingPage from "./pages/TestingPage";
// Update this import to use the index.tsx file (or just the folder)
import DeckBuilder from "./components/DeckBuilder";
import { KaibaNetProvider } from "./hooks/useKaibaNet";
import { Logger } from "./utils/logger";
import { SpreadsheetBuilder } from "./spreadsheet/SpreadsheetBuilder.tsx";
import { CollectionsPage } from "./components/Collections/CollectionsPage.tsx";
import RulingsPage from "./components/Rulings/RulingsPage.tsx";
// Import other pages
import MyDecksPage from "./components/MyDecks/MyDecksPage.tsx";
import DeckDetailPage from "./components/MyDecks/DeckDetailPage.tsx";
import MyCombosPage from "./components/MyCombos/MyCombosPage.tsx";
import MyReplaysPage from "./components/MyReplays/MyReplaysPage.tsx";
import MyCardGroupsPage from "./components/Cards/MyCardGroupsPage.tsx";
import DuelLobbyPage from "./components/DuelLobby/DuelLobbyPage.tsx";
import CardDatabasePage from "./components/Cards/CardDatabasePage.tsx";
import CardDetailPage from "./pages/CardDetailPage.tsx"; // Import the new card detail page
import SettingsPage from "./components/Settings/SettingsPage.tsx";
import SharedDeckPage from "./components/MyDecks/SharedDeckPage";
import HelpPage from "./components/Help";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import MatchupMakerPage from "./pages/MatchupMakerPage";
import GameToolsPage from "./pages/GameToolsPage"; // Import our Game Tools page
import DeckConverterPage from "./pages/DeckConverterPage"; // Import the new page
import { PageViewerProvider } from "./utils/use-page-view.ts";
// Import new tool components
import { SpinnerWheel, TierList, Randomizer } from "./components/Tools";

debug.enable("ygo:*");
localStorage.setItem("debug", "ygo:*");

const logger = Logger.createLogger("Main");
logger.debug("Application starting...");

createRoot(document.getElementById("root")!).render(
  <KaibaNetProvider>
    <BrowserRouter>
      <PageViewerProvider />
      <Routes>
        {/* Use the new LandingPage as the home page */}
        <Route path="/" element={<LandingPage />} />
        {/* Move the old App to /tests */}
        <Route path="/tests" element={<TestingPage />} />
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
        {/* Help page route */}
        <Route path="/help" element={<HelpPage />} />
        {/* Contact page route */}
        <Route path="/contact" element={<ContactPage />} />
        {/* Privacy policy page route */}
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Routes for deck management */}
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

        {/* Routes for combos and replays */}
        <Route path="/my/combos" element={<MyCombosPage />} />
        <Route path="/my/replays" element={<MyReplaysPage />} />

        {/* Route for card groups */}
        <Route path="/my/cards/groups" element={<MyCardGroupsPage />} />

        {/* Updated route for duel lobby */}
        <Route path="/duel/lobby" element={<DuelLobbyPage />} />

        {/* Card Database page */}
        <Route path="/cards/database" element={<CardDatabasePage />} />

        {/* Card Detail page - Add this route */}
        <Route path="/cards/database/card/:id" element={<CardDetailPage />} />

        {/* Matchup Maker tool */}
        <Route path="/matchup-maker" element={<MatchupMakerPage />} />

        {/* Game Tools page */}
        <Route path="/game-tools" element={<GameToolsPage />} />

        {/* Dedicated Deck Converter page */}
        <Route path="/deck-converter" element={<DeckConverterPage />} />

        {/* New Tool Routes */}
        <Route path="/tools/spinner" element={<SpinnerWheel />} />
        <Route path="/tools/tierlist" element={<TierList />} />
        <Route path="/tools/randomizer" element={<Randomizer />} />
      </Routes>
    </BrowserRouter>
  </KaibaNetProvider>
);
