/**
 * Utility functions for handling Yu-Gi-Oh! card images
 */

// Define supported image sizes
type ImageSize = "small" | "medium" | "large" | "normal";

/**
 * URL to the card back image that can be used as a placeholder or fallback
 * Using our own hosted version of the card back
 */
export const CARD_BACK_IMAGE = "/assets/images/cards/back.jpg";

/**
 * Gets the appropriate URL for a card image by ID
 * @param cardId - The Yu-Gi-Oh! card ID
 * @param size - The desired image size (small, medium, large)
 * @returns The URL to the card image
 */
export const getCardImageUrl = (
  cardId: number | string,
  size: ImageSize = "medium"
): string => {
  // Use our own card image API/CDN instead of direct YGOPro links
  const baseUrl = "/assets/images/cards";

  // Ensure cardId is a string
  const id = String(cardId);

  try {
    // Check if we have the image locally first
    switch (size) {
      case "small":
        return `${baseUrl}/small/${id}.jpg`;
      case "large":
        return `${baseUrl}/large/${id}.jpg`;
      case "normal":
        return `${baseUrl}/normal/${id}.jpg`;
      case "medium":
      default:
        return `${baseUrl}/medium/${id}.jpg`;
    }
  } catch (error) {
    console.error(`Error loading card image for ID ${id}:`, error);
    return CARD_BACK_IMAGE;
  }
};

/**
 * Gets a fallback image URL to use when a card image can't be loaded
 */
export const getCardBackImageUrl = (): string => {
  return CARD_BACK_IMAGE;
};

/**
 * Gets an appropriate URL for a card image with fallback to external source if needed
 * This provides compatibility if the local image is not available
 *
 * @param cardId - The Yu-Gi-Oh! card ID
 * @param size - The desired image size (small, medium, large)
 * @returns The URL to the card image
 */
export const getCardImageUrlWithFallback = (
  cardId: number | string,
  size: ImageSize = "medium"
): string => {
  // First try the local path
  const localUrl = getCardImageUrl(cardId, size);

  // If the local image fails to load, we can use this as a backup
  const backupUrl = getFallbackCardImageUrl(cardId, size);

  // In real use, you could implement error handling or a check for the image
  return localUrl;
};

/**
 * Gets a fallback external URL if the local image is not available
 * Only used as a backup and not directly by components
 *
 * @param cardId - The Yu-Gi-Oh! card ID
 * @param size - The desired image size
 * @returns External URL for fallback
 */
const getFallbackCardImageUrl = (
  cardId: number | string,
  size: ImageSize = "medium"
): string => {
  // We'll use YGOPro as a fallback
  const ygoproBaseUrl = "https://images.ygoprodeck.com/images/cards";
  const id = String(cardId);

  switch (size) {
    case "small":
      return `${ygoproBaseUrl}/small/${id}.jpg`;
    case "large":
      return `${ygoproBaseUrl}/${id}.jpg`;
    case "normal":
      return `${ygoproBaseUrl}/${id}.jpg`;
    case "medium":
    default:
      return `${ygoproBaseUrl}/cropped/${id}.jpg`;
  }
};
