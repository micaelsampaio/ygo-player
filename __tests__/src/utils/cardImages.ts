import { Card } from "../components/DeckBuilder/types";

// Get the CDN URL from environment variables
const CDN_URL = import.meta.env.VITE_YGO_CDN_URL || "http://127.0.0.1:8080";

/**
 * Get the URL for a card image from the configured CDN
 * @param card The card object or card ID
 * @param size The size of the image to fetch ('small' or 'normal')
 * @returns The full URL to the card image
 */
export const getCardImageUrl = (
  card: Card | string | number,
  size: "small" | "normal" = "normal"
): string => {
  // Extract the card ID depending on the input type
  const cardId = typeof card === "object" ? card.id : card;

  if (!cardId) {
    console.warn("Attempting to get image URL for card with no ID", card);
    return `${CDN_URL}/images/cards/card_back.jpg`;
  }

  // Build the URL path based on the requested size
  const imagePath =
    size === "small"
      ? `/images/cards_small/${cardId}.jpg`
      : `/images/cards/${cardId}.jpg`;

  return `${CDN_URL}${imagePath}`;
};

/**
 * Create an image element with appropriate fallback handling
 * @param card The card to create an image for
 * @param size The size of the image
 * @param className Optional CSS class name for the image
 * @returns An image element with error handling
 */
export const createCardImageElement = (
  card: Card,
  size: "small" | "normal" = "normal",
  className?: string
): HTMLImageElement => {
  const img = document.createElement("img");
  img.src = getCardImageUrl(card, size);
  if (className) img.className = className;
  img.alt = card.name || "Card";

  // Set up fallback for error
  img.onerror = () => {
    img.src = `${CDN_URL}/images/cards/card_back.jpg`;
    img.classList.add("card-image-fallback");
  };

  return img;
};

/**
 * Preload commonly used card images to improve performance
 */
export const preloadCommonCardImages = () => {
  // Card back is always needed
  const cardBack = new Image();
  cardBack.src = `${CDN_URL}/images/cards/card_back.jpg`;

  // You could also preload other commonly used cards
  // const commonCards = [1234, 5678, 9012]; // Example card IDs
  // commonCards.forEach(id => {
  //   const img = new Image();
  //   img.src = getCardImageUrl(id);
  // });
};

// Call this early in your app initialization
// For example in App.tsx or your main entry point
// preloadCommonCardImages();
