import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { darkTheme } from "./css/theme";
import {
  Button,
  Card,
  Container,
  DeckItem,
  DeckList,
  FlexBox,
  Grid,
  Input,
  InputSelect,
  SectionTitle,
  TextArea,
  Title,
} from "./components/ui";
import { YGOSocketClient } from "./scripts/ygo-client";
import { useStorageDecks } from "./hooks/useStorageDecks";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5800"; // backend server URL
let socket: Socket | null = null;

function LobbyPage() {
  const [username, setUsername] = useState(window.localStorage.getItem("user") || "player1")
  const deckManager = useStorageDecks();
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [currentLobby, setCurrentLobby] = useState<any | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<any | null>(window.localStorage.getItem("debug_deck1") || deckManager.decks[0]?.id || "");
  const decks = deckManager.decks;
  const currentLobbyRef = useRef<any>(null);
  const navigate = useNavigate();

  currentLobbyRef.current = currentLobby;

  // connect socket only once
  useEffect(() => {
    if (window.ygoSocketClient) {
      window.ygoSocketClient.disconnect();
    }

    socket = io(API_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => console.log("🔌 Connected to server"));

    socket.on("lobbyUpdate", (room: any) => {
      if (room.id === currentLobbyRef.current?.id) {
        setCurrentLobby({ ...room });
      }

      setLobbies((prev) => {
        const index = prev.findIndex((lobby) => lobby.id === room.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = room;
          return updated;
        } else {
          return [...prev, room];
        }
      });
    });

    socket.on("gameStarted", (data) => {

      window.ygoSocketClient = new YGOSocketClient(
        socket!,
        window.localStorage.getItem("user") || "player1",
        1
      );
      navigate(`/duel/${data.lobbyId}`);
    });

    return () => {
      if (!window.ygoSocketClient) socket?.disconnect();
    };
  }, []);

  // fetch lobby list
  const fetchLobbies = async () => {
    const res = await fetch(`${API_URL}/lobbies`);
    const data = await res.json();
    setLobbies(data);
  };
  useEffect(() => { fetchLobbies(); }, []);

  const createLobby = async () => {
    const res = await fetch(`${API_URL}/lobbies`, { method: "POST" });
    const data = await res.json();
    setCurrentLobby({ id: data.id, players: [] });
    socket?.emit("joinLobby", data.id);
    fetchLobbies();
  };

  const joinLobby = (id: string) => {
    setCurrentLobby({ id, players: [] });
    socket?.emit("joinLobby", id);
  };

  const markReady = () => {
    if (!currentLobby || !selectedDeck) return;
    const deck = decks.find(d => d.id === selectedDeck);
    if (!deck) return alert("Deck not found");

    socket?.emit("sendDeck", {
      lobbyId: currentLobby.id, deck: {
        mainDeck: deck.mainDeck.map(c => c.id),
        extraDeck: deck.extraDeck.map(c => c.id),
        sideDeck: deck.sideDeck ? deck.sideDeck.map(c => c.id) : [],
      }
    });
    socket?.emit("player-ready", currentLobby.id);
  };

  return (
    <Container>
      <Title>⚔️ Lobby Zone</Title>
      <Grid>
        {/* Left: Current Lobby */}
        <Card>
          <SectionTitle>🎮 Current Lobby</SectionTitle>

          <Input placeholder="username" value={username} onChange={(e) => {
            setUsername(e.target.value);
            window.localStorage.setItem("user", e.target.value)
          }}
          />

          {currentLobby ? (
            <>
              <p>ID: {currentLobby.id}</p>
              <p>Players: {currentLobby.players?.length || 0}/2</p>

              {/* Deck Selection */}
              <div style={{ margin: "1rem 0" }}>
                <InputSelect
                  value={selectedDeck || ""}
                  onChange={(e) => setSelectedDeck(e.target.value)}
                >
                  <option value="">Select Your Deck</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </InputSelect>
              </div>

              <FlexBox gapX="10px" style={{ marginTop: "1rem" }}>
                <Button
                  color={darkTheme.accent}
                  disabled={!selectedDeck}
                  onClick={markReady}
                >
                  Ready
                </Button>
              </FlexBox>
            </>
          ) : (
            <p>No lobby joined yet</p>
          )}
        </Card>

        {/* Right: Lobby List */}
        <Card>
          <SectionTitle>📜 Available Lobbies</SectionTitle>
          <Button
            color={darkTheme.success}
            onClick={createLobby}
            style={{ marginBottom: "1rem" }}
          >
            + Create Lobby
          </Button>

          {lobbies.length === 0 ? (
            <p>No lobbies available</p>
          ) : (
            lobbies.map((lobby) => (
              <FlexBox
                key={lobby.id}
                style={{
                  marginBottom: "0.5rem",
                  padding: "0.5rem",
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: "8px",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {lobby.id} — {lobby.players.length}/2
                </span>
                <Button
                  color={darkTheme.accent}
                  disabled={lobby.full}
                  onClick={() => joinLobby(lobby.id)}
                >
                  Join
                </Button>
              </FlexBox>
            ))
          )}
        </Card>
      </Grid>
    </Container>
  );
}

export default LobbyPage;
