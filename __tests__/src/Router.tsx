import React from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import App from "./App";
import DuelPage from "./DuelPage";
import LobbyPage from "./LobbyPage";
import { ThreeTestsPage } from "./ThreeTests";

const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/duel" element={<DuelPage />} />
        <Route path="/duel/:lobbyId" element={<DuelPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/three/test" element={<ThreeTestsPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
