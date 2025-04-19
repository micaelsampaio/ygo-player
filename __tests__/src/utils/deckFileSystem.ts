/**
 * Utility functions for managing deck files in the file system
 * Browser-only version
 */

import { Deck } from "../components/DeckBuilder/types";
import { importDeckFromYdk } from "./download-deck";
import { downloadDeck } from "./download-deck";
import { ydkToJson } from "./ydk-parser";

// Check if we're in a browser environment (always should be true)
const isBrowser = typeof window !== "undefined";

/**
 * Exports a deck to a file in the browser
 * @param deck The deck to export
 * @param format The format to export as ('ydk' or 'json')
 * @returns Promise that resolves when the export is complete
 */
export const exportDeckToBrowser = async (
  deck: Deck,
  format: "ydk" | "json" = "json"
): Promise<void> => {
  try {
    const fileName = `${deck.name.replace(/[/\\?%*:|"<>]/g, "-")}.${format}`;

    let fileContent: string;
    if (format === "ydk") {
      // Generate YDK format
      fileContent = generateYdkContent(deck);
    } else {
      // Generate JSON format
      fileContent = JSON.stringify(deck, null, 2);
    }

    // Create a blob and download it
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(`Error exporting deck "${deck.name}":`, error);
    throw new Error(`Failed to export deck "${deck.name}"`);
  }
};

/**
 * Reads the content of a file as text
 * @param file The file to read
 * @returns Promise that resolves with the file content as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

/**
 * Process multiple deck files and convert them to Deck objects
 * @param files The files to process
 * @param setProgress Optional callback to report progress
 * @returns Promise with the processed decks and any errors
 */
export const processFiles = async (
  files: File[],
  setProgress?: (state: {
    isProcessing: boolean;
    status: string;
    imported: number;
    exported: number;
    errors: string[];
  }) => void
): Promise<{
  imported: Deck[];
  errors: string[];
}> => {
  try {
    if (setProgress) {
      setProgress({
        isProcessing: true,
        status: "Processing...",
        imported: 0,
        exported: 0,
        errors: [],
      });
    }

    // Read and process each file
    const imported: Deck[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fileContent = await readFileAsText(file);
        const extension = file.name
          .slice(file.name.lastIndexOf("."))
          .toLowerCase();
        const fileName = file.name.slice(0, file.name.lastIndexOf("."));

        if (extension === ".json") {
          // Parse JSON deck
          const deck = JSON.parse(fileContent);
          if (deck.mainDeck && deck.extraDeck) {
            if (!deck.name) {
              deck.name = fileName;
            }
            imported.push(deck);
          } else {
            errors.push(`Invalid deck format in ${file.name}`);
          }
        } else if (extension === ".ydk") {
          // Parse YDK format
          try {
            const deckData = ydkToJson(fileContent);

            // Ensure deckData has the expected structure
            if (!deckData || !deckData.mainDeck || !deckData.extraDeck) {
              throw new Error("Invalid YDK format or empty deck");
            }

            // Convert the deck data to arrays if they aren't already
            const mainDeckArray = Array.isArray(deckData.mainDeck)
              ? deckData.mainDeck
              : [];
            const extraDeckArray = Array.isArray(deckData.extraDeck)
              ? deckData.extraDeck
              : [];

            // Call downloadDeck with the correct parameters
            const deck = await downloadDeck(
              {
                mainDeck: mainDeckArray,
                extraDeck: extraDeckArray,
              },
              {
                events: {
                  onProgess: ({ cardDownloaded, totalCards }) => {
                    if (setProgress) {
                      setProgress({
                        isProcessing: true,
                        status: `Downloading cards for ${fileName}...`,
                        imported: imported.length,
                        exported: 0,
                        errors: errors,
                      });
                    }
                  },
                },
              }
            );

            // Create proper deck object
            const importedDeck = {
              name: fileName,
              mainDeck: deck.mainDeck || [],
              extraDeck: deck.extraDeck || [],
              sideDeck: [], // Initialize empty side deck
            };

            imported.push(importedDeck);
          } catch (error) {
            errors.push(
              `Error parsing YDK file ${file.name}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        } else {
          errors.push(`Unsupported file type: ${file.name}`);
        }
      } catch (error) {
        errors.push(
          `Error processing file ${file.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (setProgress) {
      setProgress({
        isProcessing: false,
        status: "Completed",
        imported: imported.length,
        exported: 0,
        errors,
      });
    }

    return { imported, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error processing files:", error);

    if (setProgress) {
      setProgress({
        isProcessing: false,
        status: "Failed",
        imported: 0,
        exported: 0,
        errors: [`Error processing files: ${errorMessage}`],
      });
    }

    return {
      imported: [],
      errors: [`Error processing files: ${errorMessage}`],
    };
  }
};

/**
 * Browser-only version of syncing decks
 * @param decks Array of decks in the application
 * @param folderPath Ignored in browser version
 * @param direction Only 'export' is supported in browser
 * @param format The format to use for exporting ('ydk' or 'json')
 * @returns Object with the results of the operation
 */
export const syncDecksWithFolder = async (
  decks: Deck[],
  folderPath: string,
  direction: "import" | "export" | "both" = "both",
  format: "ydk" | "json" = "json"
): Promise<{
  imported: Deck[];
  exported: Deck[];
  errors: string[];
}> => {
  const imported: Deck[] = [];
  const exported: Deck[] = [];
  const errors: string[] = [];

  try {
    // Browser-specific logic
    if (direction === "export" || direction === "both") {
      // In browser, we can only export decks one by one
      if (
        confirm(
          `Do you want to export ${
            decks.length
          } deck(s) as ${format.toUpperCase()} files?`
        )
      ) {
        for (const deck of decks) {
          try {
            await exportDeckToBrowser(deck, format);
            exported.push(deck);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push(`Error exporting deck "${deck.name}": ${errorMessage}`);
          }
        }
      }
    }

    if (direction === "import" || direction === "both") {
      // For import in browser, we need to use the file input
      // This is already implemented in the DeckActions component
      errors.push(
        "Importing decks from a folder is not supported in the browser. Please use the 'Import Deck' button instead."
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error syncing decks:`, error);
    throw new Error(`Failed to sync decks: ${errorMessage}`);
  }

  return { imported, exported, errors };
};

/**
 * Generates YDK format content from a deck
 * @param deck The deck to convert
 * @returns YDK format string
 */
export const generateYdkContent = (deck: Deck): string => {
  const lines: string[] = [];

  // YDK header
  lines.push("#created by YGO Deck Builder");
  lines.push("#main");

  // Main deck cards
  for (const card of deck.mainDeck) {
    lines.push(card.id.toString());
  }

  // Extra deck section
  lines.push("#extra");

  // Extra deck cards
  for (const card of deck.extraDeck) {
    lines.push(card.id.toString());
  }

  // Side deck section
  lines.push("!side");

  // Side deck cards
  if (Array.isArray(deck.sideDeck)) {
    for (const card of deck.sideDeck) {
      lines.push(card.id.toString());
    }
  }

  return lines.join("\n");
};
