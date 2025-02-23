import { Link } from "react-router";
import YUBEL from "./decks/YUBEL_FS.json";
import CHIMERA from "./decks/CHIMERA.json";
import { useNavigate } from "react-router";
import PlayerLobby from "./PlayerLobby";
import { memo, useEffect, useState } from "react";
import { useKaibaNet } from "./useKaibaNet";

const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

export default function App() {
  const kaibaNet = useKaibaNet();
  const [players, setPlayers] = useState(kaibaNet.getPlayers()); // Add reactive state for players
  const updatePlayers = (players) => {
    setPlayers(kaibaNet.getPlayers());
  };
  kaibaNet.on("players:updated", updatePlayers);

  const [replays, setReplays] = useState(() => {
    const allKeys = Object.keys(localStorage);
    const replayKeys = allKeys.filter((key) => key.startsWith("replay_"));
    return replayKeys.map((replay) => ({ name: replay, data: null }));
  });

  const [decks, setDecks] = useState(() => {
    const allKeys = Object.keys(localStorage);
    const decks = allKeys.filter((key) => key.startsWith("deck_"));
    return decks;
  });

  const [roomDecks, setRoomDecks] = useState({});

  const [selectedDeck, setSelectedDeck] = useState(() => {
    const deck = window.localStorage.getItem("selected-deck")!;
    if (decks.find((d) => d === deck)) {
      return deck;
    }
    return "";
  });

  let navigate = useNavigate();

  const duel = (e: any, deck1: any, deck2: any) => {
    e.preventDefault();
    e.stopPropagation();
    const roomJson = {
      players: [
        {
          name: "player1",
          mainDeck: deck1.mainDeck,
          extraDeck: deck1.extraDeck,
        },
        {
          name: "player2",
          mainDeck: deck2.mainDeck,
          extraDeck: deck2.extraDeck,
        },
      ],
    };
    localStorage.setItem("duel-data", JSON.stringify(roomJson));
    setRoomDecks(roomJson);
    //navigate("/duel");
  };

  const handleGameStart = async (gameState) => {
    console.log("decodedGameState", gameState);
    console.log(gameState);
    navigate("/duel");
  };

  kaibaNet.setOnGameStartCallback(handleGameStart);

  const handleRoomJoin = async (roomId) => {
    console.log("App:handleRoomJoin:roomDecks", roomDecks);
    await kaibaNet.joinRoom(roomId, roomDecks);
    navigate("/duel");
  };

  const duelWithDeckFromStore = (e: any, deckId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const deckData = JSON.parse(localStorage.getItem(deckId)!) as any;

    localStorage.setItem(
      "duel-data",
      JSON.stringify({
        players: [
          {
            name: "player1",
            mainDeck: deckData.mainDeck,
            extraDeck: deckData.extraDeck,
          },
          {
            name: "player2",
            mainDeck: YUBEL.mainDeck,
            extraDeck: YUBEL.extraDeck,
          },
        ],
      })
    );
    navigate("/duel");
  };

  const deleteDeck = (deckId: string) => {
    if (confirm("Are you sure you want to delete " + deckId) == true) {
      localStorage.removeItem(deckId);
      setDecks((decks) => decks.filter((d) => d !== deckId));
    }
  };

  const deleteReplay = (replayId: string) => {
    if (confirm("Are you sure you want to delete " + replayId) == true) {
      localStorage.removeItem(replayId);
      setReplays((replays) => replays.filter((d) => d.name !== replayId));
    }
  };

  const playFromAReplay = (playerIndex: number, replayData: any) => {
    const deckData = JSON.parse(window.localStorage.getItem(selectedDeck)!);
    const otherDeckData = replayData.players[playerIndex];
    const { endField = [] } = replayData.replay;

    const fieldState = endField
      .map((card: any) => {
        // const zoneData = YGOGameUtils.getZoneData(card.zone);
        // console.log("ZONE --> ", card.zone, zoneData);

        // if (zoneData.player === playerIndex) {
        //   return {
        //     ...card,
        //     zone: YGOGameUtils.invertPlayerInZone(card.zone)
        //   }
        // }
        return undefined;
      })
      .filter((data: any) => data);

    console.log("----> ");
    console.log("fieldState ", fieldState);

    localStorage.setItem(
      "duel-data",
      JSON.stringify({
        players: [
          {
            name: "player1",
            mainDeck: deckData.mainDeck,
            extraDeck: deckData.extraDeck,
          },
          {
            name: "player2",
            mainDeck: otherDeckData.mainDeck,
            extraDeck: otherDeckData.extraDeck,
          },
        ],
        options: {
          fieldState,
        },
      })
    );
    console.log(JSON.parse(localStorage.getItem("duel-data")!));
    navigate("/duel");
  };

  const openRelay = (e: any, replayId: string) => {
    e.preventDefault();
    e.stopPropagation();

    localStorage.setItem("duel-data", window.localStorage.getItem(replayId)!);

    navigate("/duel");
  };

  useLazyReplay({ replays, setReplays });

  return (
    <div>
      <h1># Decks</h1>
      <ul>
        <li>
          <Link onClick={(e) => duel(e, YUBEL, CHIMERA)} to="#">
            Duel as Yubel
          </Link>
        </li>
        <li>
          <Link onClick={(e) => duel(e, CHIMERA, YUBEL)} to="#">
            Duel as Chimera
          </Link>
        </li>

        {decks.map((deckId) => {
          return (
            <li>
              <Link to="#" onClick={(e) => duelWithDeckFromStore(e, deckId)}>
                Duel as {deckId}
              </Link>{" "}
              <button onClick={() => deleteDeck(deckId)}>delete</button>
            </li>
          );
        })}
        <li>
          <Link to={"/deck"}>Download deck</Link>
        </li>
      </ul>

      {replays.length > 0 && (
        <div>
          <h1># Replays </h1>
          Play As{" "}
          <select
            value={selectedDeck}
            onChange={(e) => {
              window.localStorage.setItem("selected-deck", e.target.value);
              setSelectedDeck(e.target.value);
            }}
          >
            <option>Select a Deck</option>
            {decks.map((deck) => (
              <option key={deck} value={deck}>
                {deck}
              </option>
            ))}
          </select>
          <ul>
            {replays.map((replay) => {
              return (
                <li>
                  <Link onClick={(e) => openRelay(e, replay.name)} to="#">
                    {replay.name}
                  </Link>{" "}
                  <button onClick={() => deleteReplay(replay.name)}>
                    delete
                  </button>
                  <br />
                  <EndGameBoard play={playFromAReplay} data={replay.data} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <PlayerLobby
        playerId={kaibaNet.getPlayerId()}
        players={players}
        onRoomJoin={handleRoomJoin}
      />
    </div>
  );
}

function useLazyReplay({ replays, setReplays }: any) {
  useEffect(() => {
    if (replays.length === 0) return;
    console.log(replays);

    let index = 0;
    let timer: any = -1;

    const loadReplay = () => {
      const replayData = window.localStorage.getItem(replays[index].name);
      if (replayData) {
        const replay = JSON.parse(replayData);
        let thisIndex = index;
        setReplays((currentReplays: any) => {
          const newReplays = [...currentReplays];
          newReplays[thisIndex] = {
            ...newReplays[thisIndex],
            data: replay,
          };
          return newReplays;
        });
      }
      if (++index < replays.length) {
        timer = setTimeout(loadReplay);
      }
    };

    loadReplay();
  }, []);
}

/// TODO

const EndGameBoard = memo(function EndGameBoard({ data, play }: any) {
  const [fields, setFields] = useState<any>(null);
  useEffect(() => {
    if (!data) return;

    const getCard = (playerIndex: number, cardId: number) => {
      if (!cardId) return null;
      const { mainDeck = [], extraDeck = [] } = data.players[playerIndex];
      const card = mainDeck.find((c: any) => c.id === cardId);
      if (card) return card;
      const card2 = extraDeck.find((c: any) => c.id === cardId);
      if (card2) return card2;
      return null;
    };

    const { endField = [] } = data.replay;
    if (endField.length === 0) return;

    const fields: any = [
      {
        monsterZones: [null, null, null, null, null],
        spellTrapZones: [null, null, null, null, null],
        extraMonsterZones: [null, null],
      },
      {
        monsterZones: [null, null, null, null, null],
        spellTrapZones: [null, null, null, null, null],
        extraMonsterZones: [null, null],
      },
    ];

    endField.forEach((data: any) => {
      // const zoneData = YGOGameUtils.getZoneData(data.zone);
      // const card = getCard(zoneData.player, data.id);
      // const cardData = { ...card, ...data, zoneData };
      // if (zoneData.zone === "M") {
      //   fields[zoneData.player].monsterZones[zoneData.zoneIndex - 1] = cardData;
      // }
      // if (zoneData.zone === "S") {
      //   fields[zoneData.player].spellTrapZones[zoneData.zoneIndex - 1] = cardData;
      // }
      // if (zoneData.zone === "EMZ") {
      //   fields[zoneData.player].extraMonsterZones[zoneData.zoneIndex - 1] = cardData;
      // }
    });
    fields.reverse();
    setFields(fields);
  }, [data]);

  const sizeInt = 60;
  const size = sizeInt + "px";
  if (!data || !fields) return null;
  return (
    <div>
      {fields.map((player: any, playerIndex: number) => {
        const monsterZones = player.monsterZones.map((card: any) => {
          return (
            <div className="col border" style={{ width: size, height: size }}>
              {card && (
                <img
                  style={{
                    height: size,
                    transform: playerIndex === 0 ? "rotate(180deg)" : undefined,
                  }}
                  src={`${cdnUrl}/images/cards_small/${card.id}.jpg`}
                />
              )}
            </div>
          );
        });
        const spellZones = player.spellTrapZones.map((card: any) => {
          return (
            <div className="col border" style={{ width: "size", height: size }}>
              {card && (
                <img
                  style={{
                    height: size,
                    transform: playerIndex === 0 ? "rotate(180deg)" : undefined,
                  }}
                  src={`${cdnUrl}/images/cards_small/${card.id}.jpg`}
                />
              )}
            </div>
          );
        });

        const extraMonsterZone1 = fields[0].extraMonsterZones[0]
          ? 0
          : fields[1].extraMonsterZones[0]
          ? 1
          : -1;
        const extraMonsterZone2 = fields[0].extraMonsterZones[1]
          ? 0
          : fields[1].extraMonsterZones[1]
          ? 1
          : -1;

        const extraMonsterZones = (
          <>
            {playerIndex === 0 && (
              <div style={{ height: size }}>
                <div className="row">
                  <div className="col"></div>
                  <div
                    className="col border"
                    style={{ width: size, height: size }}
                  >
                    {extraMonsterZone1 >= 0 && (
                      <img
                        style={{
                          height: size,
                          transform:
                            extraMonsterZone1 === 1
                              ? "rotate(180deg)"
                              : undefined,
                        }}
                        src={`${cdnUrl}/images/cards_small/${fields[extraMonsterZone1].extraMonsterZones[0].id}.jpg`}
                      />
                    )}
                  </div>
                  <div className="col"></div>
                  <div
                    className="col border"
                    style={{ width: size, height: size }}
                  >
                    {extraMonsterZone2 >= 0 && (
                      <img
                        style={{
                          height: size,
                          transform:
                            extraMonsterZone2 === 1
                              ? "rotate(180deg)"
                              : undefined,
                        }}
                        src={`${cdnUrl}/images/cards_small/${fields[extraMonsterZone2].extraMonsterZones[1].id}.jpg`}
                      />
                    )}
                  </div>
                  <div className="col"></div>
                </div>
              </div>
            )}
          </>
        );

        const playVsField = (
          <div>
            <button onClick={() => play(1 - playerIndex, data)}>
              Play vs field
            </button>
          </div>
        );

        return (
          <div style={{ width: sizeInt * 5 + "px" }}>
            {playerIndex === 0 && playVsField}
            <div className="row" style={{ height: size }}>
              {playerIndex === 1 ? monsterZones : spellZones}
            </div>
            <div className="row" style={{ height: size }}>
              {playerIndex === 1 ? spellZones : monsterZones}
            </div>
            {extraMonsterZones}
            {playerIndex === 1 && playVsField}
          </div>
        );
      })}
    </div>
  );
});
