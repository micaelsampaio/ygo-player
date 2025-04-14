import { Card, Deck } from "../DeckBuilder/types";
import { parseYdkFile } from "./ydkParser";
import { parseOmegaUrl } from "./omegaParser";

const LOCAL_API_URL =
  import.meta.env.VITE_CARD_DATA_URL || "http://localhost:8081";
const YGOPRODECK_API_URL = "https://db.ygoprodeck.com/api/v7";

/**
 * Download a card from the local data service or falls back to YGOPRODeck API
 */
export const getCard = async (id: number): Promise<Card> => {
  try {
    // First try the local data service
    const response = await fetch(`${LOCAL_API_URL}/card/${id}`);
    if (response.ok) {
      const data = await response.json();
      return mapYgoDataToCard(data);
    }

    // Fall back to YGOPRODeck API if local service fails
    console.log(`Card ${id} not found in local service, trying YGOPRODeck API`);
    const apiResponse = await fetch(
      `${YGOPRODECK_API_URL}/cardinfo.php?id=${id}`
    );
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      return mapYgoProDeckCardToCard(data.data[0]);
    }

    throw new Error(`Card with ID ${id} not found in either service`);
  } catch (error) {
    console.error("Error fetching card:", error);
    // Return a placeholder card
    return {
      id,
      name: `Unknown Card (${id})`,
      type: "Unknown",
      desc: "Card data could not be loaded",
      // Add minimal required properties
      race: "Unknown",
      attribute: "",
      archetype: "",
      atk: 0,
      def: 0,
      level: 0,
      scale: 0,
      linkval: 0,
      linkmarkers: [],
    };
  }
};

/**
 * Map card data from local ygo-data service to Card type
 */
const mapYgoDataToCard = (cardData: any): Card => {
  return {
    id: cardData.id,
    name: cardData.name,
    type: cardData.type,
    desc: cardData.desc,
    race: cardData.race,
    attribute: cardData.attribute,
    archetype: cardData.archetype,
    atk: cardData.atk,
    def: cardData.def,
    level: cardData.level,
    scale: cardData.scale,
    linkval: cardData.linkval,
    linkmarkers: cardData.linkmarkers || [],
  };
};

/**
 * Map card data from the YGOPRODeck API to Card type
 */
const mapYgoProDeckCardToCard = (cardData: any): Card => {
  return {
    id: cardData.id,
    name: cardData.name,
    type: cardData.type,
    desc: cardData.desc,
    race: cardData.race,
    attribute: cardData.attribute,
    archetype: cardData.archetype,
    atk: cardData.atk || 0,
    def: cardData.def || 0,
    level: cardData.level || 0,
    scale: cardData.scale || 0,
    linkval: cardData.linkval || 0,
    linkmarkers: cardData.linkmarkers || [],
  };
};

/**
 * Download a full deck based on card IDs
 */
export const downloadDeck = async (
  mainDeckIds: number[],
  extraDeckIds: number[],
  sideDeckIds: number[],
  name: string = "Imported Deck"
): Promise<Deck> => {
  // Get all unique card IDs to download
  const uniqueIds = Array.from(
    new Set([...mainDeckIds, ...extraDeckIds, ...sideDeckIds])
  );

  // Download all cards in parallel
  const cardsMap = new Map<number, Card>();
  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const card = await getCard(id);
        cardsMap.set(id, card);
      } catch (error) {
        console.error(`Failed to download card with ID ${id}:`, error);
      }
    })
  );

  // Build deck from downloaded cards
  const deck: Deck = {
    name,
    mainDeck: mainDeckIds
      .map((id) => cardsMap.get(id))
      .filter((card): card is Card => !!card),
    extraDeck: extraDeckIds
      .map((id) => cardsMap.get(id))
      .filter((card): card is Card => !!card),
    sideDeck: sideDeckIds
      .map((id) => cardsMap.get(id))
      .filter((card): card is Card => !!card),
  };

  return deck;
};

/**
 * Import a deck from a YDK file
 */
export const importDeckFromYdk = async (
  ydkContent: string,
  name: string = "Imported YDK Deck"
): Promise<Deck> => {
  const { mainDeckIds, extraDeckIds, sideDeckIds } = parseYdkFile(ydkContent);
  return downloadDeck(mainDeckIds, extraDeckIds, sideDeckIds, name);
};

/**
 * Import a deck from an Omega URL
 */
export const importDeckFromOmegaUrl = async (
  url: string,
  name: string = "Imported Omega Deck"
): Promise<Deck> => {
  const { mainDeckIds, extraDeckIds, sideDeckIds } = parseOmegaUrl(url);
  return downloadDeck(mainDeckIds, extraDeckIds, sideDeckIds, name);
};
