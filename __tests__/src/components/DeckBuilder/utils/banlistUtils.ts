import { Card, Deck } from "../types";

// Defines our internal ban status types
export type CardBanStatus =
  | "forbidden"
  | "limited"
  | "semi-limited"
  | "unlimited";

// Maximum allowed copies per card based on ban status
export const MAX_COPIES: Record<CardBanStatus, number> = {
  forbidden: 0,
  limited: 1,
  "semi-limited": 2,
  unlimited: 3,
};

/**
 * Gets the ban status of a card directly from its banlist_info property
 * @param card The card to check
 * @param format The format to check (tcg, ocg, goat)
 * @returns The ban status of the card
 */
export const getCardBanStatus = (
  card: Card,
  format: "tcg" | "ocg" | "goat" = "tcg"
): CardBanStatus => {
  // If there's no banlist_info, the card is unlimited
  if (!card.banlist_info) {
    return "unlimited";
  }

  // Get the ban status from the requested format
  const formatKey = `ban_${format}` as "ban_tcg" | "ban_ocg" | "ban_goat";
  const banStatus = card.banlist_info[formatKey];

  if (!banStatus) {
    return "unlimited";
  }

  // Map API ban status text to our internal format
  switch (banStatus) {
    case "Banned":
      return "forbidden";
    case "Limited":
      return "limited";
    case "Semi-Limited":
      return "semi-limited";
    default:
      return "unlimited";
  }
};

/**
 * Count how many copies of a card exist in a deck
 * @param deck The deck to check
 * @param cardId The card ID to check
 * @returns The number of copies in the deck
 */
export const getCardCopiesInDeck = (deck: Deck, cardId: number): number => {
  const mainDeckCopies = deck.mainDeck.filter(
    (card) => card.id === cardId
  ).length;
  const extraDeckCopies = deck.extraDeck.filter(
    (card) => card.id === cardId
  ).length;
  const sideDeckCopies =
    deck.sideDeck?.filter((card) => card.id === cardId).length || 0;

  return mainDeckCopies + extraDeckCopies + sideDeckCopies;
};

/**
 * Check if a card can be added to a deck based on ban list restrictions
 * @param deck The deck to check against
 * @param card The card to check
 * @param format The format to use for checking
 * @returns Whether the card can be added
 */
export const canAddCardToDeck = (
  deck: Deck,
  card: Card,
  format: "tcg" | "ocg" | "goat" = "tcg"
): boolean => {
  const banStatus = getCardBanStatus(card, format);
  const currentCopies = getCardCopiesInDeck(deck, card.id);
  const maxAllowed = MAX_COPIES[banStatus];

  return currentCopies < maxAllowed;
};

/**
 * Get a user-friendly message about card's ban status
 * @param card The card to check
 * @param format The format to check
 * @returns A user-friendly message about the card's ban status
 */
export const getBanStatusMessage = (
  card: Card,
  format: "tcg" | "ocg" | "goat" = "tcg"
): string => {
  const banStatus = getCardBanStatus(card, format);

  switch (banStatus) {
    case "forbidden":
      return `${
        card.name
      } is forbidden in official ${format.toUpperCase()} play.`;
    case "limited":
      return `${
        card.name
      } is limited to 1 copy in ${format.toUpperCase()} format.`;
    case "semi-limited":
      return `${
        card.name
      } is semi-limited to 2 copies in ${format.toUpperCase()} format.`;
    default:
      return `${
        card.name
      } has no restrictions in ${format.toUpperCase()} format.`;
  }
};
