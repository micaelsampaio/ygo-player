import { replace, useNavigate } from "react-router-dom";
import { LocalStorage } from "../scripts/storage";
import type { Deck } from "./useStorageDecks";
import type { YGOReplayData } from "ygo-core";

export interface DuelData {
  players: {
    name: string
    mainDeck: any[]
    extraDeck: any[]
  }[],
  commands?: any[],
  gameMode: string,
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
      gameMode: "EDITOR",
      options
    }

    LocalStorage.set("duel_data", duelData);
  }

  const duel = (args: { deck1: Deck, deck2?: Deck | undefined, options?: any }) => {
    setDuelData(args);
    navigate("/duel");
  }

  const duelWithStaticProps = (duelData: any) => {
    LocalStorage.set("duel_data", duelData);
    navigate("/duel");
  }

  const viewReplay = async (replay: YGOReplayData) => {
    const decks = await fetchPlayersData(...replay.players);

    LocalStorage.set("duel_data", {
      gameMode: "REPLAY",
      decks,
      replay
    });

    navigate("/duel");
  }

  return {
    duelWithStaticProps,
    setDuelData,
    duel,
    viewReplay
  }
}

async function fetchPlayersData(...players: any) {
  console.log("PLAYERS", players);

  const ids = new Set<number>()

  for (const player of players) {
    player.mainDeck.forEach((id: number) => ids.add(id));
    player.extraDeck.forEach((id: number) => ids.add(id));
    player.sideDeck?.forEach((id: number) => ids.add(id));
  }

  // TODO USE CACHE
  const cardsResponse = await fetch(`https://api.ygo101.com/cards?ids=${Array.from(ids).join(",")}`);
  const cardsData = await cardsResponse.json();

  const newPlayersData = players.map((player: any) => {
    return {
      name: player.name,
      mainDeck: player.mainDeck.map((id: number) => cardsData.find((card: any) => card.id === id)),
      extraDeck: player.extraDeck.map((id: number) => cardsData.find((card: any) => card.id === id)),
      sideDeck: player.sideDeck?.map((id: number) => cardsData.find((card: any) => card.id === id)) || [],
    }
  })

  return newPlayersData;
}