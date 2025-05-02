import React, { useState, useEffect } from "react";
import styled from "styled-components";
import theme from "../../styles/theme";

// Import CDN URL for card data
const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

interface DeckConverterProps {
  size?: "small" | "medium" | "large";
}

const Container = styled.div<{ $size: string }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: ${(props) =>
    props.$size === "small"
      ? "500px"
      : props.$size === "medium"
      ? "650px"
      : "800px"};
  background: ${theme.colors.background.card};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  padding: ${(props) =>
    props.$size === "small"
      ? theme.spacing.sm
      : props.$size === "medium"
      ? theme.spacing.md
      : theme.spacing.lg};
  margin: 0 auto;
`;

const Title = styled.h2`
  font-size: ${theme.typography.size.xl};
  font-weight: ${theme.typography.weight.bold};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.md} 0;
  text-align: center;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.border.default};
  margin-bottom: ${theme.spacing.md};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${(props) =>
    props.$active ? theme.colors.background.paper : "transparent"};
  border: none;
  border-bottom: ${(props) =>
    props.$active ? `2px solid ${theme.colors.primary.main}` : "none"};
  color: ${(props) =>
    props.$active ? theme.colors.primary.main : theme.colors.text.primary};
  font-weight: ${(props) =>
    props.$active
      ? theme.typography.weight.bold
      : theme.typography.weight.normal};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.background.paper};
    color: ${theme.colors.primary.main};
  }
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${theme.typography.size.md};
  font-weight: ${theme.typography.weight.medium};
  margin-bottom: ${theme.spacing.xs};
  color: ${theme.colors.text.primary};
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 200px;
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.borderRadius.sm};
  font-family: monospace;
  font-size: ${theme.typography.size.sm};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${(props) =>
    props.$primary
      ? theme.colors.primary.main
      : theme.colors.background.default};
  color: ${(props) =>
    props.$primary ? theme.colors.text.inverse : theme.colors.text.primary};
  border: 1px solid
    ${(props) =>
      props.$primary ? theme.colors.primary.main : theme.colors.border.default};
  border-radius: ${theme.borderRadius.md};
  font-weight: ${theme.typography.weight.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.$primary
        ? theme.colors.primary.dark
        : theme.colors.background.paper};
    transform: translateY(-2px);
  }
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error.main};
  font-size: ${theme.typography.size.sm};
  margin-top: ${theme.spacing.xs};
`;

const SuccessMessage = styled.div`
  color: ${theme.colors.success.main};
  font-size: ${theme.typography.size.sm};
  margin-top: ${theme.spacing.xs};
`;

const ResultContainer = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.light};
`;

const InfoSection = styled.div`
  font-size: ${theme.typography.size.sm};
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.sm};
  background-color: ${theme.colors.background.default};
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.info.main};
`;

// Card database types
interface CardData {
  id: number;
  name: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  attribute?: string;
  archetype?: string;
  scale?: number;
  linkval?: number;
  linkmarkers?: string[];
  type: string;
  [key: string]: any;
}

interface CardDatabase {
  [key: string]: number; // name -> id mapping
  byId: {
    [key: number]: string; // id -> name mapping
  };
}

const DeckConverter: React.FC<DeckConverterProps> = ({ size = "medium" }) => {
  const [activeTab, setActiveTab] = useState<"list-to-ydk" | "ydk-to-list">(
    "list-to-ydk"
  );
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [cardDatabase, setCardDatabase] = useState<CardDatabase>({ byId: {} });
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load card database from CDN
  useEffect(() => {
    const loadCardDatabase = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${cdnUrl}/cards.json`);
        if (!response.ok) {
          throw new Error(`Failed to fetch card database: ${response.status}`);
        }

        const cardsData: CardData[] = await response.json();

        // Create name -> id and id -> name mappings
        const nameToId: { [key: string]: number } = {};
        const idToName: { [key: number]: string } = {};

        cardsData.forEach((card) => {
          // Clean up the card name (handle special characters, etc.)
          const normalizedName = normalizeCardName(card.name);
          nameToId[normalizedName] = card.id;
          idToName[card.id] = card.name;
        });

        setCardDatabase({ ...nameToId, byId: idToName });
        setDbLoaded(true);
        setLoading(false);
        console.log(`Loaded ${Object.keys(nameToId).length} cards from database`);
      } catch (error) {
        console.error("Failed to load card database:", error);
        setError(
          `Failed to load card database: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setLoading(false);
      }
    };

    loadCardDatabase();
  }, []);

  // Helper function to normalize card names for consistent matching
  const normalizeCardName = (name: string): string => {
    return name
      .replace(/&amp;/g, "&") // Replace HTML entities
      .replace(/[^\w\s&-]/g, "") // Remove special chars except &, - and spaces
      .trim()
      .toLowerCase();
  };

  // Function to convert list format to YDK format
  const convertListToYDK = (listText: string): string => {
    // Initialize YDK sections
    let mainDeckIds: number[] = [];
    let extraDeckIds: number[] = [];
    let sideDeckIds: number[] = [];

    // Keep track of cards not found for error reporting
    const notFoundCards: string[] = [];

    // Parse the list text
    let currentSection = "";
    const lines = listText.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Identify section headers
      if (/main\s*deck/i.test(trimmedLine)) {
        currentSection = "main";
        continue;
      } else if (/extra\s*deck/i.test(trimmedLine)) {
        currentSection = "extra";
        continue;
      } else if (/side\s*deck/i.test(trimmedLine)) {
        currentSection = "side";
        continue;
      } else if (trimmedLine === "" || /^-+$/i.test(trimmedLine)) {
        // Skip empty lines and separators
        continue;
      }

      // Only process lines when a section is active
      if (!currentSection) continue;

      // Parse card entries (formats: "3x Card Name", "3 Card Name")
      const cardMatch = trimmedLine.match(/^(\d+)(?:x|\s+)(.+)$/i);
      if (cardMatch) {
        const [, countStr, cardName] = cardMatch;
        const count = parseInt(countStr, 10);
        const cleanedCardName = cardName.trim();
        const normalizedName = normalizeCardName(cleanedCardName);

        // Look up card ID from database
        const cardId = cardDatabase[normalizedName];

        if (!cardId) {
          console.warn(
            `Card not found in database: "${cleanedCardName}" (normalized: "${normalizedName}")`
          );
          notFoundCards.push(cleanedCardName);
          continue;
        }

        // Add card IDs to appropriate section
        const targetDeck =
          currentSection === "main"
            ? mainDeckIds
            : currentSection === "extra"
            ? extraDeckIds
            : sideDeckIds;

        // Add the card ID count times
        for (let i = 0; i < count; i++) {
          targetDeck.push(cardId);
        }
      }
    }

    // Log section sizes for debugging
    console.log(`Main deck: ${mainDeckIds.length} cards`);
    console.log(`Extra deck: ${extraDeckIds.length} cards`);
    console.log(`Side deck: ${sideDeckIds.length} cards`);

    // Report not found cards if any
    if (notFoundCards.length > 0) {
      console.warn(
        `Could not find ${notFoundCards.length} cards: ${notFoundCards.join(
          ", "
        )}`
      );
      setError(
        `Warning: ${notFoundCards.length} cards not found in database. Check console for details.`
      );
    }

    // Format YDK string
    let ydkContent = "#created by YGO Deck Converter\n";
    ydkContent += "#main\n";
    mainDeckIds.forEach((id) => (ydkContent += id + "\n"));
    ydkContent += "#extra\n";
    extraDeckIds.forEach((id) => (ydkContent += id + "\n"));
    ydkContent += "!side\n";
    sideDeckIds.forEach((id) => (ydkContent += id + "\n"));

    return ydkContent;
  };

  // Function to convert YDK format to list format
  const convertYDKToList = (ydkText: string): string => {
    // Parse YDK
    const lines = ydkText.split("\n");
    let currentSection = "";

    // Create maps to count card occurrences
    const mainDeckMap = new Map<number, number>();
    const extraDeckMap = new Map<number, number>();
    const sideDeckMap = new Map<number, number>();

    // Track card IDs that are not in our database
    const unknownCardIds = new Set<number>();

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === "#main") {
        currentSection = "main";
        continue;
      } else if (trimmedLine === "#extra") {
        currentSection = "extra";
        continue;
      } else if (trimmedLine === "!side") {
        currentSection = "side";
        continue;
      } else if (trimmedLine === "" || trimmedLine.startsWith("#")) {
        continue;
      }

      // Try to parse card ID
      const cardId = parseInt(trimmedLine, 10);
      if (isNaN(cardId)) continue;

      // Add to appropriate deck section
      if (currentSection === "main") {
        mainDeckMap.set(cardId, (mainDeckMap.get(cardId) || 0) + 1);
      } else if (currentSection === "extra") {
        extraDeckMap.set(cardId, (extraDeckMap.get(cardId) || 0) + 1);
      } else if (currentSection === "side") {
        sideDeckMap.set(cardId, (sideDeckMap.get(cardId) || 0) + 1);
      }
    }

    // Helper function to convert card ID to name
    const idToName = (id: number): string => {
      const name = cardDatabase.byId[id];
      if (!name) {
        unknownCardIds.add(id);
        return `Unknown Card (${id})`;
      }
      return name;
    };

    // Generate list text
    let listText = "Main Deck:\n";
    mainDeckMap.forEach((count, cardId) => {
      listText += `${count}x ${idToName(cardId)}\n`;
    });

    listText += "---------\nExtra Deck:\n";
    extraDeckMap.forEach((count, cardId) => {
      listText += `${count}x ${idToName(cardId)}\n`;
    });

    listText += "---------\nSide Deck:\n";
    sideDeckMap.forEach((count, cardId) => {
      listText += `${count}x ${idToName(cardId)}\n`;
    });

    // Report unknown card IDs if any
    if (unknownCardIds.size > 0) {
      console.warn(`Found ${unknownCardIds.size} unknown card IDs`);
      setError(
        `Warning: ${unknownCardIds.size} unknown card IDs in the YDK file.`
      );
    }

    return listText;
  };

  const handleConvert = () => {
    setError("");
    setSuccess("");
    setOutputText("");

    if (!dbLoaded) {
      setError("Card database is still loading. Please wait...");
      return;
    }

    try {
      if (!inputText.trim()) {
        setError("Please enter text to convert");
        return;
      }

      if (activeTab === "list-to-ydk") {
        const ydkContent = convertListToYDK(inputText);
        setOutputText(ydkContent);
        setSuccess("Successfully converted to YDK format!");
      } else {
        const listContent = convertYDKToList(inputText);
        setOutputText(listContent);
        setSuccess("Successfully converted to list format!");
      }
    } catch (err) {
      console.error("Conversion error:", err);
      setError(
        `Error during conversion: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const handleClear = () => {
    setInputText("");
    setOutputText("");
    setError("");
    setSuccess("");
  };

  const handleCopyToClipboard = () => {
    if (!outputText) {
      setError("No output to copy");
      return;
    }

    navigator.clipboard
      .writeText(outputText)
      .then(() => {
        setSuccess("Copied to clipboard!");
      })
      .catch((err) => {
        setError(`Failed to copy: ${err.message}`);
      });
  };

  const handleDownloadYDK = () => {
    if (!outputText || activeTab !== "list-to-ydk") {
      setError("No YDK content to download");
      return;
    }

    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deck.ydk";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess("YDK file downloaded!");
  };

  return (
    <Container $size={size}>
      <Title>Deck Format Converter</Title>

      {loading && (
        <div style={{ textAlign: "center", margin: theme.spacing.md }}>
          Loading card database... Please wait.
        </div>
      )}

      <TabContainer>
        <Tab
          $active={activeTab === "list-to-ydk"}
          onClick={() => setActiveTab("list-to-ydk")}
        >
          List → YDK
        </Tab>
        <Tab
          $active={activeTab === "ydk-to-list"}
          onClick={() => setActiveTab("ydk-to-list")}
        >
          YDK → List
        </Tab>
      </TabContainer>

      <Section>
        <Label>
          {activeTab === "list-to-ydk" ? "Paste Deck List:" : "Paste YDK Content:"}
        </Label>
        <TextArea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            activeTab === "list-to-ydk"
              ? 'Format: "3x Ash Blossom & Joyous Spring" (one card per line, with sections "Main Deck:", "Extra Deck:", "Side Deck:")'
              : "Paste YDK file content here..."
          }
          disabled={loading}
        />
      </Section>

      <ButtonContainer>
        <Button $primary onClick={handleConvert} disabled={loading || !dbLoaded}>
          Convert
        </Button>
        <Button onClick={handleClear} disabled={loading}>
          Clear
        </Button>
        {outputText && <Button onClick={handleCopyToClipboard}>Copy Result</Button>}
        {outputText && activeTab === "list-to-ydk" && (
          <Button onClick={handleDownloadYDK}>Download YDK</Button>
        )}
      </ButtonContainer>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      {outputText && (
        <ResultContainer>
          <Label>Result:</Label>
          <TextArea value={outputText} readOnly />
        </ResultContainer>
      )}

      <InfoSection>
        <p>This tool uses the official card database to convert between formats.</p>
        <p>
          The YDK format is used by many Yu-Gi-Oh simulators like YGOPro, EDOPro,
          and Dueling Book.
        </p>
      </InfoSection>
    </Container>
  );
};

export default DeckConverter;
