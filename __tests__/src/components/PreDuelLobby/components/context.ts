import React from "react";
import { Card, FieldZone } from "ygo-core";
import { PRE_GAME_ACTIONS_TYPES } from "../actions";

export interface PreDuelLobbyPlayerGameData {
  name: string,
  deckId: string,
  deckName: string
  mainDeck: Card[],
  mainDeckSize: number,
  extraDeck: Card[],
  extraDeckSize: number,
  field: {
    hand: (Card | null)[]
    fieldSpell: Card | null
    monsterZones: (Card | null)[]
    spellZones: (Card | null)[]
    extraMonsterZones: (Card | null)[]
  }
}

export interface PreDuelLobbyAction {
  name: PRE_GAME_ACTIONS_TYPES,
  data: any
}

export interface PreDuelLobbyContext {
  deckNames: string[]
  players: PreDuelLobbyPlayerGameData[]
  loading: boolean
  action: PreDuelLobbyAction | null,
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
