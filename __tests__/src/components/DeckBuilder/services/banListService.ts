import { CardBanStatus } from "../utils";

// Interface for a ban list entry from an API
interface BanListEntry {
  id: number; // Card ID
  name: string; // Card name (optional but helpful for logging/debugging)
  status: CardBanStatus; // Ban status (forbidden, limited, semi-limited, unlimited)
  format?: string; // Format (e.g., "TCG", "OCG", etc.)
  date?: string; // Date when this status became effective
}

// Type for cached ban list with expiration
interface CachedBanList {
  entries: Record<number, CardBanStatus>;
  timestamp: number;
  format: string;
  expirationMs: number;
}

// Format options for the ban list
export type BanListFormat = "tcg" | "ocg" | "goat" | "edison" | "current";

/**
 * Service to fetch and manage Yu-Gi-Oh ban lists from external sources
 */
class BanListService {
  private static instance: BanListService;
  private cache: Record<string, CachedBanList> = {};

  // Default cache expiration time (24 hours)
  private defaultCacheExpirationMs = 24 * 60 * 60 * 1000;

  // Base URL for ban list API
  private apiBaseUrl = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

  // Singleton pattern
  private constructor() {}

  public static getInstance(): BanListService {
    if (!BanListService.instance) {
      BanListService.instance = new BanListService();
    }
    return BanListService.instance;
  }

  /**
   * Fetches the ban list from an external API
   * @param format The format to get the ban list for
   * @param forceRefresh Whether to force a refresh even if cache is valid
   * @returns A promise that resolves to a record of card IDs to ban statuses
   */
  public async getBanList(
    format: BanListFormat = "current",
    forceRefresh = false
  ): Promise<Record<number, CardBanStatus>> {
    // Check if we have a valid cached version
    const cacheKey = `banlist_${format}`;
    const cachedData = this.cache[cacheKey];
    const now = Date.now();

    if (
      !forceRefresh &&
      cachedData &&
      now - cachedData.timestamp < cachedData.expirationMs
    ) {
      console.log(`Using cached ban list for format: ${format}`);
      return cachedData.entries;
    }

    // Need to fetch from API
    try {
      console.log(`Fetching ban list for format: ${format}`);

      // Construct the API URL based on the format
      let apiUrl = this.apiBaseUrl;
      let banlist = await this.fetchBanListFromAPI(format, apiUrl);

      // Cache the new ban list
      this.cache[cacheKey] = {
        entries: banlist,
        timestamp: now,
        format,
        expirationMs: this.defaultCacheExpirationMs,
      };

      return banlist;
    } catch (error) {
      console.error(`Error fetching ban list for format ${format}:`, error);

      // If we have an expired cache, it's better than nothing
      if (cachedData) {
        console.log(`Using expired cached ban list for format: ${format}`);
        return cachedData.entries;
      }

      // If all else fails, return an empty ban list
      return {};
    }
  }

  /**
   * Fetches ban list data from the API
   * This is a separate method to make it easier to modify the API implementation
   */
  private async fetchBanListFromAPI(
    format: BanListFormat,
    apiUrl: string
  ): Promise<Record<number, CardBanStatus>> {
    const banListMap: Record<number, CardBanStatus> = {};

    // Add query parameters based on format
    // For YGOPRODeck API, we'd use something like:
    // ?banlist=tcg for TCG ban list
    const params = new URLSearchParams();

    if (format === "current") {
      params.append("banlist", "tcg");
    } else {
      params.append("banlist", format);
    }

    try {
      const response = await fetch(`${apiUrl}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();

      // Process the response based on the API format
      // YGOPRODeck returns data in a different format than what we need
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((card: any) => {
          if (card.id && card.banlist_info) {
            // Map API ban status to our internal format
            let status: CardBanStatus = "unlimited";

            if (format === "tcg" || format === "current") {
              const tcgStatus = card.banlist_info.ban_tcg;
              if (tcgStatus === "Banned") status = "forbidden";
              else if (tcgStatus === "Limited") status = "limited";
              else if (tcgStatus === "Semi-Limited") status = "semi-limited";
            } else if (format === "ocg") {
              const ocgStatus = card.banlist_info.ban_ocg;
              if (ocgStatus === "Banned") status = "forbidden";
              else if (ocgStatus === "Limited") status = "limited";
              else if (ocgStatus === "Semi-Limited") status = "semi-limited";
            }

            banListMap[card.id] = status;
          }
        });
      }

      return banListMap;
    } catch (error) {
      console.error("Error fetching from ban list API:", error);
      // Return fallback hardcoded ban list in case of API failure
      return this.getFallbackBanList(format);
    }
  }

  /**
   * Gets a fallback ban list in case the API is unavailable
   * This contains a minimal set of commonly restricted cards
   */
  private getFallbackBanList(
    format: BanListFormat
  ): Record<number, CardBanStatus> {
    // Basic fallback list that's always applicable
    const commonBanList: Record<number, CardBanStatus> = {
      // Exodia pieces
      7902349: "forbidden", // Left Arm of the Forbidden One
      44519536: "forbidden", // Right Leg of the Forbidden One
      70903634: "forbidden", // Right Arm of the Forbidden One
      8124921: "forbidden", // Left Leg of the Forbidden One
      33396948: "limited", // Exodia the Forbidden One

      // Commonly limited cards
      11110587: "limited", // That Grass Looks Greener
      28566710: "limited", // Last Turn
      23002292: "limited", // Red-Eyes Dark Dragoon
      24224830: "limited", // Called by the Grave

      // Common semi-limited cards
      27174286: "semi-limited", // Return from the Different Dimension
      70368879: "semi-limited", // Upstart Goblin
      83764718: "semi-limited", // Monster Reborn
    };

    // Adding format-specific entries could be done here

    return commonBanList;
  }

  /**
   * Import ban list from a JSON file (helpful for offline use)
   * @param data The ban list data to import
   * @param format The format to associate with this ban list
   * @param expirationMs How long this import should be considered valid
   */
  public importBanList(
    data: Record<number, CardBanStatus>,
    format: string = "custom",
    expirationMs: number = this.defaultCacheExpirationMs
  ): void {
    const cacheKey = `banlist_${format}`;
    this.cache[cacheKey] = {
      entries: data,
      timestamp: Date.now(),
      format,
      expirationMs,
    };
    console.log(`Imported custom ban list for format: ${format}`);
  }

  /**
   * Gets the ban status of a specific card
   * @param cardId The card ID to check
   * @param format The format to check in
   */
  public async getCardBanStatus(
    cardId: number,
    format: BanListFormat = "current"
  ): Promise<CardBanStatus> {
    const banList = await this.getBanList(format);
    return banList[cardId] || "unlimited";
  }

  /**
   * Manually set the ban status for a card (for testing or custom formats)
   * @param cardId The card ID to set
   * @param status The ban status to set
   * @param format The format to set it for
   */
  public setBanStatus(
    cardId: number,
    status: CardBanStatus,
    format: string = "custom"
  ): void {
    const cacheKey = `banlist_${format}`;

    if (!this.cache[cacheKey]) {
      this.cache[cacheKey] = {
        entries: {},
        timestamp: Date.now(),
        format,
        expirationMs: this.defaultCacheExpirationMs,
      };
    }

    this.cache[cacheKey].entries[cardId] = status;
  }
}

// Export the singleton instance
export const banListService = BanListService.getInstance();

// Export a helper function to check if a card can be added based on ban status
export async function canAddCardToDeckByBanList(
  deck: any,
  cardId: number,
  format: BanListFormat = "current"
): Promise<boolean> {
  const currentCopies =
    deck.mainDeck.filter((c: any) => c.id === cardId).length +
    deck.extraDeck.filter((c: any) => c.id === cardId).length;

  const banStatus = await banListService.getCardBanStatus(cardId, format);

  // Maximum allowed copies based on ban status
  const maxAllowed = {
    forbidden: 0,
    limited: 1,
    "semi-limited": 2, // Using quotes to allow hyphen in property name
    unlimited: 3,
  }[banStatus];

  return currentCopies < maxAllowed;
}
