import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Download, CheckCircle2, X, FileText } from "lucide-react";
import theme from "../../styles/theme";
import { Button, Modal, Checkbox } from "../UI";
import { generateCSV, downloadCSV, CSVCardData } from "../../utils/csv-handler";

interface CSVExportProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CSVCardData[];
  collectionName: string;
}

const CSVExport: React.FC<CSVExportProps> = ({
  isOpen,
  onClose,
  cards,
  collectionName,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExported, setIsExported] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<
    Record<string, boolean>
  >({
    name: true,
    set: true,
    setCode: true,
    rarity: true,
    condition: true,
    quantity: true,
    price: true,
    notes: true,
    dateAdded: true,
    language: true,
    cardNumber: true,
    edition: true,
    isFoil: true,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsExported(false);
    }
  }, [isOpen]);

  const handleColumnToggle = (column: string) => {
    setSelectedColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const handleExport = () => {
    setIsExporting(true);

    try {
      // Filter card data to only include selected columns
      const filteredCards = cards.map((card) => {
        const filteredCard: Partial<CSVCardData> = {};

        Object.entries(selectedColumns).forEach(([key, isSelected]) => {
          if (isSelected && key in card) {
            filteredCard[key as keyof CSVCardData] =
              card[key as keyof CSVCardData];
          }
        });

        return filteredCard as CSVCardData;
      });

      const csvContent = generateCSV(filteredCards);
      const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
      const filename = `${collectionName
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_${currentDate}.csv`;

      downloadCSV(csvContent, filename);
      setIsExported(true);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Skip name and quantity fields as they are required
  const optionalColumns = [
    { key: "set", label: "Set Name" },
    { key: "setCode", label: "Set Code" },
    { key: "rarity", label: "Rarity" },
    { key: "condition", label: "Condition" },
    { key: "price", label: "Price" },
    { key: "notes", label: "Notes" },
    { key: "dateAdded", label: "Date Added" },
    { key: "language", label: "Language" },
    { key: "cardNumber", label: "Card Number" },
    { key: "edition", label: "Edition" },
    { key: "isFoil", label: "Foil" },
  ];

  const handleSelectAll = () => {
    const allSelected = optionalColumns.every(
      (column) => selectedColumns[column.key]
    );

    if (allSelected) {
      // Deselect all except required fields
      const newSelection: Record<string, boolean> = {
        name: true,
        quantity: true,
      };

      optionalColumns.forEach((column) => {
        newSelection[column.key] = false;
      });

      setSelectedColumns(newSelection);
    } else {
      // Select all
      const newSelection: Record<string, boolean> = {};

      ["name", "quantity", ...optionalColumns.map((c) => c.key)].forEach(
        (key) => {
          newSelection[key] = true;
        }
      );

      setSelectedColumns(newSelection);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <h3>Export Collection as CSV</h3>
        <CloseButton onClick={onClose}>
          <X size={18} />
        </CloseButton>
      </ModalHeader>

      <ModalContent>
        <CollectionInfo>
          <FileIcon>
            <FileText size={24} />
          </FileIcon>
          <div>
            <CollectionName>{collectionName}</CollectionName>
            <CollectionStats>
              {cards.length} cards,{" "}
              {cards.reduce((sum, card) => sum + (card.quantity || 0), 0)} total
            </CollectionStats>
          </div>
        </CollectionInfo>

        {isExported ? (
          <ExportSuccess>
            <SuccessIcon>
              <CheckCircle2 size={32} />
            </SuccessIcon>
            <div>
              <h4>Export Complete</h4>
              <p>Your collection has been exported successfully.</p>
            </div>
          </ExportSuccess>
        ) : (
          <>
            <ColumnSection>
              <SectionHeader>
                <h4>Select Columns to Export</h4>
                <SelectAllButton onClick={handleSelectAll}>
                  {optionalColumns.every(
                    (column) => selectedColumns[column.key]
                  )
                    ? "Deselect All"
                    : "Select All"}
                </SelectAllButton>
              </SectionHeader>

              <RequiredFields>
                <CheckboxItem>
                  <Checkbox
                    id="column-name"
                    checked={true}
                    disabled={true}
                    onChange={() => {}}
                  />
                  <CheckboxLabel htmlFor="column-name">
                    Card Name <RequiredBadge>Required</RequiredBadge>
                  </CheckboxLabel>
                </CheckboxItem>

                <CheckboxItem>
                  <Checkbox
                    id="column-quantity"
                    checked={true}
                    disabled={true}
                    onChange={() => {}}
                  />
                  <CheckboxLabel htmlFor="column-quantity">
                    Quantity <RequiredBadge>Required</RequiredBadge>
                  </CheckboxLabel>
                </CheckboxItem>
              </RequiredFields>

              <ColumnsGrid>
                {optionalColumns.map((column) => (
                  <CheckboxItem key={column.key}>
                    <Checkbox
                      id={`column-${column.key}`}
                      checked={!!selectedColumns[column.key]}
                      onChange={() => handleColumnToggle(column.key)}
                    />
                    <CheckboxLabel htmlFor={`column-${column.key}`}>
                      {column.label}
                    </CheckboxLabel>
                  </CheckboxItem>
                ))}
              </ColumnsGrid>
            </ColumnSection>

            <InfoSection>
              <p>
                The exported CSV can be opened with any spreadsheet software
                like Microsoft Excel, Google Sheets, or LibreOffice Calc.
              </p>
            </InfoSection>
          </>
        )}
      </ModalContent>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {isExported ? "Close" : "Cancel"}
        </Button>

        {!isExported && (
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={isExporting}
            icon={<Download size={16} />}
          >
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

// Styled components
const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.light};

  h3 {
    margin: 0;
    color: ${theme.colors.text.primary};
    font-size: ${theme.typography.size.xl};
  }
`;

const ModalContent = styled.div`
  padding: ${theme.spacing.lg} 0;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border.light};
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.text.secondary};
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.background.hover};
    color: ${theme.colors.text.primary};
  }
`;

const CollectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.default};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.lg};
`;

const FileIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.primary.main};
`;

const CollectionName = styled.div`
  font-weight: ${theme.typography.weight.semibold};
  color: ${theme.colors.text.primary};
`;

const CollectionStats = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
`;

const ColumnSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};

  h4 {
    margin: 0;
    color: ${theme.colors.text.primary};
  }
`;

const SelectAllButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.primary.main};
  font-size: ${theme.typography.size.sm};
  cursor: pointer;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};

  &:hover {
    background: ${theme.colors.primary.subtle};
  }
`;

const RequiredFields = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const CheckboxItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
`;

const CheckboxLabel = styled.label`
  margin-left: ${theme.spacing.sm};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.size.sm};
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const RequiredBadge = styled.span`
  background: ${theme.colors.primary.subtle};
  color: ${theme.colors.primary.main};
  font-size: ${theme.typography.size.xs};
  padding: 2px 6px;
  border-radius: ${theme.borderRadius.sm};
  margin-left: ${theme.spacing.sm};
`;

const ColumnsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm};
`;

const InfoSection = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.size.sm};
  line-height: 1.5;
  background: ${theme.colors.background.default};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
`;

const ExportSuccess = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.success.subtle};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.lg};

  h4 {
    margin: 0 0 ${theme.spacing.xs} 0;
    color: ${theme.colors.success.main};
  }

  p {
    margin: 0;
    color: ${theme.colors.text.primary};
  }
`;

const SuccessIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.success.main};
  border-radius: 50%;
  color: white;
`;

export default CSVExport;
