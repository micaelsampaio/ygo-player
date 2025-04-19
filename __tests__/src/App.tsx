import YUBEL from "./decks/YUBEL_FS.json";
import CHIMERA from "./decks/CHIMERA.json";
import { useNavigate, Link } from "react-router-dom";
import RoomLobby from "./components/RoomLobby.js";
import { useKaibaNet } from "./hooks/useKaibaNet";
import { memo, useEffect, useState } from "react";
import { YGOGameUtils } from "ygo-core";
import { YGODeckToImage } from "ygo-core-images-utils";
import styled from "styled-components";
import { Logger } from "./utils/logger";
import { ComboChooseDeck } from "./components/ComboChooseDeck";
import { exportAllData, importAllData } from "./utils/dataExport";
import { generateExportToMdCode } from "./utils/export-to-md.js";
import { DataExportModal } from "./components/Data/DataExportModal.js";
import { ConnectionSwitcher } from "./components/ConnectionSwitcher";
import { createRoom } from "./utils/roomUtils";

const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

const AppContainer = styled.div`
  display: flex;
`;

const LeftContent = styled.div`
  flex-grow: 1;
`;

const logger = Logger.createLogger("App");

export default function App() {
  const kaibaNet = useKaibaNet();
  const [rooms, setRooms] = useState(() => kaibaNet.getRooms());
  const [deckToPlay, setDeckToPlay] = useState("");
  const [qrData, setQrData] = useState(null);

  const onRoomsUpdated = (updatedRooms: any) => {
    console.log("App: Updated rooms", updatedRooms);
    setRooms(new Map(updatedRooms));
  };

  useEffect(() => {
    console.log("kaibaNet in useEffect:", kaibaNet); // Ensure this is the same instance
    console.log("Setting up event listener for rooms:updated");
    kaibaNet.removeAllListeners("rooms:updated");
    kaibaNet.on("rooms:updated", onRoomsUpdated);
    return () => {
      console.log("Cleaning up event listener for rooms:updated");
      kaibaNet.off("rooms:updated", onRoomsUpdated);
    };
  }, [kaibaNet]);

  useEffect(() => {
    logger.info("App component mounted");
    return () => {
      logger.debug("App component unmounting");
    };
  }, []);

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
  const [roomDecks, setRoomDecks] = useState<any>({});

  const [selectedDeck, setSelectedDeck] = useState(() => {
    const deck = window.localStorage.getItem("selected-deck")!;
    if (decks.find((d) => d === deck)) {
      return deck;
    }
    return "";
  });

  let navigate = useNavigate();

  const duel = async (deck1: any, deck2: any, options: any = undefined) => {
    const roomJson = {
      players: [
        {
          name: "player1",
          mainDeck: [...deck1.mainDeck],
          extraDeck: deck1.extraDeck,
        },
        {
          name: "player2",
          mainDeck: [...deck2.mainDeck],
          extraDeck: deck2.extraDeck,
        },
      ],
      options: {
        shuffleDecks: true,
        ...(options || {}),
      },
    };

    console.log("duel", roomJson);
    setRoomDecks(roomJson);

    // Use the createRoom utility function
    const navigationState = await createRoom(kaibaNet, roomJson);

    // Navigate to the duel page with the state returned from createRoom
    navigate(`/duel/${navigationState.roomId}`, {
      state: navigationState,
    });
  };

  const duelFromInitialField = ({ deck, fieldState }: any) => {
    duel(deck, YUBEL, { fieldState });
  };

  const duelAs = (e: any, deck1: any, deck2: any) => {
    e.preventDefault();
    e.stopPropagation();
    duel(deck1, deck2);
  };

  const duelWithDeckFromStore = (e: any, deckId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const deckData = JSON.parse(localStorage.getItem(deckId)!) as any;
    duel(deckData, YUBEL);
  };

  const handleRoomJoin = async (roomId: any) => {
    console.log("App:handleRoomJoin:roomDecks", roomDecks);

    // Check if we're in offline mode
    const isOffline = kaibaNet.getCommunicationType() === "offline";

    if (isOffline) {
      // In offline mode, don't attempt to join a room via network
      logger.debug("Running in offline mode, skipping network room join");
    } else {
      // For online modes, join the room as before
      await kaibaNet.joinRoom(roomId);
    }

    // Navigate to the duel page with appropriate state
    navigate(`/duel/${roomId}`, {
      state: {
        roomId,
        playerId: kaibaNet.getPlayerId(),
        offline: isOffline,
      },
    });
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

  const openSpreadsheetBuilder = (replayData: any) => {
    localStorage.setItem("duel-data", JSON.stringify(replayData));
    navigate(`/spreadsheet`);
  };

  const playFromAReplay = (playerIndex: number, replayData: any) => {
    const deckData = JSON.parse(window.localStorage.getItem(selectedDeck)!);
    const otherDeckData = replayData.players[playerIndex];
    const { endField = [] } = replayData.replay;

    const fieldState = endField
      .map((card: any) => {
        const zoneData = YGOGameUtils.getZoneData(card.zone);
        if (zoneData.player === playerIndex) {
          return {
            ...card,
            zone: YGOGameUtils.transformZoneToPlayerZone(card.zone, 0),
          };
        }
        return undefined;
      })
      .filter((data: any) => data);

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

    console.log("DUEL DATA", JSON.parse(localStorage.getItem("duel-data")!));

    navigate("/duel");
  };

  const openRelay = (e: any, replayId: string) => {
    e.preventDefault();
    e.stopPropagation();

    localStorage.setItem("duel-data", window.localStorage.getItem(replayId)!);

    navigate("/duel");
  };

  const handleImport = async (file: File) => {
    if (!file) return;

    try {
      const result = await importAllData(file);
      alert(
        `Successfully imported ${result.decksCount} decks and ${result.replaysCount} replays`
      );

      // Refresh decks and replays lists
      setDecks(
        Object.keys(localStorage).filter((key) => key.startsWith("deck_"))
      );
      setReplays(
        Object.keys(localStorage)
          .filter((key) => key.startsWith("replay_"))
          .map((replay) => ({ name: replay, data: null }))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import data");
    }
  };

  const handleExport = async (method: "file" | "qr") => {
    try {
      if (method === "qr") {
        const data = await exportAllData("qr");
        return data; // Return the data to be used by the modal
      } else {
        await exportAllData("file");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleImportQR = async (qrData: string) => {
    try {
      // Pass the raw QR data (base64 compressed string) directly to importAllData
      const result = await importAllData(
        new Blob([qrData], { type: "application/json" })
      );

      alert(
        `Successfully imported ${result.decksCount} decks and ${result.replaysCount} replays`
      );

      // Refresh decks and replays lists
      setDecks(
        Object.keys(localStorage).filter((key) => key.startsWith("deck_"))
      );
      setReplays(
        Object.keys(localStorage)
          .filter((key) => key.startsWith("replay_"))
          .map((replay) => ({ name: replay, data: null }))
      );
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to import data from QR code"
      );
    }
  };

  useLazyReplay({ replays, setReplays });

  return (
    <div>
      <ConnectionSwitcher />
      <AppContainer>
        <LeftContent>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <h1>Home</h1>
          </div>

          <ul>
            <li>
              <Link onClick={(e) => duelAs(e, YUBEL, CHIMERA)} to="#">
                Duel as Yubel
              </Link>
            </li>
            <li>
              <Link onClick={(e) => duelAs(e, CHIMERA, YUBEL)} to="#">
                Duel as Chimera
              </Link>
            </li>

            {decks.map((deckId) => {
              return (
                <li>
                  <Link
                    to="#"
                    onClick={(e) => duelWithDeckFromStore(e, deckId)}
                  >
                    Duel as {deckId}
                  </Link>{" "}
                  <button onClick={() => deleteDeck(deckId)}>delete</button>
                  <button onClick={() => downloadDeckAsPng(deckId)}>
                    download as image
                  </button>
                  <button onClick={() => downloadDeckAsYdk(deckId)}>
                    download YDK
                  </button>
                  <button onClick={() => exportToMd(deckId)}>
                    export to MD
                  </button>
                </li>
              );
            })}
            <li>
              <Link to={"/deck"}>Download deck</Link>
            </li>
            <li>
              <Link to={"/deckbuilder"}>Deck Builder</Link>
            </li>
            <li>
              <Link to={"/collections"}>Collections</Link>
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
              {selectedDeck && (
                <button onClick={() => setDeckToPlay(selectedDeck)}>
                  Create a combo
                </button>
              )}
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
                      <EndGameBoard
                        play={playFromAReplay}
                        openSpreadsheetBuilder={openSpreadsheetBuilder}
                        data={replay.data}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {deckToPlay && (
            <ComboChooseDeck
              deckId={deckToPlay}
              onChoose={duelFromInitialField}
            />
          )}
        </LeftContent>
        <div>
          <RoomLobby
            playerId={kaibaNet.getPlayerId()}
            rooms={rooms}
            onRoomJoin={handleRoomJoin}
          />
        </div>
      </AppContainer>
      <DataExportModal
        onExport={handleExport}
        onImport={handleImport}
        onImportQR={handleImportQR}
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

const EndGameBoard = memo(function EndGameBoard({
  data,
  play,
  openSpreadsheetBuilder,
}: any) {
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
      const zoneData = YGOGameUtils.getZoneData(data.zone);
      const card = getCard(zoneData.player, data.id);
      const cardData = { ...card, ...data, zoneData };

      if (zoneData.zone === "M") {
        fields[zoneData.player].monsterZones[zoneData.zoneIndex - 1] = cardData;
      }
      if (zoneData.zone === "S") {
        fields[zoneData.player].spellTrapZones[zoneData.zoneIndex - 1] =
          cardData;
      }
      if (zoneData.zone === "EMZ" && zoneData.player === zoneData.player) {
        fields[zoneData.player].extraMonsterZones[zoneData.zoneIndex - 1] =
          cardData;
      }
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
                            extraMonsterZone1 === 0
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
                            extraMonsterZone2 === 0
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
            <button onClick={() => openSpreadsheetBuilder(data)}>
              make a spreedsheet
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

async function downloadDeckAsPng(deckId: string) {
  const fileName = deckId + ".png";
  const deck = JSON.parse(window.localStorage.getItem(deckId)!);

  const deckBuilder = new YGODeckToImage({
    name: deckId,
    mainDeck: deck.mainDeck as any,
    extraDeck: deck.extraDeck as any,
  });

  await deckBuilder.toImage({ fileName, download: true });
}

async function downloadDeckAsYdk(deckId: string) {
  const fileName = deckId + ".ydk";
  const deck = JSON.parse(window.localStorage.getItem(deckId)!);

  const deckBuilder = new YGODeckToImage({
    mainDeck: deck.mainDeck as any,
    extraDeck: deck.extraDeck as any,
  });
  deckBuilder.downloadYdk({ fileName });
}

const exportToMd = (deckId: string) => {
  const deck = JSON.parse(window.localStorage.getItem(deckId)!);
  const code = generateExportToMdCode(deck.mainDeck, deck.extraDeck);
  navigator.clipboard.writeText(code);
};
