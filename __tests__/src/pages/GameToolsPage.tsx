import React from "react";
import { GameToolsPanel } from "../components/GameTools";
import AppLayout from "../components/Layout/AppLayout";

const GameToolsPage: React.FC = () => {
  return (
    <AppLayout>
      <div
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}
      >
        <GameToolsPanel
          players={[
            { name: "Player 1", initialPoints: 8000 },
            { name: "Player 2", initialPoints: 8000 },
          ]}
        />
      </div>
    </AppLayout>
  );
};

export default GameToolsPage;
