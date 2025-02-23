import { Link } from "react-router";
import YUBEL from "./decks/YUBEL_FS.json";
import CHIMERA from "./decks/CHIMERA.json";
import { useNavigate } from "react-router";
import PlayerLobby from "./PlayerLobby";
import { useState, useEffect } from "react";
import { useKaibaNet } from "./useKaibaNet";

const cdnUrl = String(import.meta.env.VITE_YGO_CDN_URL)

export default function App() {

  const kaibaNet = useKaibaNet();
  const [players, setPlayers] = useState(kaibaNet.getPlayers()); // Add reactive state for players

  // Effect to update players state when kaibaNet's players change
  useEffect(() => {
    const updatePlayers = () => {
      setPlayers(kaibaNet.getPlayers()); // Update players state
    };

    kaibaNet.on("players:updated", updatePlayers); // Listen for the players:updated event

    return () => {
      kaibaNet.removeListener("players:updated", updatePlayers); // Clean up the listener
    };
  }, [kaibaNet]);

  const [replays, setReplays] = useState(() => {
    const allKeys = Object.keys(localStorage);
    const replayKeys = allKeys.filter((key) => key.startsWith("replay_"));

    return replayKeys;
  });

  const [decks, setDecks] = useState(() => {
    const allKeys = Object.keys(localStorage);
    const decks = allKeys.filter((key) => key.startsWith("deck_"));
    return decks;
  });

  const [roomDecks, setRoomDecks] = useState({});
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

  const handleRoomReady = () => {
    console.log("Room is ready!");
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
            <li key={deckId}>
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

          <ul>
            {replays.map((replayId) => {
              return (
                <li key={replayId}>
                  <Link onClick={(e) => openRelay(e, replayId)} to="#">
                    {replayId}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
        Play As {" "}
        <select value={selectedDeck} onChange={e => {
          window.localStorage.setItem("selected-deck", e.target.value);
          setSelectedDeck(e.target.value);
        }}>
          <option>Select a Deck</option>
          {decks.map(deck => <option key={deck} value={deck}>{deck}</option>)}
        </select>

        <ul>
          {replays.map((replay) => {
            return <li>
              <Link onClick={e => openRelay(e, replay.name)} to="#">{replay.name}</Link>
              {" "}<button onClick={() => deleteReplay(replay.name)}>delete</button>
              <br />
              <EndGameBoard play={playFromAReplay} data={replay.data} />
            </li>
          })}
        </ul>
      </div>}

      <PlayerLobby
        playerId={kaibaNet.getPlayerId()}
        players={players}
        onRoomReady={handleRoomReady}
      />
    </div>
  );
}

export default App;
