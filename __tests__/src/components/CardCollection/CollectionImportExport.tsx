import React, { useState } from "react";
import styled from "styled-components";
import { UploadCloud, Download, ArrowUp, ArrowDown, Info } from "lucide-react";
import theme from "../../styles/theme";
import { Button, Tooltip } from "../UI";
import { exportToCSV, CardCSVData } from "./utils/csv-utils";
import ImportCSVDialog from "./ImportCSVDialog";
import { toast } from "react-hot-toast";

interface CollectionImportExportProps {
  collections: Array<{ id: string; name: string }>;
  activeCollection?: { id: string; name: string } | null;
  cards: CardCSVData[];
  onImportCards: (cards: CardCSVData[], collectionId: string) => void;
}

const CollectionImportExport: React.FC<CollectionImportExportProps> = ({
  collections,
  activeCollection,
  cards,
  onImportCards,
}) => {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState<boolean>(false);

  const handleExport = () => {
    if (!activeCollection) {
      toast.error("Please select a collection to export");
      return;
    }

    try {
      exportToCSV(cards, activeCollection.name);
      toast.success(
        `Collection "${activeCollection.name}" exported successfully!`
      );
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export collection");
    }
  };

  return (
    <>
      <Container>
        <ButtonWithTooltip
          onClick={() => setIsImportDialogOpen(true)}
          tooltipText="Import cards from CSV file"
        >
          <ArrowUp size={16} />
          <span>Import</span>
        </ButtonWithTooltip>

        <ButtonWithTooltip
          onClick={handleExport}
          tooltipText="Export collection to CSV file"
          disabled={!activeCollection}
        >
          <ArrowDown size={16} />
          <span>Export</span>
        </ButtonWithTooltip>
      </Container>

      <ImportCSVDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={onImportCards}
        collections={collections}
      />
    </>
  );
};

interface ButtonWithTooltipProps {
  onClick: () => void;
  tooltipText: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const ButtonWithTooltip: React.FC<ButtonWithTooltipProps> = ({
  onClick,
  tooltipText,
  disabled = false,
  children,
}) => {
  return (
    <Tooltip content={tooltipText} position="top">
      <ActionButton onClick={onClick} disabled={disabled}>
        {children}
      </ActionButton>
    </Tooltip>
  );
};

const Container = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

const ActionButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  height: 36px;
  padding: 0 ${theme.spacing.md};
  background: ${theme.colors.background.paper};
  border: 1px solid ${theme.colors.border.main};
  border-radius: ${theme.borderRadius.md};
  color: ${(props) =>
    props.disabled ? theme.colors.text.disabled : theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.disabled
        ? theme.colors.background.paper
        : theme.colors.background.hover};
    border-color: ${(props) =>
      props.disabled ? theme.colors.border.main : theme.colors.border.dark};
    color: ${(props) =>
      props.disabled ? theme.colors.text.disabled : theme.colors.text.primary};
  }
`;

export default CollectionImportExport;
