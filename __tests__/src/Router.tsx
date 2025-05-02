import React from "react";
import { Routes, Route } from "react-router-dom";
import App from "./App";
import GameToolsPage from "./pages/GameToolsPage";
import MatchupMakerPage from "./pages/MatchupMakerPage";
import CardDatabasePage from "./pages/CardDatabasePage";
import CardDetailPage from "./pages/CardDetailPage";

const Router: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/game-tools" element={<GameToolsPage />} />
      <Route path="/matchup-maker" element={<MatchupMakerPage />} />
      <Route path="/cards/database" element={<CardDatabasePage />} />
      <Route path="/cards/database/card/:id" element={<CardDetailPage />} />
      {/* Add other routes as needed */}
    </Routes>
  );
};

export default Router;
