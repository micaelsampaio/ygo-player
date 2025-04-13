import React from "react";
import { YGOCollection } from "./CollectionsPage";
import short from "short-uuid";
import { Deck } from "../DeckBuilder/types";

export interface AppCollectionContext {
  decks: string[];
  collection: YGOCollection | undefined;
  setCollection: (collection: YGOCollection) => void;
  setCollectionById: (id: string) => void; // Add this function
}

export function createCollectionFromDeck(deck: Deck): string {
  // Return the id
  const collection: YGOCollection = {
    id: short.generate(),
    name: deck.name,
    deck: {
      name: `deck_${deck.name}`, // Add deck_ prefix to match the format expected by CurrentCollection
      mainDeck: deck.mainDeck as any,
      extraDeck: deck.extraDeck as any,
    },
    combos: [],
  };

  const collections = JSON.parse(
    window.localStorage.getItem("collections_details") || "[]"
  );
  collections.push({ id: collection.id, name: collection.name });

  window.localStorage.setItem("c_" + collection.id, JSON.stringify(collection));
  window.localStorage.setItem(
    "collections_details",
    JSON.stringify(collections)
  );

  return collection.id; // Return the id for selection
}

export const CollectionContext = React.createContext<AppCollectionContext>(
  {} as any
);

export function useCollectionContext() {
  return React.useContext(CollectionContext);
}
