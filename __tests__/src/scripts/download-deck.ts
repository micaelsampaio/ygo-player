//TODO @mica maybe move this to a utils file
import { DeckData } from "./ydk-parser";

export async function getCard(id: number) {
  const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${id}&misc=yes`);
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
