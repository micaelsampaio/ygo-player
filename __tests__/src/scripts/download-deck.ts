// TODO @mica maybe move this to a utils file
import { DeckData } from "./ydk-parser";

// Configuration for the data sources
const CARD_DATA_URL =
  import.meta.env.VITE_CARD_DATA_URL || "http://localhost:8081";
const ANALYZER_API_URL =
  import.meta.env.VITE_ANALYZER_API_URL || "http://localhost:3000/api";

// Cache for card data to avoid multiple requests for the same cards
let cardCache: Record<number, any> = {};
let allCardsData: any[] | null = null;

/**
 * Fetches a single card by ID from the local card data service
 */
export async function getCard(id: number) {
  // Check cache first
  if (cardCache[id]) {
    return cardCache[id];
  }

  // If we already have all cards, find by ID
  if (allCardsData) {
    const card = allCardsData.find((card) => card.id === id);
    if (card) {
      // Create a copy to avoid modifying the original data
      const cardCopy = { ...card };

      // Set konami_id if it doesn't exist
      if (!cardCopy.konami_id && cardCopy.misc_info && cardCopy.misc_info[0]) {
        cardCopy.konami_id = cardCopy.misc_info[0].konami_id;
      }

      // Clean up unnecessary data
      delete cardCopy.card_sets;
      delete cardCopy.card_prices;
      delete cardCopy.misc_info;

      // Cache and return
      cardCache[id] = cardCopy;
      return cardCopy;
    }
  }

  try {
    // If we don't have all cards yet, fetch all cards once
    // (more efficient than individual API calls)
    const response = await fetch(`${CARD_DATA_URL}/cards.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch cards data: ${response.status}`);
    }

    const result = await response.json();
    allCardsData = result.data || [];

    // Find the card in the data
    const card = allCardsData.find((card) => card.id === id);

    if (!card) {
      console.warn(`Card with ID ${id} not found in the database`);
      return null;
    }

    // Create a copy to avoid modifying the original data
    const cardCopy = { ...card };

    // Set konami_id if it doesn't exist
    if (!cardCopy.konami_id && cardCopy.misc_info && cardCopy.misc_info[0]) {
      cardCopy.konami_id = cardCopy.misc_info[0].konami_id;
    }

    // Clean up unnecessary data
    delete cardCopy.card_sets;
    delete cardCopy.card_prices;
    delete cardCopy.misc_info;

    // Cache and return
    cardCache[id] = cardCopy;
    return cardCopy;
  } catch (error) {
    console.error(`Error fetching card ${id}:`, error);

    // Fallback to YGOPRODeck API if local service fails
    try {
      const response = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${id}&misc=yes`
      );
      if (!response.ok) throw new Error("failed to fetch from YGOPRODeck");

      const cardsResult: any = await response.json();
      const card = cardsResult.data[0];

      if (card) {
        card.konami_id = card.misc_info[0].konami_id;

        delete card.card_sets;
        delete card.card_prices;
        delete card.misc_info;

        // Cache and return
        cardCache[id] = card;
      }

      return card;
    } catch (fallbackError) {
      console.error(
        `Fallback fetch for card ${id} also failed:`,
        fallbackError
      );
      return null;
    }
  }
}

export async function downloadDeck(
  deckData: DeckData,
  {
    events,
  }:
    | {
        events?: {
          onProgess: (args: {
            cardDownloaded: number;
            totalCards: number;
          }) => void;
        };
      }
    | undefined = {}
) {
  const cards = new Set<number>();
  const cardsDownloaded = new Map();
  [...deckData.mainDeck, ...deckData.extraDeck].forEach((cardId) =>
    cards.add(cardId)
  );
  const cardsToFetch = Array.from(cards.values());
  let cardDownloaded = 0;
  let totalCards = cardsToFetch.length;

  await Promise.all(
    cardsToFetch.map(async (id) => {
      const card = await getCard(id);
      cardsDownloaded.set(id, card);
      events?.onProgess({ cardDownloaded: ++cardDownloaded, totalCards });
    })
  );
  console.log("MAIN DEKC ", cardsDownloaded);
  return {
    mainDeck: deckData.mainDeck.map((cardId) => cardsDownloaded.get(cardId)!),
    extraDeck: deckData.extraDeck.map((cardId) => cardsDownloaded.get(cardId)!),
  };
}
