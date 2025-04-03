import { YGODeckToImage } from "ygo-core-images-utils";

const cardImagesUrl = String(import.meta.env.VITE_YGO_CDN_URL);

export async function downloadDeckAsPng(deckId: string, deck: any) {
  const fileName = deckId + ".png";
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden"; // Hide the container
  document.documentElement.appendChild(container);

  try {
    const deckBuilder = new YGODeckToImage({
      name: deckId,
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
      cdnUrl: import.meta.env.VITE_YGO_CDN_URL,
    });
    await deckBuilder.toImage({ fileName, download: true });
  } finally {
    // Always remove the container
    container.remove();
  }
}

export function downloadDeckAsYdk(deckId: string, deck: any) {
  const fileName = deckId + ".ydk";
  const deckBuilder = new YGODeckToImage({
    mainDeck: deck.mainDeck,
    extraDeck: deck.extraDeck,
    cardImagesUrl,
  });
  deckBuilder.downloadYdk({ fileName });
}

export async function exportDeckToClipboard(deckId: string, deck: any) {
  const deckExporter = new YGODeckToImage({
    name: deckId,
    mainDeck: deck.mainDeck,
    extraDeck: deck.extraDeck,
  });

  try {
    const ydkContent = deckExporter.toYdkString();
    await navigator.clipboard.writeText(ydkContent);
  } catch (error) {
    console.error("Failed to export deck to clipboard:", error);
    throw new Error("Failed to copy deck to clipboard");
  }
}
