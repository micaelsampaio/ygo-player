import React from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import App from "./App";
import DuelPage from "./DuelPage";
import { ThreeTestsPage } from "./ThreeTests";

const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/duel" element={<DuelPage />} />
        <Route path="/three/test" element={<ThreeTestsPage />} />
        {/* <Route path="/game-tools" element={<GameToolsPage />} />
      <Route path="/matchup-maker" element={<MatchupMakerPage />} />
      <Route path="/cards/database" element={<CardDatabasePage />} />
      <Route path="/cards/database/card/:id" element={<CardDetailPage />} /> */}
        {/* Add other routes as needed */}
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
