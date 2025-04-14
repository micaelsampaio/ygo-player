import React from "react";
import { DeckAnalyticsType } from "../types";
import { Deck } from "../../../types";

interface HeaderProps {
  onExport: () => void;
  onExportPdf: () => void;
  deck?: Deck;
  analytics: DeckAnalyticsType;
  isEnhanced?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onExport,
  onExportPdf,
  deck,
  analytics,
  isEnhanced = false,
}) => (
  <div className="deck-analytics-header">
    <div className="header-title-section">
      {isEnhanced && (
        <span
          className="enhanced-badge"
          title="Enhanced analysis powered by YGO Analyzer"
        >
          Enhanced Analysis
        </span>
      )}
    </div>
    <div className="header-actions">
      <button
        className="export-pdf-btn"
        onClick={onExportPdf}
        title="Export analysis to PDF"
      >
        Export to PDF
      </button>
    </div>
  </div>
);

export default Header;
