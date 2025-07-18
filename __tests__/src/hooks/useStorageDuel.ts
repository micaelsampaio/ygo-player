import { useNavigate } from "react-router-dom";
import { LocalStorage } from "../scripts/storage";
import type { Deck } from "./useStorageDecks";

export interface DuelData {
  players: {
    name: string
    mainDeck: any[]
    extraDeck: any[]
  }[],
  commands?: any[],
  options: {
    shuffleDeck: boolean
  }
}

export function useDuelController() {
  const navigate = useNavigate();

  const setDuelData = ({ deck1, deck2, options: opts = { shuffleDeck: true } }: { deck1: Deck, deck2?: Deck | undefined, options?: any }) => {
    const players = [
      {
        name: "player1",
        mainDeck: deck1.mainDeck,
        extraDeck: deck1.extraDeck
      },
      {
        name: "player2",
        mainDeck: deck2?.mainDeck || [],
        extraDeck: deck2?.extraDeck || []
      },
    ]

    const options = {
      ...opts
    }

    const duelData: DuelData = {
      players,
      options
    }

    LocalStorage.set("duel_data", duelData);
  }

  const duel = (args: { deck1: Deck, deck2?: Deck | undefined, options?: any }) => {
    setDuelData(args);
    navigate("/duel");
  }

  return {
    setDuelData,
    duel
  }
}