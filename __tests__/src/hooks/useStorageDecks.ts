import { useState } from "react";
import { LocalStorage } from "../scripts/storage";
import { ydkToJson, type DeckData } from "../scripts/ydk-parser";
import { downloadDeck } from "../scripts/fetch-utils";
import { uuid } from "../scripts/constants";

export interface Deck {
  id: string,
  name: string,
  mainDeck: any[],
  extraDeck: any[],
}


export function useStorageDecks() {

  const [decks, setDecks] = useState<Deck[]>(() => {
    const deckIds = LocalStorage.getKeysFromPrefix("deck_");
    const decks: Deck[] = [];

    for (const deckKey of deckIds) {
      const data = LocalStorage.get<Deck>(deckKey);
      decks.push(data);
    }
    decks.sort((d1, d2) => d1.name.localeCompare(d2.name));
    return decks;
  });

  const addDeck = (deck: Deck) => {
    console.log("TCL: ADD DECK DECK", deck);
    LocalStorage.set("deck_" + deck.id, deck)
    setDecks(currentDecks => {
      currentDecks.push(deck);
      currentDecks.sort((d1, d2) => d1.name.localeCompare(d2.name));
      return [...currentDecks];
    });
  }

  const removeDeck = (deckId: string) => {
    LocalStorage.remove("deck_" + deckId)
    setDecks(decks => decks.filter(d => d.id !== deckId));
  }

  const downloadDeckFromYdk = async (ydkData: string, args?: {
    deckName: string
    events?: {
      onProgess: (args: {
        cardDownloaded: number;
        totalCards: number;
      }) => void;
    }
  }) => {
    const id = uuid();
    let deckName = args?.deckName ?? prompt("Deck name:");

    if (!deckName) deckName = id;

    const deckDataJson = ydkToJson(ydkData);
    const deckData = await downloadDeck(deckDataJson, { events: args?.events });
    const deck: Deck = {
      id,
      name: deckName,
      mainDeck: deckData.mainDeck,
      extraDeck: deckData.extraDeck
    }

    return deck;
  }

  return {
    decks,
    addDeck,
    removeDeck,
    downloadDeckFromYdk
  }

}