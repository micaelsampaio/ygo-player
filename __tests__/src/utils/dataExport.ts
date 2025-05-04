import pako from "pako";
import { ydkeToJson } from "./ydke-parser";
import { downloadDeck } from "./download-deck";
import { YGODeckToImage } from "ygo-core-images-utils";

const getDecksData = () => {
  const allKeys = Object.keys(localStorage);
  const decksData: Record<string, string> = {}; // Changed type to string for YDKE URLs

  allKeys
    .filter((key) => key.startsWith("deck_"))
    .forEach((key) => {
      try {
        const deck = JSON.parse(localStorage.getItem(key) || "");
        // Convert deck to YDKE URL
        const deckExporter = new YGODeckToImage({
          name: key,
          mainDeck: deck.mainDeck,
          extraDeck: deck.extraDeck,
        });
        decksData[key] = deckExporter.toYDKE();
      } catch (err) {
        console.error(`Error processing deck ${key}:`, err);
      }
    });

  return decksData;
};

const getReplaysData = () => {
  const allKeys = Object.keys(localStorage);
  const replaysData: Record<string, any> = {};

  allKeys
    .filter((key) => key.startsWith("replay_"))
    .forEach((key) => {
      try {
        replaysData[key] = JSON.parse(localStorage.getItem(key) || "");
      } catch (err) {
        console.error(`Error parsing replay ${key}:`, err);
      }
    });

  return replaysData;
};

const getCollectionsData = () => {
  const allKeys = Object.keys(localStorage);
  const collectionsData: Record<string, any> = {};

  allKeys
    .filter((key) => key.startsWith("c_"))
    .forEach((key) => {
      try {
        collectionsData[key] = JSON.parse(localStorage.getItem(key) || "");
      } catch (err) {
        console.error(`Error parsing collection ${key}:`, err);
      }
    });

  return collectionsData;
};

export const exportAllData = async (method: "file" | "qr") => {
  const data = {
    decks: getDecksData(),
    replays: getReplaysData(),
    collections: getCollectionsData(),
    exportDate: new Date().toISOString(),
    version: "1.0.0",
  };

  const jsonString = JSON.stringify(data);

  if (method === "qr") {
    try {
      // Compress data using pako
      const compressed = pako.deflate(jsonString);
      const base64 = btoa(String.fromCharCode.apply(null, compressed as any));
      console.log(base64.length);
      if (base64.length > 4296) {
        throw new Error(
          "Data size too large for QR code. Please use file export instead."
        );
      }

      return base64;
    } catch (err) {
      console.error("Compression error:", err);
      throw new Error("Failed to compress data");
    }
  }

  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ygo-data-export-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importAllData = async (file: File | Blob) => {
  try {
    const content = await file.text();
    let data;

    // Try to parse as compressed data first
    try {
      const binary = atob(content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const decompressed = pako.inflate(bytes, { to: "string" });
      data = JSON.parse(decompressed);
    } catch (e) {
      // If decompression fails, try parsing as regular JSON
      data = JSON.parse(content);
    }

    // Validate data structure
    if (!data.decks || !data.replays || !data.version) {
      throw new Error("Invalid data format");
    }

    // Import decks from YDKE URLs
    for (const [key, ydkeUrl] of Object.entries(data.decks)) {
      try {
        const deckData = ydkeToJson(ydkeUrl as string);
        const importedDeckData = await downloadDeck(deckData);
        const deckId = crypto.randomUUID();

        localStorage.setItem(
          `deck_${deckId}`,
          JSON.stringify({
            id: deckId,
            name: key,
            mainDeck: importedDeckData.mainDeck || [],
            extraDeck: importedDeckData.extraDeck || [],
            sideDeck: importedDeckData.sideDeck || [],
            importedAt: new Date().toISOString(),
          })
        );
      } catch (err) {
        console.error(`Error importing deck ${key}:`, err);
      }
    }

    // Import replays
    Object.entries(data.replays).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });

    const currentCollectionData = JSON.parse(
      window.localStorage.getItem("collections_details") || "[]"
    );

    Object.entries(data.collections || {}).forEach(([key, value]: any) => {
      localStorage.setItem(key, JSON.stringify(value));

      if (
        !currentCollectionData.find(
          (collectionItem: any) => collectionItem.id === value.id
        )
      ) {
        currentCollectionData.push(value);
      }
    });

    window.localStorage.setItem(
      "collections_details",
      JSON.stringify(currentCollectionData)
    );

    return {
      decksCount: Object.keys(data.decks).length,
      replaysCount: Object.keys(data.replays).length,
      collectionsCount: Object.entries(data.collections || {}).length,
    };
  } catch (err) {
    console.error("Error importing data:", err);
    throw new Error("Failed to import data. Make sure the file is valid.");
  }
};

/**
 * Import data from file or text input (YDKE URLs)
 */
export async function importDeckFromYdke(
  ydkeUrl: string,
  deckName: string
): Promise<boolean> {
  try {
    const deckData = ydkeToJson(ydkeUrl);
    const importedDeckData = await downloadDeck(deckData);
    const deckId = crypto.randomUUID();

    localStorage.setItem(
      `deck_${deckId}`,
      JSON.stringify({
        id: deckId,
        name: deckName,
        mainDeck: importedDeckData.mainDeck || [],
        extraDeck: importedDeckData.extraDeck || [],
        sideDeck: importedDeckData.sideDeck || [],
        importedAt: new Date().toISOString(),
      })
    );
    return true;
  } catch (err) {
    console.error(`Error importing deck ${deckName}:`, err);
    return false;
  }
}
