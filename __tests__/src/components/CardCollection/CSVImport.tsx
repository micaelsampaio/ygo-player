import React, { useState } from "react";
import styled from "styled-components";
import { X, Upload, AlertTriangle, CheckCircle } from "lucide-react";
import theme from "../../styles/theme";
import { Button, Modal } from "../UI";
import {
  CSVCardData,
  readCSVFile,
  parseCSV,
  detectHeaderMapping,
} from "../../utils/csv-handler";

interface CSVImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (cards: CSVCardData[]) => void;
  collectionName: string;
}

const CSVImport: React.FC<CSVImportProps> = ({
  isOpen,
  onClose,
  onImport,
  collectionName,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVCardData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [headerMapping, setHeaderMapping] = useState<Record<string, string>>(
    {}
  );
  const [headers, setHeaders] = useState<string[]>([]);
  const [importStep, setImportStep] = useState<
    "upload" | "mapping" | "preview"
  >("upload");
  const [success, setSuccess] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Reset states
      setFile(selectedFile);
      setPreview([]);
      setError(null);
      setSuccess(false);

      // Validate file type
      if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
        setError("Please upload a CSV file");
        return;
      }

      setIsLoading(true);

      // Read and parse the CSV file
      readCSVFile(selectedFile)
        .then((content) => {
          try {
            // Get headers for mapping step
            const lines = content
              .split(/\r?\n/)
              .filter((line) => line.trim() !== "");
            if (lines.length === 0) {
              throw new Error("The CSV file is empty");
            }

            // Extract headers from first line
            const headerLine = lines[0];
            const extractedHeaders = headerLine
              .split(",")
              .map((h) => h.trim().replace(/^"|"$/g, ""));

            // Detect automatic mapping
            const detectedMapping = detectHeaderMapping(extractedHeaders);

            setHeaders(extractedHeaders);
            setHeaderMapping(detectedMapping);

            // Check if we have name and quantity mapping
            const hasNameMapping =
              Object.values(detectedMapping).includes("name");
            const hasQuantityMapping =
              Object.values(detectedMapping).includes("quantity");

            if (hasNameMapping && hasQuantityMapping) {
              // If we have the essential mappings, parse and show preview
              const parsedCards = parseCSV(content, detectedMapping);
              setPreview(parsedCards.slice(0, 10)); // Show only first 10 cards
              setImportStep("preview");
            } else {
              // Otherwise, go to mapping step
              setImportStep("mapping");
            }
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Failed to parse CSV file"
            );
          } finally {
            setIsLoading(false);
          }
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Failed to read CSV file"
          );
          setIsLoading(false);
        });
    }
  };

  const handleMappingChange = (
    originalHeader: string,
    mappedProperty: string
  ) => {
    setHeaderMapping((prev) => ({
      ...prev,
      [originalHeader]: mappedProperty,
    }));
  };

  const handlePreview = () => {
    if (!file) return;

    setIsLoading(true);

    readCSVFile(file)
      .then((content) => {
        try {
          const parsedCards = parseCSV(content, headerMapping);
          setPreview(parsedCards.slice(0, 10)); // Show only first 10 cards
          setImportStep("preview");
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to parse CSV file"
          );
        } finally {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to read CSV file"
        );
        setIsLoading(false);
      });
  };

  const handleImport = () => {
    if (!file) return;

    setIsLoading(true);

    readCSVFile(file)
      .then((content) => {
        try {
          const parsedCards = parseCSV(content, headerMapping);

          if (parsedCards.length === 0) {
            throw new Error("No valid cards found in the CSV file");
          }

          onImport(parsedCards);
          setSuccess(true);
          setIsLoading(false);

          // Close the modal after a short delay
          setTimeout(() => {
            onClose();
            // Reset states for next time
            setFile(null);
            setPreview([]);
            setError(null);
            setSuccess(false);
            setImportStep("upload");
          }, 1500);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to import CSV file"
          );
          setIsLoading(false);
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to import CSV file"
        );
        setIsLoading(false);
      });
  };

  const resetImport = () => {
    setFile(null);
    setPreview([]);
    setError(null);
    setSuccess(false);
    setImportStep("upload");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Cards from CSV"
      width="600px"
    >
      <ModalContent>
        {importStep === "upload" && (
          <UploadSection>
            <h3>Upload your collection</h3>
            <p>
              Upload a CSV file containing your card collection. The file should
              have the following columns:
            </p>
            <RequiredFields>
              <li>
                <strong>name</strong>: Name of the card (required)
              </li>
              <li>
                <strong>quantity</strong>: Number of copies (required)
              </li>
            </RequiredFields>
            <p>
              Optional columns: set, setCode, rarity, condition, price, notes,
              dateAdded, language, cardNumber, edition, isFoil
            </p>

            <FileInputWrapper>
              <HiddenInput
                type="file"
                id="csv-file"
                accept=".csv"
                onChange={handleFileChange}
              />
              <FileInputLabel htmlFor="csv-file">
                <Upload size={24} />
                <span>Choose CSV file</span>
                {file && <FileName>{file.name}</FileName>}
              </FileInputLabel>
            </FileInputWrapper>

            {error && (
              <ErrorMessage>
                <AlertTriangle size={16} />
                {error}
              </ErrorMessage>
            )}
          </UploadSection>
        )}

        {importStep === "mapping" && (
          <MappingSection>
            <h3>Map CSV Columns</h3>
            <p>
              We need to map your CSV columns to our card properties. Please
              select the correct mapping for each column.
            </p>

            <MappingTable>
              <thead>
                <tr>
                  <th>CSV Column</th>
                  <th>Maps To</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((header, index) => (
                  <tr key={index}>
                    <td>{header}</td>
                    <td>
                      <select
                        value={headerMapping[header] || ""}
                        onChange={(e) =>
                          handleMappingChange(header, e.target.value)
                        }
                      >
                        <option value="">-- Select --</option>
                        <option value="name">Card Name</option>
                        <option value="quantity">Quantity</option>
                        <option value="set">Set Name</option>
                        <option value="setCode">Set Code</option>
                        <option value="rarity">Rarity</option>
                        <option value="condition">Condition</option>
                        <option value="price">Price</option>
                        <option value="notes">Notes</option>
                        <option value="dateAdded">Date Added</option>
                        <option value="language">Language</option>
                        <option value="cardNumber">Card Number</option>
                        <option value="edition">Edition</option>
                        <option value="isFoil">Is Foil</option>
                        <option value="ignore">Ignore This Column</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </MappingTable>

            {error && (
              <ErrorMessage>
                <AlertTriangle size={16} />
                {error}
              </ErrorMessage>
            )}

            <ButtonGroup>
              <Button
                variant="secondary"
                onClick={resetImport}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handlePreview}
                disabled={
                  isLoading ||
                  !Object.values(headerMapping).includes("name") ||
                  !Object.values(headerMapping).includes("quantity")
                }
              >
                {isLoading ? "Loading..." : "Preview"}
              </Button>
            </ButtonGroup>
          </MappingSection>
        )}

        {importStep === "preview" && (
          <PreviewSection>
            <h3>Preview</h3>
            <p>
              Below is a preview of the first 10 cards from your CSV. Please
              confirm that the data looks correct.
            </p>

            {preview.length > 0 ? (
              <PreviewTable>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Quantity</th>
                    <th>Set</th>
                    <th>Rarity</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((card, index) => (
                    <tr key={index}>
                      <td>{card.name}</td>
                      <td>{card.quantity}</td>
                      <td>{card.set || ""}</td>
                      <td>{card.rarity || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </PreviewTable>
            ) : (
              <EmptyPreview>No preview available</EmptyPreview>
            )}

            {error && (
              <ErrorMessage>
                <AlertTriangle size={16} />
                {error}
              </ErrorMessage>
            )}

            {success && (
              <SuccessMessage>
                <CheckCircle size={16} />
                Cards imported successfully!
              </SuccessMessage>
            )}

            <ButtonGroup>
              {importStep === "preview" && (
                <Button
                  variant="secondary"
                  onClick={() => setImportStep("mapping")}
                  disabled={isLoading}
                >
                  Back
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={isLoading || preview.length === 0 || success}
              >
                {isLoading
                  ? "Importing..."
                  : `Import All Cards to "${collectionName}"`}
              </Button>
            </ButtonGroup>
          </PreviewSection>
        )}
      </ModalContent>
    </Modal>
  );
};

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const UploadSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const MappingSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const PreviewSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const RequiredFields = styled.ul`
  margin: ${theme.spacing.sm} 0;
  padding-left: ${theme.spacing.lg};
`;

const FileInputWrapper = styled.div`
  margin: ${theme.spacing.md} 0;
`;

const HiddenInput = styled.input`
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
`;

const FileInputLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.lg};
  border: 2px dashed ${theme.colors.border.main};
  border-radius: ${theme.borderRadius.md};
  background-color: ${theme.colors.background.light};
  cursor: pointer;
  transition: all 0.2s ease;
  gap: ${theme.spacing.md};

  &:hover {
    border-color: ${theme.colors.primary.main};
    background-color: ${theme.colors.primary.subtle};
  }
`;

const FileName = styled.span`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.error.subtle};
  color: ${theme.colors.error.main};
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.success.subtle};
  color: ${theme.colors.success.main};
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};
`;

const MappingTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: ${theme.spacing.sm};
    text-align: left;
    border-bottom: 1px solid ${theme.colors.border.main};
  }

  th {
    font-weight: 600;
    background-color: ${theme.colors.background.light};
  }

  select {
    width: 100%;
    padding: ${theme.spacing.sm};
    border-radius: ${theme.borderRadius.sm};
    border: 1px solid ${theme.colors.border.main};
    background-color: ${theme.colors.background.default};
    color: ${theme.colors.text.primary};

    &:focus {
      outline: none;
      border-color: ${theme.colors.primary.main};
      box-shadow: 0 0 0 2px ${theme.colors.primary.subtle};
    }
  }
`;

const PreviewTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: ${theme.spacing.sm};
    text-align: left;
    border-bottom: 1px solid ${theme.colors.border.main};
  }

  th {
    font-weight: 600;
    background-color: ${theme.colors.background.light};
  }
`;

const EmptyPreview = styled.div`
  padding: ${theme.spacing.lg};
  text-align: center;
  color: ${theme.colors.text.secondary};
  background-color: ${theme.colors.background.light};
  border-radius: ${theme.borderRadius.md};
`;

export default CSVImport;
