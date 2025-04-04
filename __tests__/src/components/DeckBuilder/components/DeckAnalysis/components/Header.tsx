import React from "react";

interface HeaderProps {
  onExport: () => void;
}

const Header: React.FC<HeaderProps> = ({ onExport }) => {
  return (
    <div className="deck-analytics-header">
      <div className="header-title-section">
        <h2>Deck Analysis</h2>
        <button
          className="export-btn"
          onClick={onExport}
          title="Export analysis data"
        >
          📊 Export
        </button>
      </div>
    </div>
  );
};

export default Header;
