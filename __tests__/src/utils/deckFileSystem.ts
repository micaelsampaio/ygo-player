/**
 * Utility functions for managing deck files in the file system
 */

import { Deck } from "../components/DeckBuilder/types";
import { downloadDeck } from "../components/DeckImport/download-deck";
import { ydkToJson } from "../scripts/ydk-parser";
import { ydkeToJson } from "../scripts/ydke-parser";
// Remove Node.js fs and path imports
// import * as fs from "fs";
// import * as path from "path";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

/**
 * Exports a deck to a file in the specified folder
 * @param deck The deck to export
 * @param folderPath The folder to export to
 * @param format The format to export as ('ydk' or 'json')
 * @returns Promise that resolves when the export is complete
 */
export const exportDeckToFolder = async (
  deck: Deck,
  folderPath: string,
  format: "ydk" | "json" = "json"
): Promise<string> => {
  if (isBrowser) {
    throw new Error("File system operations are not supported in the browser.");
  }

  try {
    const fs = await import("fs");
    const path = await import("path");

    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fileName = `${deck.name.replace(/[/\\?%*:|"<>]/g, "-")}.${format}`;
    const filePath = path.join(folderPath, fileName);

    let fileContent: string;
    if (format === "ydk") {
      // Generate YDK format
      fileContent = generateYdkContent(deck);
    } else {
      // Generate JSON format
      fileContent = JSON.stringify(deck, null, 2);
    }

    // Write to file
    fs.writeFileSync(filePath, fileContent);

    return filePath;
  } catch (error) {
    console.error(`Error exporting deck "${deck.name}" to folder:`, error);
    throw new Error(`Failed to export deck "${deck.name}" to folder`);
  }
};

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
 * Imports all decks from a folder
 * @param folderPath The folder to import from
 * @returns Array of imported decks
 */
export const importDecksFromFolder = async (
  folderPath: string
): Promise<Deck[]> => {
  if (isBrowser) {
    throw new Error("File system operations are not supported in the browser.");
  }

  try {
    const fs = await import("fs");
    const path = await import("path");

    if (!fs.existsSync(folderPath)) {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }

    const files = fs.readdirSync(folderPath);
    const decks: Deck[] = [];
    const importPromises: Promise<void>[] = [];

    // Process each file
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        const extension = path.extname(file).toLowerCase();
        const deckName = path.basename(file, extension);

        const importPromise = (async () => {
          try {
            let deck: Deck | null = null;

            if (extension === ".json") {
              // Import JSON deck
              const content = fs.readFileSync(filePath, "utf8");
              deck = JSON.parse(content);
            } else if (extension === ".ydk") {
              // Import YDK deck using our existing ydk-parser
              const content = fs.readFileSync(filePath, "utf8");
              const deckData = ydkToJson(content);
              deck = await downloadDeck(
                deckData.mainDeck || [],
                deckData.extraDeck || [],
                [], // No side deck from the parser
                deckName
              );
            }

            if (deck) {
              // Ensure deck has a name property
              if (!deck.name) {
                deck.name = deckName;
              }

              // Ensure deck has sideDeck property
              if (!Array.isArray(deck.sideDeck)) {
                deck.sideDeck = [];
              }

              decks.push(deck);
            }
          } catch (error) {
            console.error(`Error importing deck from "${filePath}":`, error);
          }
        })();

        importPromises.push(importPromise);
      }
    }

    // Wait for all import operations to complete
    await Promise.all(importPromises);

    return decks;
  } catch (error) {
    console.error(`Error importing decks from folder:`, error);
    throw new Error(`Failed to import decks from folder: ${error.message}`);
  }
};

/**
 * Syncs decks between the application and a folder
 * @param decks Array of decks in the application
 * @param folderPath The folder to sync with (ignored in browser)
 * @param direction The sync direction ('import', 'export', or 'both')
 * @param format The format to use for exporting ('ydk' or 'json')
 * @returns Object with the results of the sync operation
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
    if (isBrowser) {
      // Browser-specific logic
      if (direction === "export" || direction === "both") {
        // In browser, we can only export decks one by one
        // We'll show a dialog asking if the user wants to export each deck
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
              errors.push(
                `Error exporting deck "${deck.name}": ${error.message}`
              );
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
    } else {
      // Node.js-specific logic
      if (direction === "import" || direction === "both") {
        try {
          const importedDecks = await importDecksFromFolder(folderPath);
          imported.push(...importedDecks);
        } catch (error) {
          errors.push(`Error importing decks: ${error.message}`);
        }
      }

      if (direction === "export" || direction === "both") {
        for (const deck of decks) {
          try {
            const exportedPath = await exportDeckToFolder(
              deck,
              folderPath,
              format
            );
            exported.push({ ...deck, exportedPath });
          } catch (error) {
            errors.push(
              `Error exporting deck "${deck.name}": ${error.message}`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error syncing decks:`, error);
    throw new Error(`Failed to sync decks: ${error.message}`);
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
