import React from "react";
import { Routes, Route } from "react-router-dom";
import App from "./App";
import GameToolsPage from "./pages/GameToolsPage";
import MatchupMakerPage from "./pages/MatchupMakerPage";

const Router: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/game-tools" element={<GameToolsPage />} />
      <Route path="/matchup-maker" element={<MatchupMakerPage />} />
      {/* Add other routes as needed */}
    </Routes>
  );
};

export default Router;
