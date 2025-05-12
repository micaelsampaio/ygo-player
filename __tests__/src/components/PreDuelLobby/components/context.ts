import React from "react";
import { Card, FieldZone } from "ygo-core";
import { PRE_GAME_ACTIONS_TYPES } from "../actions";
import { DecksDetailsGroupedResult } from "@/services/store-service";

export interface PreDuelLobbyPlayerGameData {
  name: string,
  deckId: string,
  deckName: string
  mainDeck: Card[]
  mainDeckSize: number
  extraDeck: Card[]
  extraDeckSize: number
  deckData: {
    mainDeck: Card[],
    extraDeck: Card[],
  }
  field: {
    hand: (Card | null)[]
    fieldSpell: Card | null
    monsterZones: (Card | null)[]
    spellZones: (Card | null)[]
    extraMonsterZones: (Card | null)[]
    graveyard: (Card | null)[],
    banishedZone: (Card | null)[],
  }
}

export interface PreDuelLobbyAction {
  name: PRE_GAME_ACTIONS_TYPES,
  data: any
}

export interface PreDuelLobbyContext {
  decks: DecksDetailsGroupedResult
  players: PreDuelLobbyPlayerGameData[]
  loading: boolean
  action: PreDuelLobbyAction | null,
  setPlayers: React.Dispatch<React.SetStateAction<PreDuelLobbyPlayerGameData[]>>
  updateFieldCards: () => void,
  setLoading: (value: boolean) => void
  setPlayerDeck: (playerIndex: number, deckId: string) => Promise<void>
  setAction: (action: PreDuelLobbyAction | null) => void
  clearAction: () => void
  startDuel: () => void
  setCardInCardZone: (zone: FieldZone, card: Card | null) => void
}

export const PreDuelLobbyContextRef = React.createContext<PreDuelLobbyContext>(
  {} as any
);

export function usePreDuelLobbyContext() {
  return React.useContext(PreDuelLobbyContextRef);
}
