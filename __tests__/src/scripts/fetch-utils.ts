import type { DeckData } from "./ydk-parser";

const YGOPRODECK_API_URL = "https://db.ygoprodeck.com/api/v7";

export async function getCard(id: number) {
  // Fallback to YGOProDeck API if local API fails or card not found
  const response = await fetch(`${YGOPRODECK_API_URL}/cardinfo.php?id=${id}&misc=yes`);
  if (!response.ok) throw new Error("failed to fetch");
  const cardsResult: any = await response.json();
  const card = cardsResult.data[0];

  if (card) {
    card.konami_id = card.misc_info[0].konami_id;

    delete card.card_sets;
    delete card.card_prices;
    delete card.misc_info;
  }

  return card;
}

export async function downloadDeck(
  deckData: DeckData,
  {
    events,
    deckName,
  }:
    | {
      events?: {
        onProgess: (args: {
          cardDownloaded: number;
          totalCards: number;
        }) => void;
      };
      deckName?: string;
    }
    | undefined = {}
) {
  const mainDeckArray = Array.isArray(deckData.mainDeck)
    ? deckData.mainDeck
    : [];
  const extraDeckArray = Array.isArray(deckData.extraDeck)
    ? deckData.extraDeck
    : [];
  const sideDeckArray = Array.isArray(deckData.sideDeck)
    ? deckData.sideDeck
    : [];

  const cards = new Set<number>();
  const cardsDownloaded = new Map();

  [...mainDeckArray, ...extraDeckArray, ...sideDeckArray].forEach((cardId) =>
    cards.add(cardId)
  );

  const cardsToFetch = Array.from(cards.values());
  let cardDownloaded = 0;
  let totalCards = cardsToFetch.length;

  await Promise.all(
    cardsToFetch.map(async (id) => {
      try {
        const card = await getCard(id);
        cardsDownloaded.set(id, card);
        events?.onProgess({ cardDownloaded: ++cardDownloaded, totalCards });
      } catch (error) {
        console.error(`Failed to download card with ID ${id}:`, error);
        events?.onProgess({ cardDownloaded: ++cardDownloaded, totalCards });
      }
    })
  );

  const deck = {
    name: deckName || "Imported Deck",
    mainDeck: mainDeckArray
      .map((cardId) => cardsDownloaded.get(cardId))
      .filter(Boolean),
    extraDeck: extraDeckArray
      .map((cardId) => cardsDownloaded.get(cardId))
      .filter(Boolean),
    sideDeck: sideDeckArray
      .map((cardId) => cardsDownloaded.get(cardId))
      .filter(Boolean),
  };

  return deck;
}