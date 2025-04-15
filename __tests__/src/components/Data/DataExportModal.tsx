import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import styled from "styled-components";
import { QRCodeScanner } from "./QRCodeScanner";

const FloatingButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #2196f3;
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: transform 0.2s;
  &:hover {
    transform: scale(1.1);
  }
`;

const Modal = styled.div`
  position: fixed;
  bottom: 90px;
  left: 20px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  width: 300px;
`;

const Button = styled.button`
  padding: 12px 20px;
  margin: 5px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background-color: #2196f3;
  color: white;
  width: 100%;
  font-size: 14px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;

  &:hover {
    background-color: #1976d2;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const QRContainer = styled.div`
  margin-top: 16px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

interface Props {
  onExport: (method: "file" | "qr") => void;
  onImport: (file: File) => void;
  onImportQR: (data: string) => void;
}

export function DataExportModal({ onExport, onImport, onImportQR }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = "";
  };

  const handleExportQR = async () => {
    try {
      const data = await onExport("qr");
      if (data) {
        setQrData(data);
        setShowQR(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate QR code");
    }
  };

  const handleScanComplete = (data: string) => {
    onImportQR(data);
    setShowScanner(false);
  };

  return (
    <>
      <FloatingButton
        onClick={() => setIsOpen(!isOpen)}
        title="Import/Export Data"
      >
        {isOpen ? "×" : "↔"}
      </FloatingButton>

      {isOpen && (
        <Modal>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
            Import/Export Data
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Button onClick={() => onExport("file")}>
              <DownloadIcon /> Export to File
            </Button>
            <Button onClick={handleExportQR}>
              <QRIcon /> Share via QR Code
            </Button>
            <Button
              onClick={() => document.getElementById("import-data")?.click()}
            >
              <UploadIcon /> Import from File
            </Button>
            <Button onClick={() => setShowScanner(true)}>
              <ScanIcon /> Scan QR Code
            </Button>
          </div>

          <input
            type="file"
            id="import-data"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />

          {showQR && qrData && (
            <QRContainer>
              <QRCodeSVG value={qrData} size={256} />
              <Button onClick={() => setShowQR(false)}>Close</Button>
            </QRContainer>
          )}
        </Modal>
      )}

      {showScanner && (
        <QRCodeScanner
          onScan={handleScanComplete}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}

// Simple SVG icons
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
  </svg>
);

const QRIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v2h2v-2zm-2-2h2v-2h-2v2zm2 6h-2v2h2v-2zm2 2h2v-2h-2v2zm2-6h-2v2h2v-2z" />
  </svg>
);

const ScanIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM22 7h-2V4h-3V2h5v5zm0 15v-5h-2v3h-3v2h5zM2 22h5v-2H4v-3H2v5zM2 2v5h2V4h3V2H2z" />
  </svg>
);
