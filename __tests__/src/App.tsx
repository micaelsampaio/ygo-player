import YUBEL from "./decks/YUBEL_FS.json";
import CHIMERA from "./decks/CHIMERA.json";
import { useNavigate, Link, Routes, Route } from "react-router-dom";
import RoomLobby from "./components/RoomLobby.js";
import DuelLobbyPage from "./components/DuelLobby/DuelLobbyPage";
import { useKaibaNet } from "./hooks/useKaibaNet";
import { memo, useEffect, useState } from "react";
import { YGOGameUtils } from "ygo-core";
import { YGODeckToImage } from "ygo-core-images-utils";
import { Logger } from "./utils/logger";
import { ComboChooseDeck } from "./components/ComboChooseDeck";
import { exportAllData, importAllData } from "./utils/dataExport";
import { generateExportToMdCode } from "./utils/export-to-md.js";
import { DataExportModal } from "./components/Data/DataExportModal.js";
import { createRoom, cleanDuelData } from "./utils/roomUtils";
import AppLayout from "./components/Layout/AppLayout";
import { ThemeProvider } from "styled-components";
import GlobalStyles from "./styles/GlobalStyles";
import theme from "./styles/theme";
import Card from "./components/UI/Card";
import Button from "./components/UI/Button";
import styled from "styled-components";
import MatchupMakerPage from "./pages/MatchupMakerPage";
import GameToolsPage from "./pages/GameToolsPage"; // Updated import to use GameToolsPage

// Import CDN URL for card images
const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL);

const logger = Logger.createLogger("App");

// Styled components using our theme
const HomePage = styled.div`
  max-width: 1800px;
  margin: 0 auto;
  padding: 0;
`;

const HomeContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: ${theme.spacing.lg};

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const ContentLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const ContentRight = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const SectionHeader = styled.div`
  margin-bottom: ${theme.spacing.md};

  h2 {
    color: ${theme.colors.text.primary};
    font-weight: ${theme.typography.weight.semibold};
    font-size: ${theme.typography.size.xl};
    margin: 0;
  }
`;

const CardNavigation = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const NavCard = styled(Link)`
  background-color: ${theme.colors.background.paper};
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  text-align: center;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${theme.shadows.md};
    text-decoration: none;
  }

  .nav-card-title {
    font-weight: ${theme.typography.weight.medium};
    font-size: ${theme.typography.size.md};
  }
`;

const QuickPlaySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const QuickPlayCard = styled(Card)`
  padding: ${theme.spacing.md};

  h3 {
    font-size: ${theme.typography.size.lg};
    margin-bottom: ${theme.spacing.sm};
  }
`;

const QuickPlayLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const QuickPlayLink = styled.a`
  display: block;
  padding: ${theme.spacing.sm};
  color: ${theme.colors.primary.main};
  text-decoration: none;
  border-radius: ${theme.borderRadius.sm};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${theme.colors.background.card};
    text-decoration: none;
  }
`;

const ReplaysSection = styled.div`
  margin-top: ${theme.spacing.lg};
`;

const ReplaySelector = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};

  select {
    padding: ${theme.spacing.sm};
    border-radius: ${theme.borderRadius.sm};
    border: 1px solid ${theme.colors.border.default};
    background-color: ${theme.colors.background.paper};
    min-width: 200px;
  }
`;

const ReplaysList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const ReplayItem = styled(Card)`
  padding: ${theme.spacing.md};
`;

const ReplayHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};

  h3 {
    margin: 0;
    font-size: ${theme.typography.size.lg};
  }
`;

const ReplayActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const ViewAllBtn = styled(Link)`
  width: 100%;
  text-align: center;
  margin-top: ${theme.spacing.md};
`;

const QuickLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const QuickLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  text-decoration: none;
  color: ${theme.colors.text.primary};
`;

const QuickLinkIcon = styled.span`
  font-size: ${theme.typography.size.lg};
`;

const QuickLinkText = styled.span`
  font-size: ${theme.typography.size.md};
`;

export function App({ duelLobbyMode }: { duelLobbyMode?: boolean }) {
  const kaibaNet = useKaibaNet();
  const [rooms, setRooms] = useState(() => kaibaNet.getRooms());
  const [deckToPlay, setDeckToPlay] = useState("");
  const [qrData, setQrData] = useState(null);

  const onRoomsUpdated = (updatedRooms: any) => {
    console.log("App: Updated rooms", updatedRooms);
    setRooms(new Map(updatedRooms));
  };

  useEffect(() => {
    console.log("kaibaNet in useEffect:", kaibaNet);
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
    // Filter out deck_groups since it's not an actual deck but a collection of decks
    const decks = allKeys.filter(
      (key) => key.startsWith("deck_") && key !== "deck_groups"
    );
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

    // Clean up any previous duel data using the centralized utility function
    cleanDuelData();

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

  if (duelLobbyMode) {
    return <DuelLobbyPage />;
  }

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AppLayout>
        <HomePage>
          <HomeContent>
            <ContentLeft>
              <div>
                <SectionHeader>
                  <h2>My Yu-Gi-Oh!</h2>
                </SectionHeader>
                <CardNavigation>
                  <NavCard to="/my/decks">
                    <span className="nav-card-title">My Decks</span>
                  </NavCard>
                  <NavCard to="/my/cards/groups">
                    <span className="nav-card-title">My Card Groups</span>
                  </NavCard>
                  <NavCard to="/my/combos">
                    <span className="nav-card-title">My Combos</span>
                  </NavCard>
                  <NavCard to="/my/replays">
                    <span className="nav-card-title">My Replays</span>
                  </NavCard>
                  <NavCard to="/collections">
                    <span className="nav-card-title">Collections</span>
                  </NavCard>
                </CardNavigation>
              </div>

              <div>
                <SectionHeader>
                  <h2>Tools</h2>
                </SectionHeader>
                <CardNavigation>
                  <NavCard to="/deckbuilder">
                    <span className="nav-card-title">Deck Builder</span>
                  </NavCard>
                  <NavCard to="/deck">
                    <span className="nav-card-title">Import Deck</span>
                  </NavCard>
                  <NavCard to="/cards/database">
                    <span className="nav-card-title">Card Database</span>
                  </NavCard>
                  <NavCard to="/rulings">
                    <span className="nav-card-title">Card Rulings</span>
                  </NavCard>
                  <NavCard to="/matchup-maker">
                    <span className="nav-card-title">Matchup Maker</span>
                  </NavCard>
                  <NavCard to="/game-tools">
                    <span className="nav-card-title">Game Tools</span>
                  </NavCard>
                  <NavCard to="/deck-converter">
                    <span className="nav-card-title">Deck Converter</span>
                  </NavCard>
                </CardNavigation>
              </div>

              <div>
                <SectionHeader>
                  <h2>Duel</h2>
                </SectionHeader>
                <CardNavigation>
                  <NavCard to="/duel">
                    <span className="nav-card-title">Quick Duel</span>
                  </NavCard>
                  <NavCard to="/duel/lobby">
                    <span className="nav-card-title">Duel Lobby</span>
                  </NavCard>
                </CardNavigation>
              </div>

              <div>
                <SectionHeader>
                  <h2>Quick Play</h2>
                </SectionHeader>
                <QuickPlaySection>
                  {/* Predefined decks */}
                  <QuickPlayCard elevation="low">
                    <Card.Content>
                      <h3>Featured Decks</h3>
                      <QuickPlayLinks>
                        <QuickPlayLink
                          href="#"
                          onClick={(e) => duelAs(e, YUBEL, CHIMERA)}
                        >
                          Duel as Yubel
                        </QuickPlayLink>
                        <QuickPlayLink
                          href="#"
                          onClick={(e) => duelAs(e, CHIMERA, YUBEL)}
                        >
                          Duel as Chimera
                        </QuickPlayLink>
                      </QuickPlayLinks>
                    </Card.Content>
                  </QuickPlayCard>

                  {/* User's custom decks */}
                  {decks.length > 0 && (
                    <QuickPlayCard elevation="low">
                      <Card.Content>
                        <h3>Your Decks</h3>
                        <QuickPlayLinks>
                          {decks.map((deckId) => {
                            // Get the actual deck data to display the proper name
                            try {
                              const deckData = JSON.parse(
                                localStorage.getItem(deckId) || "{}"
                              );
                              const deckName =
                                deckData.name || deckId.replace("deck_", "");

                              return (
                                <QuickPlayLink
                                  key={deckId}
                                  href="#"
                                  onClick={(e) =>
                                    duelWithDeckFromStore(e, deckId)
                                  }
                                >
                                  Duel as {deckName}
                                </QuickPlayLink>
                              );
                            } catch (err) {
                              // Fallback in case of parsing error
                              return (
                                <QuickPlayLink
                                  key={deckId}
                                  href="#"
                                  onClick={(e) =>
                                    duelWithDeckFromStore(e, deckId)
                                  }
                                >
                                  Duel as {deckId.replace("deck_", "")}
                                </QuickPlayLink>
                              );
                            }
                          })}
                        </QuickPlayLinks>
                      </Card.Content>
                    </QuickPlayCard>
                  )}
                </QuickPlaySection>
              </div>

              {replays.length > 0 && (
                <ReplaysSection>
                  <SectionHeader>
                    <h2>Recent Replays</h2>
                  </SectionHeader>
                  <ReplaySelector>
                    <label>Play As: </label>
                    <select
                      value={selectedDeck}
                      onChange={(e) => {
                        window.localStorage.setItem(
                          "selected-deck",
                          e.target.value
                        );
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
                      <Button
                        onClick={() => setDeckToPlay(selectedDeck)}
                        variant="primary"
                        size="md"
                      >
                        Create a combo
                      </Button>
                    )}
                  </ReplaySelector>

                  <ReplaysList>
                    {replays.slice(0, 5).map((replay) => (
                      <ReplayItem key={replay.name} elevation="low">
                        <ReplayHeader>
                          <h3>{replay.name}</h3>
                          <ReplayActions>
                            <Button
                              onClick={() => deleteReplay(replay.name)}
                              variant="tertiary"
                            >
                              Delete
                            </Button>
                            <Button
                              as="a"
                              onClick={(e) => openRelay(e, replay.name)}
                              href="#"
                              variant="primary"
                            >
                              View Replay
                            </Button>
                          </ReplayActions>
                        </ReplayHeader>
                        <EndGameBoard
                          play={playFromAReplay}
                          openSpreadsheetBuilder={openSpreadsheetBuilder}
                          data={replay.data}
                        />
                      </ReplayItem>
                    ))}
                    {replays.length > 5 && (
                      <ViewAllBtn
                        to="/my/replays"
                        className="btn btn-outline view-all-btn"
                      >
                        <Button variant="tertiary" fullWidth>
                          View All Replays
                        </Button>
                      </ViewAllBtn>
                    )}
                  </ReplaysList>
                </ReplaysSection>
              )}

              {deckToPlay && (
                <Card elevation="low" padding={theme.spacing.md}>
                  <ComboChooseDeck
                    deckId={deckToPlay}
                    onChoose={duelFromInitialField}
                  />
                </Card>
              )}
            </ContentLeft>

            <ContentRight>
              {/* Quick links removed as requested */}
            </ContentRight>
          </HomeContent>

          <DataExportModal
            onExport={handleExport}
            onImport={handleImport}
            onImportQR={handleImportQR}
          />
          <Routes>
            <Route path="/matchup-maker" element={<MatchupMakerPage />} />
            <Route path="/game-tools" element={<GameToolsPage />} />
          </Routes>
        </HomePage>
      </AppLayout>
    </ThemeProvider>
  );
}

// ... rest of the code remains the same
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

export default App;
