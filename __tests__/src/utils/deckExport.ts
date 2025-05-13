import { YGODeckToImage } from "ygo-core-images-utils";
import { getCardImageUrl } from "./cardImages";

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

/**
 * Generates a deck preview image for social media sharing
 * @param deck The deck to generate a preview for
 * @param options Additional options for the preview
 * @returns The URL of the generated preview image
 */
export async function generateDeckPreviewImage(
  deck: any,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    baseUrl?: string;
  } = {}
) {
  const {
    width = 1200,
    height = 630,
    quality = 85,
    baseUrl = window.location.origin,
  } = options;

  // Create a canvas for the preview image
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  // Set background
  ctx.fillStyle = "#f0f5ff";
  ctx.fillRect(0, 0, width, height);

  // Add title and deck info
  ctx.fillStyle = "#333";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText(deck.name || "Yu-Gi-Oh! Deck", width / 2, 80);

  ctx.font = "24px Arial";
  ctx.fillText(
    `Main: ${deck.mainDeck.length} | Extra: ${deck.extraDeck.length}${
      deck.sideDeck?.length ? ` | Side: ${deck.sideDeck.length}` : ""
    }`,
    width / 2,
    120
  );

  // Calculate card display positions
  const cardSize = { width: 100, height: 146 };
  const margin = 10;
  const maxCardsPerRow = Math.min(
    10,
    Math.floor((width - 2 * margin) / (cardSize.width + margin))
  );
  const startX =
    (width - (maxCardsPerRow * (cardSize.width + margin) - margin)) / 2;

  try {
    // Draw main deck cards (up to a reasonable limit)
    const cardsToDisplay = deck.mainDeck.slice(0, 20); // Limit to 20 cards for the preview

    for (let i = 0; i < cardsToDisplay.length; i++) {
      const card = cardsToDisplay[i];
      const row = Math.floor(i / maxCardsPerRow);
      const col = i % maxCardsPerRow;

      const x = startX + col * (cardSize.width + margin);
      const y = 180 + row * (cardSize.height + margin);

      // Try to draw card image
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        const cardUrl =
          card.card_images?.[0]?.image_url_small ||
          getCardImageUrl(card.id, "small");

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = cardUrl;
        });

        ctx.drawImage(img, x, y, cardSize.width, cardSize.height);
      } catch (e) {
        // If card image fails, draw a placeholder
        ctx.fillStyle = "#ddd";
        ctx.fillRect(x, y, cardSize.width, cardSize.height);
        ctx.fillStyle = "#999";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Card", x + cardSize.width / 2, y + cardSize.height / 2);
      }
    }

    // Add site branding
    ctx.fillStyle = "#333";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `View full deck on YGO101 | ${baseUrl}`,
      width / 2,
      height - 30
    );

    // Convert canvas to data URL
    return canvas.toDataURL("image/jpeg", quality / 100);
  } catch (error) {
    console.error("Error generating deck preview:", error);
    return null;
  }
}

/**
 * Saves a deck preview image for social media sharing
 * Creates the image and uploads it to the server for sharing
 * @param deckId Unique identifier for the deck
 * @param deck The deck data
 * @returns The URL to the saved preview image
 */
export async function saveSocialSharePreview(
  deckId: string,
  deck: any
): Promise<string> {
  try {
    // Generate the preview image
    const previewDataUrl = await generateDeckPreviewImage(deck, {
      baseUrl: window.location.origin,
    });

    if (!previewDataUrl) {
      throw new Error("Failed to generate preview image");
    }

    // Convert the data URL to a blob
    const response = await fetch(previewDataUrl);
    const blob = await response.blob();

    // Create form data to send to the server
    const formData = new FormData();
    formData.append("image", blob, `${deckId}.jpg`);
    formData.append("deckId", deckId);

    // Upload to server
    const uploadResponse = await fetch(
      `${import.meta.env.VITE_API_URL || ""}/api/deck-previews/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload preview image");
    }

    const result = await uploadResponse.json();
    return (
      result.imageUrl || `${window.location.origin}/previews/${deckId}.jpg`
    );
  } catch (error) {
    console.error("Error saving deck preview:", error);
    // Return a default image path if there's an error
    return `${window.location.origin}/images/default-deck-preview.jpg`;
  }
}
