import { useEffect, useState } from "react";
import AppLayout from "../Layout/AppLayout";
import { PreDuelLobbyAction, PreDuelLobbyContextRef, PreDuelLobbyPlayerGameData } from "./components/context";
import { PreDuelLobbyUI } from "./PreDuelLobbyUI";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DecksDetailsGroupedResult, StoreService } from "../../services/store-service";
import { Card, FieldZone, YGOGameUtils, YGOProps } from "ygo-core";
import { APIService } from "@/services/api-service";

let lobbyCardIndex = 0;

export function PreDuelLobbyPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<DecksDetailsGroupedResult>([]);
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

      setupDeck(playerIndex, deckData);

      setPlayers((players) => {
        return players.map((player, index) => {
          if (index === playerIndex) {
            return {
              ...player,
              ...deckData,
              deckData: {
                mainDeck: JSON.parse(JSON.stringify(deckData.mainDeck)),
                extraDeck: JSON.parse(JSON.stringify(deckData.extraDeck)),
              },
              deckId,
              field: {
                hand: [],
                fieldSpell: null,
                monsterZones: [null, null, null, null, null],
                spellZones: [null, null, null, null, null],
                extraMonsterZones: [null, null],
                graveyard: [],
                banishedZone: [],
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

  const updateFieldCards = () => {
    setPlayers(players => players.map(p => p));
  }

  const startDuel = async () => {
    const duelData = parseStateYGOCoreProps({ players });
    console.log("DUEL DATA: ", duelData);
    localStorage.setItem("duel-data", JSON.stringify(duelData));

    navigate(`/duel/offline-${Date.now()}`);
  }

  const setCardInCardZone = (zone: FieldZone, card: Card | null) => {
    const zoneData = YGOGameUtils.getZoneData(zone);

    setPlayers((players) => {
      let cardWasMoved = false;

      const updatedPlayers = players.map((player, index) => {
        if (index !== zoneData.player) return player;

        const updatedField = { ...player.field };

        const { zone: zoneType, zoneIndex } = zoneData;
        const targetIndex = zoneIndex - 1;

        switch (zoneType) {
          case "H":
            updatedField.hand = [...updatedField.hand, card];
            cardWasMoved = true;
            break;

          case "M":
            if (!updatedField.monsterZones[targetIndex]) {
              updatedField.monsterZones[targetIndex] = card;
              updatedField.monsterZones = [...updatedField.monsterZones];
              cardWasMoved = true;
            }
            break;

          case "S":
            if (!updatedField.spellZones[targetIndex]) {
              if (card) {
                if (YGOGameUtils.isSpellTrap(card)) {
                  card.position = "facedown";
                }
              }

              updatedField.spellZones[targetIndex] = card;
              updatedField.spellZones = [...updatedField.spellZones];
              cardWasMoved = true;
            }
            break;

          case "EMZ":
            if (
              !players[0].field.extraMonsterZones[targetIndex] &&
              !players[1].field.extraMonsterZones[targetIndex]
            ) {
              updatedField.extraMonsterZones[targetIndex] = card;
              updatedField.extraMonsterZones = [...updatedField.extraMonsterZones];
              cardWasMoved = true;
            }
            break;
          case "F":
            if (!updatedField.fieldSpell) {
              updatedField.fieldSpell = card;
              cardWasMoved = true;
            }
            break;
          case "GY":
            updatedField.graveyard = [card, ...updatedField.graveyard];
            cardWasMoved = true;
            break;
          case "B":
            updatedField.banishedZone = [card, ...updatedField.banishedZone];
            cardWasMoved = true;
            break;
        }

        return { ...player, field: updatedField };
      });

      if (cardWasMoved) {
        updatedPlayers.forEach((player) => {
          player.mainDeck = player.mainDeck.filter((c) => c !== card);
          player.extraDeck = player.extraDeck.filter((c) => c !== card);
        });
      }

      return updatedPlayers;
    });
  };


  useEffect(() => {

    const loadInitialData = async () => {
      try {

        const deckIds = [searchParams.get("deck1"), searchParams.get("deck2")];
        const replayId = searchParams.get("replayId");
        const playVs = searchParams.get("vs");

        let replayData: any;

        if (replayId) {
          replayData = await StoreService.getReplayFromId(replayId);
        }

        const myDecksWithGroups = await StoreService.getMyDecksWithGroups();
        console.log(myDecksWithGroups);

        const players = await Promise.all([0, 1].map(async (playerIndex) => {

          const deckId = deckIds[playerIndex] as string;

          let deckData;
          let initialField;

          if (playVs === "0" && playerIndex === 1) {
            const deckFromReplay = {
              id: undefined,
              name: undefined,
              mainDeck: replayData.players[0].mainDeck,
              extraDeck: replayData.players[0].extraDeck,
            }
            initialField = replayData.endField || [];

            deckData = await APIService.getDeckFromDeckWithCardIds(deckFromReplay);
          } else {
            deckData = await getDeckData(deckId as string);
          }

          setupDeck(playerIndex, deckData);

          const player: PreDuelLobbyPlayerGameData = {
            name: `Player ${playerIndex + 1}`,
            deckId,
            deckName: deckData.name as string,
            extraDeck: deckData.extraDeck,
            mainDeck: deckData.mainDeck,
            mainDeckSize: deckData.mainDeck.length,
            extraDeckSize: deckData.extraDeck.length,
            deckData: {
              mainDeck: JSON.parse(JSON.stringify(deckData.mainDeck)),
              extraDeck: JSON.parse(JSON.stringify(deckData.extraDeck)),
            },
            field: {
              hand: [],
              fieldSpell: null,
              monsterZones: [null, null, null, null, null],
              spellZones: [null, null, null, null, null],
              extraMonsterZones: [null, null],
              graveyard: [],
              banishedZone: [],
            }
          }

          setupInitialField(player, initialField);
          return player;
        }))

        console.log("TCL: decks", myDecksWithGroups);

        setPlayers(players);
        setDecks(myDecksWithGroups);
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
      decks,
      players,
      loading,
      action,
      setPlayers,
      setLoading,
      setPlayerDeck,
      setAction,
      clearAction,
      startDuel,
      setCardInCardZone,
      updateFieldCards,
    }}>
      <PreDuelLobbyUI />
    </PreDuelLobbyContextRef.Provider>
  </AppLayout>
}


function parseStateYGOCoreProps({ players: playersData }: { players: PreDuelLobbyPlayerGameData[] }): YGOProps {

  const fieldState: any = [];


  const addCardToFieldState = (playerIndex: number, zone: FieldZone, card: Card | null) => {
    if (!card) return;

    const zoneData = YGOGameUtils.getZoneData(zone);

    const data: any = {
      id: card.id,
      zone: YGOGameUtils.createZone(zoneData.zone, zoneData.player, zoneData.zoneIndex)
    }

    // id: number,
    // zone: FieldZone
    // atk?: number
    // def?: number
    // owner?: number
    // position?: CardPosition
    // materials?: Array<{ id: number, owner?: number }>

    if (card.originalOwner !== playerIndex) {
      data.owner = card.originalOwner;
    }

    if (zoneData.zone !== "H" && card.position !== "faceup-attack") {
      data.position = card.position;
    }

    fieldState.push(data);
  }

  const players = playersData.map((player) => {
    return {
      name: player.name,
      deckId: player.deckId,
      mainDeck: player.deckData.mainDeck,
      extraDeck: player.deckData.extraDeck,
    }
  });

  playersData.forEach((player, playerIndex) => {
    const field = player.field;
    field.hand.forEach((card) => addCardToFieldState(playerIndex, YGOGameUtils.createZone("H", playerIndex, -1), card));
    field.monsterZones.forEach((card, zoneIndex) => addCardToFieldState(playerIndex, YGOGameUtils.createZone("M", playerIndex, zoneIndex + 1), card));
    field.spellZones.forEach((card, zoneIndex) => addCardToFieldState(playerIndex, YGOGameUtils.createZone("S", playerIndex, zoneIndex + 1), card));
    field.extraMonsterZones.forEach((card, zoneIndex) => addCardToFieldState(playerIndex, YGOGameUtils.createZone("EMZ", playerIndex, zoneIndex + 1), card));
    field.graveyard.forEach((card, zoneIndex) => addCardToFieldState(playerIndex, YGOGameUtils.createZone("GY", playerIndex, zoneIndex + 1), card));
    field.banishedZone.forEach((card, zoneIndex) => addCardToFieldState(playerIndex, YGOGameUtils.createZone("B", playerIndex, zoneIndex + 1), card));
    addCardToFieldState(playerIndex, YGOGameUtils.createZone("F", playerIndex, -1), field.fieldSpell);
  });

  const props: YGOProps = {
    players,
    options: {
      fieldState
    }
  }

  return props;
}

function setupDeck(playerIndex: number, deck: { mainDeck: Card[], extraDeck: Card[] }) {
  deck.mainDeck.forEach((card: any) => {
    card.index = ++lobbyCardIndex;
    card.originalOwner = playerIndex
    card.position = "faceup-attack";
    card.isMainDeckCard = true;
  });

  deck.extraDeck.forEach((card: any) => {
    card.index = ++lobbyCardIndex;
    card.originalOwner = playerIndex
    card.position = "faceup-attack";
    card.isMainDeckCard = false;
  });

  return deck;
}

function setupInitialField(player: PreDuelLobbyPlayerGameData, initialField: any) {

  if (Array.isArray(initialField)) {
    const getCardFromDeck = (id: number) => {
      const mainIndex = player.mainDeck.findIndex(card => card.id === id);

      if (mainIndex !== -1) {
        const cardRemoved = player.mainDeck.splice(mainIndex, 1)[0];
        return cardRemoved;
      }

      const extraIndex = player.extraDeck.findIndex(card => card.id === id);

      if (extraIndex !== -1) {
        const cardRemoved = player.extraDeck.splice(extraIndex, 1)[0];
        return cardRemoved;
      }

      return null;
    }

    initialField.forEach(cardData => {
      const { id, zone, position } = cardData;
      const zoneData = YGOGameUtils.getZoneData(zone);

      const card = getCardFromDeck(id)

      if (card && zoneData.player === 0) {
        if (position) card.position = position;

        if (zoneData.zone === "M") {
          player.field.monsterZones[zoneData.zoneIndex - 1] = card;
        } else if (zoneData.zone === "S") {
          player.field.spellZones[zoneData.zoneIndex - 1] = card;
        } else if (zoneData.zone === "EMZ") {
          player.field.extraMonsterZones[zoneData.zoneIndex - 1] = card;
        } else if (zoneData.zone === "H") {
          player.field.hand.push(card);
        } else if (zoneData.zone === "GY") {
          player.field.graveyard.push(card);
        } else if (zoneData.zone === "B") {
          player.field.banishedZone.push(card);
        } else if (zoneData.zone === "F") {
          player.field.fieldSpell = card;
        }
      }
    })
  }

}