import React, { useState } from "react";
import { Deck } from "../../../types";
import { exportDeckAnalysisToPdf } from "../../../utils/pdfExport";

interface HeaderProps {
  onExport: () => void;
  onExportPdf?: () => void; // New prop to handle PDF export from parent
  deck?: Deck;
  analytics?: any;
}

const Header: React.FC<HeaderProps> = ({
  onExport,
  onExportPdf,
  deck,
  analytics,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handlePdfExport = async () => {
    if (!deck || !analytics) return;

    setIsExporting(true);
    try {
      // Use the parent's export function if provided
      if (onExportPdf) {
        onExportPdf();
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="deck-analytics-header">
      <div className="header-title-section">
        <h2>Deck Analysis</h2>
        <div className="export-buttons" style={{ marginLeft: "auto" }}>
          <button
            className="export-pdf-btn"
            onClick={handlePdfExport}
            disabled={isExporting || !deck}
            title="Export complete analysis as PDF report"
          >
            {isExporting ? "Generating..." : "📄 Export PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
