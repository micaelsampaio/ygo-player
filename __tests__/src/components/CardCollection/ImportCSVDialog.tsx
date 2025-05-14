import React, { useState, useRef, ChangeEvent } from "react";
import styled from "styled-components";
import { Upload, AlertCircle, Check, ArrowRight } from "lucide-react";
import { parseCSVFile, validateCSVData, CardCSVData } from "./utils/csv-utils";
import theme from "../../styles/theme";
import { Modal, Button, Select } from "../UI";
import { toast } from "react-hot-toast";

interface ImportCSVDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (cards: CardCSVData[], collectionId: string) => void;
  collections: Array<{ id: string; name: string }>;
}

const ImportCSVDialog: React.FC<ImportCSVDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  collections,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parsedData, setParsedData] = useState<CardCSVData[] | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>(
    collections[0]?.id || ""
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [step, setStep] = useState<"upload" | "preview" | "confirm">("upload");

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    setValidationErrors([]);
    if (!e.target.files || !e.target.files[0]) {
      return;
    }

    const file = e.target.files[0];
    setSelectedFile(file);
    setFileName(file.name);
    setIsUploading(true);

    try {
      const parsed = await parseCSVFile(file);
      const { isValid, errors, data } = validateCSVData(parsed);

      if (isValid) {
        setParsedData(data);
        setStep("preview");
      } else {
        setValidationErrors(errors);
      }
    } catch (error) {
      console.error("Error parsing CSV file:", error);
      setValidationErrors([
        "Failed to parse CSV file. Please check the file format.",
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleConfirm = () => {
    if (!parsedData || !selectedCollection) return;

    try {
      onImport(parsedData, selectedCollection);
      onClose();
      setSelectedFile(null);
      setFileName("");
      setParsedData(null);
      setStep("upload");
      setValidationErrors([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("There was a problem importing your data");
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setFileName("");
    setParsedData(null);
    setStep("upload");
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const renderStepContent = () => {
    switch (step) {
      case "upload":
        return (
          <UploadStep>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <UploadArea onClick={triggerFileInput}>
              <Upload size={32} />
              <p>Click to upload your CSV file</p>
              <small>or drag and drop</small>
            </UploadArea>

            {validationErrors.length > 0 && (
              <ValidationErrors>
                <ErrorHeader>
                  <AlertCircle size={16} />
                  There are issues with your CSV file
                </ErrorHeader>
                <ErrorList>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ErrorList>
              </ValidationErrors>
            )}

            <CSVFormatInfo>
              <h4>CSV Format Guidelines:</h4>
              <p>Your CSV file should include the following columns:</p>
              <ul>
                <li>
                  <strong>id</strong> - Unique identifier for the card
                  (optional)
                </li>
                <li>
                  <strong>name</strong> - Card name (required)
                </li>
                <li>
                  <strong>set</strong> - The card set (optional)
                </li>
                <li>
                  <strong>rarity</strong> - Card rarity (optional)
                </li>
                <li>
                  <strong>condition</strong> - Card condition (optional)
                </li>
                <li>
                  <strong>quantity</strong> - Number of copies (required)
                </li>
                <li>
                  <strong>price</strong> - Card value/price (optional)
                </li>
                <li>
                  <strong>notes</strong> - Additional notes (optional)
                </li>
                <li>
                  <strong>dateAdded</strong> - Date acquired (optional)
                </li>
              </ul>
            </CSVFormatInfo>
          </UploadStep>
        );

      case "preview":
        return (
          <PreviewStep>
            <h3>Preview of Import Data</h3>
            <p>
              Found <strong>{parsedData?.length}</strong> cards to import.
              Select the collection you want to add these cards to:
            </p>

            <CollectionSelect>
              <label htmlFor="collection-select">Target Collection:</label>
              <Select
                id="collection-select"
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
              >
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </Select>
            </CollectionSelect>

            {parsedData && parsedData.length > 0 && (
              <DataPreview>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Set</th>
                      <th>Rarity</th>
                      <th>Quantity</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((card, index) => (
                      <tr key={index}>
                        <td>{card.name}</td>
                        <td>{card.set}</td>
                        <td>{card.rarity}</td>
                        <td>{card.quantity}</td>
                        <td>
                          {card.price ? `$${card.price.toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                    {parsedData.length > 5 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>
                          ... and {parsedData.length - 5} more cards
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </DataPreview>
            )}
          </PreviewStep>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Cards from CSV"
      width="600px"
      footer={
        <ModalFooter>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>

          {step === "upload" && (
            <Button
              variant="primary"
              onClick={triggerFileInput}
              disabled={isUploading}
            >
              Select File
            </Button>
          )}

          {step === "preview" && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              icon={<Check size={16} />}
            >
              Import Cards
            </Button>
          )}
        </ModalFooter>
      }
    >
      {renderStepContent()}
    </Modal>
  );
};

const UploadStep = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const UploadArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed ${theme.colors.border.main};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xl};
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${theme.colors.background.light};

  &:hover {
    border-color: ${theme.colors.primary.main};
    background: ${theme.colors.background.hover};
  }

  p {
    margin: ${theme.spacing.md} 0 ${theme.spacing.xs};
    font-weight: 500;
  }

  small {
    color: ${theme.colors.text.secondary};
  }

  svg {
    color: ${theme.colors.primary.main};
  }
`;

const ValidationErrors = styled.div`
  background-color: ${theme.colors.error.light};
  border: 1px solid ${theme.colors.error.main};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
`;

const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.error.dark};
  font-weight: 500;
  margin-bottom: ${theme.spacing.sm};
`;

const ErrorList = styled.ul`
  margin: 0;
  padding-left: ${theme.spacing.lg};

  li {
    margin-bottom: ${theme.spacing.xs};
    font-size: ${theme.typography.size.sm};
  }
`;

const CSVFormatInfo = styled.div`
  background: ${theme.colors.background.light};
  border: 1px solid ${theme.colors.border.main};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};

  h4 {
    margin: 0 0 ${theme.spacing.sm};
    font-size: ${theme.typography.size.md};
  }

  p {
    margin: 0 0 ${theme.spacing.xs};
    font-size: ${theme.typography.size.sm};
  }

  ul {
    margin: ${theme.spacing.xs} 0 0;
    padding-left: ${theme.spacing.lg};
    font-size: ${theme.typography.size.sm};
  }

  li {
    margin-bottom: ${theme.spacing.xs};
  }
`;

const PreviewStep = styled.div`
  h3 {
    margin: 0 0 ${theme.spacing.sm};
  }

  p {
    margin: 0 0 ${theme.spacing.md};
  }
`;

const CollectionSelect = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.lg};

  label {
    font-weight: 500;
  }
`;

const DataPreview = styled.div`
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: ${theme.spacing.sm};
    text-align: left;
    border-bottom: 1px solid ${theme.colors.border.light};
  }

  th {
    background: ${theme.colors.background.light};
    font-weight: 500;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
`;

export default ImportCSVDialog;
