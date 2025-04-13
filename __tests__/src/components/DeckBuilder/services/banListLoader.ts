import { CardBanStatus } from "../utils";
import banlistData from "../data/banlist.json";
import { banListService } from "./banListService";

/**
 * Loads a ban list from the provided JSON file
 * @returns A map of card IDs to their ban status
 */
export function loadBanList(): Record<number, CardBanStatus> {
  const banList: Record<number, CardBanStatus> = {};

  // Process forbidden cards
  banlistData.forbidden.forEach((card) => {
    banList[card.id] = "forbidden";
  });

  // Process limited cards
  banlistData.limited.forEach((card) => {
    banList[card.id] = "limited";
  });

  // Process semi-limited cards
  banlistData["semi-limited"].forEach((card) => {
    banList[card.id] = "semi-limited";
  });

  // All other cards are considered unlimited

  return banList;
}

/**
 * Updates the existing ban list in the application based on the JSON data
 * Use this when the app starts or when loading a new ban list
 */
export function initializeBanList(): void {
  // Load the ban list from JSON
  const banList = loadBanList();

  // Import the ban list into the service
  banListService.importBanList(
    banList,
    banlistData.formatInfo.name || "tcg",
    // Set expiration to a long time since this is our local data
    365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
  );

  console.log(`Loaded ban list from JSON: ${banlistData.formatInfo.name}`);
}
