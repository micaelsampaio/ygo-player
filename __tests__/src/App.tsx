import { Link } from "react-router"
import YUBEL from "./decks/YUBEL_FS.json";
import CHIMERA from "./decks/CHIMERA.json";
import { useNavigate } from "react-router";
import Chat from "./Chat";
import { useState } from "react";

function App() {

  const [replays] = useState(() => {

    const allKeys = Object.keys(localStorage);
    const replayKeys = allKeys.filter(key => key.startsWith('replay_'));

    return replayKeys;
  });

  const [decks, setDecks] = useState(() => {
    const allKeys = Object.keys(localStorage);
    const decks = allKeys.filter(key => key.startsWith('deck_'));
    return decks;
  });

  let navigate = useNavigate();

  const duel = (e: any, deck1: any, deck2: any) => {
    e.preventDefault();
    e.stopPropagation();

    localStorage.setItem("duel-data", JSON.stringify({
      players: [{
        name: "player1",
        mainDeck: deck1.mainDeck,
        extraDeck: deck1.extraDeck,
      }, {
        name: "player2",
        mainDeck: deck2.mainDeck,
        extraDeck: deck2.extraDeck,
      }]
    }))
    navigate("/duel");
  }

  const duelWithDeckFromStore = (e: any, deckId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const deckData = JSON.parse(localStorage.getItem(deckId)!) as any;

    localStorage.setItem("duel-data", JSON.stringify({
      players: [{
        name: "player1",
        mainDeck: deckData.mainDeck,
        extraDeck: deckData.extraDeck,
      }, {
        name: "player2",
        mainDeck: YUBEL.mainDeck,
        extraDeck: YUBEL.extraDeck,
      }]
    }))
    navigate("/duel");
  }

  const deleteDeck = (deckId: string) => {
    if (confirm("Are you sure you want to delete " + deckId) == true) {
      localStorage.removeItem(deckId);
      setDecks(decks => decks.filter(d => d !== deckId));
    }
  }

  const openRelay = (e: any, replayId: string) => {
    e.preventDefault();
    e.stopPropagation();

    localStorage.setItem("duel-data", window.localStorage.getItem(replayId)!);

    navigate("/duel");
  }

  return (
    <div>
      <h1># Decks</h1>
      <ul>
        <li><Link onClick={e => duel(e, YUBEL, CHIMERA)} to="#">Duel as Yubel</Link></li>
        <li><Link onClick={e => duel(e, CHIMERA, YUBEL)} to="#">Duel as Chimera</Link></li>

        {decks.map((deckId) => {
          return <li>
            <Link to="#" onClick={e => duelWithDeckFromStore(e, deckId)}>Duel as {deckId}</Link>
            {" "}<button onClick={() => deleteDeck(deckId)}>delete</button>
          </li>
        })}
        <li>
          <Link to={"/deck"}>Download deck</Link>
        </li>
      </ul>

      {replays.length > 0 && <div>
        <h1># Replays </h1>

        <ul>
          {replays.map((replayId) => {
            return <li><Link onClick={e => openRelay(e, replayId)} to="#">{replayId}</Link></li>
          })}
        </ul>
      </div>}

      <Chat />


    </div>
  )
}

export default App
