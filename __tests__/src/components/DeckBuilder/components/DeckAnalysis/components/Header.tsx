import React from "react";
import { DeckAnalyticsType } from "../types";
import { Deck } from "../../../types";

interface HeaderProps {
  onExport: () => void;
  onExportPdf: () => void;
  deck?: Deck;
  analytics: DeckAnalyticsType;
  isEnhanced?: boolean;
  onToggleEnhanced?: () => void;
  isLoading?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onExport,
  onExportPdf,
  deck,
  analytics,
  isEnhanced = false,
  onToggleEnhanced,
  isLoading = false,
}) => (
  <div className="deck-analytics-header">
    <div className="header-title-section">
      <div className="title-container">
        <div
          className={`enhanced-badge ${isEnhanced ? "enabled" : "disabled"} ${
            isLoading ? "loading" : ""
          }`}
          title={
            isLoading
              ? "Loading enhanced analysis..."
              : isEnhanced
              ? "Enhanced analysis enabled - Click to disable"
              : "Enhanced analysis disabled - Click to enable"
          }
          onClick={isLoading ? undefined : onToggleEnhanced}
          style={{ cursor: isLoading ? "wait" : "pointer" }}
        >
          <span className="badge-icon">
            {isLoading ? "⟳" : isEnhanced ? "✓" : "○"}
          </span>
          {isLoading ? "Loading Analysis..." : "Enhanced Analysis"}
        </div>
      </div>
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
