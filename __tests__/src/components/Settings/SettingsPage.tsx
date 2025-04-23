import React, { useState } from "react";
import styled from "styled-components";
import theme from "../../styles/theme";
import AppLayout from "../Layout/AppLayout";
import { Card } from "../UI";
import { ConnectionSwitcher } from "../ConnectionSwitcher";
import { DataExportModal } from "../Data/DataExportModal";
import { exportAllData, importAllData } from "../../utils/dataExport";
import { QRCodeSVG } from "qrcode.react";
import { QRCodeScanner } from "../Data/QRCodeScanner";

const SettingsPage: React.FC = () => {
  const [showQR, setShowQR] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrData, setQrData] = useState<string>("");

  const handleExport = async (method: "file" | "qr") => {
    try {
      if (method === "qr") {
        const data = await exportAllData("qr");
        if (data) {
          setQrData(data);
          setShowQR(true);
        }
        return data; // Return the data to be used by the modal
      } else {
        await exportAllData("file");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleImport = async (file: File) => {
    if (!file) return;

    try {
      const result = await importAllData(file);
      alert(
        `Successfully imported ${result.decksCount} decks and ${result.replaysCount} replays`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import data");
    }
  };

  const handleImportQR = async (qrData: string) => {
    try {
      // Pass the raw QR data (base64 compressed string) directly to importAllData
      const result = await importAllData(
        new Blob([qrData], { type: "application/json" })
      );

      alert(
        `Successfully imported ${result.decksCount} decks and ${result.replaysCount} replays`
      );
      setShowQRScanner(false);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to import data from QR code"
      );
    }
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <h1>Settings</h1>
        </PageHeader>

        <SettingsCard elevation="low">
          <Card.Content>
            <SectionTitle>Connection Settings</SectionTitle>
            <SectionDescription>
              Choose how you want to connect to other players
            </SectionDescription>
            <ConnectionSwitcher />

            <ConnectionModeInfo>
              <InfoItem>
                <InfoTitle>Direct</InfoTitle>
                <InfoDescription>
                  Connect directly to other players through peer-to-peer
                  connections. Best for playing with friends.
                </InfoDescription>
              </InfoItem>

              <InfoItem>
                <InfoTitle>Server</InfoTitle>
                <InfoDescription>
                  Connect through our central server. More reliable but may have
                  slightly higher latency than direct connections.
                </InfoDescription>
              </InfoItem>

              <InfoItem>
                <InfoTitle>Offline</InfoTitle>
                <InfoDescription>
                  Play locally without internet connectivity. Perfect for
                  testing decks or practicing combos on your own.
                </InfoDescription>
              </InfoItem>
            </ConnectionModeInfo>
          </Card.Content>
        </SettingsCard>

        <SettingsCard elevation="low">
          <Card.Content>
            <SectionTitle>Game Settings</SectionTitle>
            <SectionDescription>
              Configure your duel preferences
            </SectionDescription>

            <SettingItem>
              <SettingLabel>Enable Sound Effects</SettingLabel>
              <ToggleSwitch>
                <input type="checkbox" defaultChecked={true} />
                <span className="slider"></span>
              </ToggleSwitch>
            </SettingItem>

            <SettingItem>
              <SettingLabel>Enable Music</SettingLabel>
              <ToggleSwitch>
                <input type="checkbox" defaultChecked={true} />
                <span className="slider"></span>
              </ToggleSwitch>
            </SettingItem>

            <SettingItem>
              <SettingLabel>Show Card Previews</SettingLabel>
              <ToggleSwitch>
                <input type="checkbox" defaultChecked={true} />
                <span className="slider"></span>
              </ToggleSwitch>
            </SettingItem>
          </Card.Content>
        </SettingsCard>

        <SettingsCard elevation="low">
          <Card.Content>
            <SectionTitle>Data Management</SectionTitle>
            <SectionDescription>
              Manage your local application data
            </SectionDescription>

            <DataManagementContainer>
              <DataManagementSection>
                <SectionSubtitle>Export Data</SectionSubtitle>
                <ActionButtons>
                  <DataButton onClick={() => handleExport("file")}>
                    <IconWrapper>
                      <DownloadIcon />
                    </IconWrapper>
                    Export to File
                  </DataButton>
                  <DataButton onClick={() => handleExport("qr")}>
                    <IconWrapper>
                      <QRIcon />
                    </IconWrapper>
                    Share via QR Code
                  </DataButton>
                </ActionButtons>
              </DataManagementSection>

              <DataManagementSection>
                <SectionSubtitle>Import Data</SectionSubtitle>
                <ActionButtons>
                  <DataButton
                    onClick={() =>
                      document.getElementById("import-data-input")?.click()
                    }
                  >
                    <IconWrapper>
                      <UploadIcon />
                    </IconWrapper>
                    Import from File
                  </DataButton>
                  <DataButton onClick={() => setShowQRScanner(true)}>
                    <IconWrapper>
                      <ScanIcon />
                    </IconWrapper>
                    Scan QR Code
                  </DataButton>
                </ActionButtons>
              </DataManagementSection>

              <DataManagementSection>
                <SectionSubtitle>Data Cleanup</SectionSubtitle>
                <ActionButtons>
                  <DangerButton>Clear All Data</DangerButton>
                </ActionButtons>
              </DataManagementSection>

              <input
                type="file"
                id="import-data-input"
                accept=".json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = "";
                }}
              />
            </DataManagementContainer>

            {showQR && qrData && (
              <QRContainer>
                <QRHeader>
                  <h3>Scan this QR Code</h3>
                  <CloseButton onClick={() => setShowQR(false)}>×</CloseButton>
                </QRHeader>
                <QRCodeSVG value={qrData} size={256} />
                <QRInstructions>
                  Use another device with a camera to scan this code and import
                  your data
                </QRInstructions>
              </QRContainer>
            )}
          </Card.Content>
        </SettingsCard>
      </PageContainer>

      {showQRScanner && (
        <QRCodeScanner
          onScan={handleImportQR}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </AppLayout>
  );
};

// Styled components
const PageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${theme.spacing.lg};
`;

const PageHeader = styled.div`
  margin-bottom: ${theme.spacing.lg};

  h1 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size["2xl"]};
  }
`;

const SettingsCard = styled(Card)`
  margin-bottom: ${theme.spacing.lg};
`;

const SectionTitle = styled.h2`
  margin: 0 0 ${theme.spacing.xs} 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.lg};
  font-weight: ${theme.typography.weight.semibold};
`;

const SectionDescription = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
  margin-top: 0;
  margin-bottom: ${theme.spacing.md};
`;

const ConnectionModeInfo = styled.div`
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border.light};
`;

const InfoItem = styled.div`
  margin-bottom: ${theme.spacing.md};

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoTitle = styled.h3`
  margin: 0 0 ${theme.spacing.xs} 0;
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
`;

const InfoDescription = styled.p`
  margin: 0;
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.5;
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.border.light};

  &:last-child {
    border-bottom: none;
  }
`;

const SettingLabel = styled.label`
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 52px;
  height: 26px;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .slider {
      background-color: ${theme.colors.primary.main};
    }

    &:checked + .slider:before {
      transform: translateX(26px);
    }
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${theme.colors.text.disabled};
    transition: 0.4s;
    border-radius: 26px;

    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }
  }
`;

const DataManagementContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const DataManagementSection = styled.div`
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.light};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const SectionSubtitle = styled.h3`
  margin: 0 0 ${theme.spacing.sm} 0;
  font-size: ${theme.typography.size.md};
  color: ${theme.colors.text.primary};
`;

const ActionButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const DataButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background-color: ${theme.colors.primary.main};
  color: ${theme.colors.text.inverse};
  border: none;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  font-size: ${theme.typography.size.md};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${theme.colors.primary.dark};
  }
`;

const Button = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${theme.colors.primary.main};
  color: ${theme.colors.text.inverse};
  border: none;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  font-size: ${theme.typography.size.sm};

  &:hover {
    background-color: ${theme.colors.primary.dark};
  }
`;

const DangerButton = styled(Button)`
  background-color: ${theme.colors.error.main};

  &:hover {
    background-color: ${theme.colors.error.dark};
  }
`;

const QRContainer = styled.div`
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  background-color: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const QRHeader = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: ${theme.typography.size.lg};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${theme.colors.text.secondary};

  &:hover {
    color: ${theme.colors.text.primary};
  }
`;

const QRInstructions = styled.p`
  text-align: center;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
`;

// Simple SVG icons
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
  </svg>
);

const QRIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v2h2v-2zm-2-2h2v-2h-2v2zm2 6h-2v2h2v-2zm2 2h2v-2h-2v2zm2-6h-2v2h2v-2z" />
  </svg>
);

const ScanIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM22 7h-2V4h-3V2h5v5zm0 15v-5h-2v3h-3v2h5zM2 22h5v-2H4v-3H2v5zM2 2v5h2V4h3V2H2z" />
  </svg>
);

export default SettingsPage;
