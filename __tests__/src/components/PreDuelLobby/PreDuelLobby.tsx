import { useEffect, useState } from "react";
import AppLayout from "../Layout/AppLayout";
import { PreDuelLobbyAction, PreDuelLobbyContextRef, PreDuelLobbyPlayerGameData } from "./components/context";
import { PreDuelLobbyUI } from "./PreDuelLobbyUI";
import { useSearchParams } from "react-router-dom";
import { StoreService } from "../../services/store-service";
import { Card, FieldZone, YGOGameUtils } from "ygo-core";

let lobbyCardIndex = 0;

export function PreDuelLobbyPage() {
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deckNames] = useState(() => {
    const allKeys = Object.keys(localStorage);
    const decks = allKeys.filter((key) => key.startsWith("deck_")).map(deck => deck.replace("deck_", ""));
    return decks;
  });
  const [players, setPlayers] = useState<PreDuelLobbyPlayerGameData[]>([]);
  const [action, setAction] = useState<PreDuelLobbyAction | null>(null);

  const getDeckData = async (deckId: string) => {
    if (deckId) {
      const deck = await StoreService.getDeckFromDeckWithCardIds(deckId);
      if (deck) {
        deck.mainDeck.forEach((card: any) => card.index = ++lobbyCardIndex);
        deck.extraDeck.forEach((card: any) => card.index = ++lobbyCardIndex);
        return deck;
      }
    }

    return {
      id: undefined,
      name: undefined,
      mainDeck: [],
      extraDeck: [],
    }
  }

  const clearAction = () => {
    setAction(null);
  }

  const setPlayerDeck = async (playerIndex: number, deckId: string) => {
    try {

      setLoading(true);

      const deckData = await getDeckData(deckId as string);
      deckData.mainDeck.forEach((card: any) => card.originalOwner = playerIndex);
      deckData.extraDeck.forEach((card: any) => card.index = playerIndex);

      setPlayers((players) => {
        return players.map((player, index) => {
          if (index === playerIndex) {
            return {
              ...player,
              ...deckData,
              field: {
                hand: [],
                fieldSpell: null,
                monsterZones: [null, null, null, null, null],
                spellZones: [null, null, null, null, null],
                extraMonsterZones: [null, null],
              },
              mainDeckSize: deckData.mainDeck.length,
              extraDeckSize: deckData.extraDeck.length,
            }
          }
          return player;
        })
      });
    } catch (error) {
    }
  }

  const startDuel = () => {

  }

  const setCardInCardZone = (zone: FieldZone, card: Card | null) => {

    const zoneData = YGOGameUtils.getZoneData(zone);
    setPlayers((players) => {
      return players.map((player, playerIndex) => {
        player.mainDeck = player.mainDeck.filter(c => c !== card);
        player.extraDeck = player.extraDeck.filter(c => c !== card);

        if (playerIndex === zoneData.player) {

          if (zoneData.zone === "H") {
            player.field.hand = [...player.field.hand, card];
          }
          if (zoneData.zone === "M") {
            player.field.monsterZones[zoneData.zoneIndex - 1] = card;
            player.field.monsterZones = [...player.field.monsterZones];
          }
          if (zoneData.zone === "S") {
            player.field.spellZones[zoneData.zoneIndex - 1] = card;
            player.field.spellZones = [...player.field.spellZones];
          }
          if (zoneData.zone === "EMZ") {
            player.field.extraMonsterZones[zoneData.zoneIndex - 1] = card;
            player.field.extraMonsterZones = [...player.field.extraMonsterZones];
          }
          if (zoneData.zone === "F") {
            player.field.fieldSpell = card;
          }

          return { ...player }
        }

        return player;
      })
    })
  }

  useEffect(() => {

    const loadInitialData = async () => {
      try {

        const deckIds = [searchParams.get("deck1"), searchParams.get("deck2")];

        const players = await Promise.all([0, 1].map(async (playerIndex) => {

          const deckId = deckIds[playerIndex] as string;

          const deckData = await getDeckData(deckId as string);
          deckData.mainDeck.forEach((card: any) => card.originalOwner = playerIndex);
          deckData.extraDeck.forEach((card: any) => card.index = playerIndex);

          const player: PreDuelLobbyPlayerGameData = {
            name: `Player ${playerIndex + 1}`,
            deckId,
            deckName: deckData.name as string,
            extraDeck: deckData.extraDeck,
            mainDeck: deckData.mainDeck,
            mainDeckSize: deckData.mainDeck.length,
            extraDeckSize: deckData.extraDeck.length,
            field: {
              hand: [],
              fieldSpell: null,
              monsterZones: [null, null, null, null, null],
              spellZones: [null, null, null, null, null],
              extraMonsterZones: [null, null],
            }
          }

          return player;
        }))

        setPlayers(players);
        setReady(true);

      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  if (!ready) return <AppLayout >
    <div>Loading...</div>
  </AppLayout>

  return <AppLayout padding={false}>
    <PreDuelLobbyContextRef.Provider value={{
      deckNames,
      players,
      loading,
      action,
      setLoading,
      setPlayerDeck,
      setAction,
      clearAction,
      startDuel,
      setCardInCardZone,
    }}>
      <PreDuelLobbyUI />
    </PreDuelLobbyContextRef.Provider>
  </AppLayout>
}