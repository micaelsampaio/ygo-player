// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";
import cors from "cors";
import { YGOSocketClient } from "./ygo-client.js";
import { YGOGameServer } from "ygo-core";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket"],
});

app.use(cors());
app.use(express.json());
/**
 * Room class
 */
class Room {
  constructor(id) {
    this.id = id;
    this.game = undefined;
    this.players = []; // { id: socketId, deck: null, ready: false }
  }

  addPlayer(socket) {
    if (this.players.length >= 2) {
      throw new Error("Room is full");
    }
    this.players.push({ id: socket.id, deck: null, ready: false, socket });
  }

  setDeck(socketId, deck) {
    const player = this.players.find((p) => p.id === socketId);
    if (player) {
      player.deck = deck;
    }
  }

  setGame(game) {
    this.game = game;
  }

  setReady(socketId) {
    const player = this.players.find((p) => p.id === socketId);
    if (player) {
      player.ready = true;
    }
  }

  isFull() {
    return this.players.length === 2;
  }

  allReady() {
    return this.isFull() && this.players.every((p) => p.ready);
  }

  getPublicRoomData() {
    return {
      id: this.id,
      players: this.players.map((p) => ({
        ready: p.ready,
        hasDeck: !!p.deck, // don't leak deck details
      })),
      full: this.isFull(),
    };
  }

  getPublicRoomDataWithGame() {
    if (this.game) {
      return {
        ...this.getPublicRoomData(),
        game: this.game.getGameState()
      }
    }
    return this.getPublicRoomData()
  }

  destroy() {

  }
}

// Store lobbies
const lobbies = new Map(); // lobbyId -> Room

/**
 * REST Endpoints
 */

// Get list of lobbies
app.get("/lobbies", (req, res) => {
  const list = Array.from(lobbies.values()).map((room) => (room.getPublicRoomData()));
  res.json(list);
});

app.get("/lobbies/playing", (req, res) => {
  const list = Array.from(lobbies.values()).filter(room => !!room.game).map((room) => (room.getPublicRoomDataWithGame()));
  res.json(list);
});

// Create new lobby
app.post("/lobbies", (req, res) => {
  const lobbyId = randomUUID();
  const room = new Room(lobbyId);
  lobbies.set(lobbyId, room);

  io.emit("lobbyListUpdate", Array.from(lobbies.values()).map(lobby => lobby.getPublicRoomData()));

  res.json({ id: lobbyId });
});

/**
 * Socket.IO handling
 */
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on("joinLobby", (lobbyId) => {
    const room = lobbies.get(lobbyId);
    if (!room) {
      socket.emit("error", "Lobby not found");
      return;
    }

    try {
      room.addPlayer(socket);
      socket.join(lobbyId);

      io.to(lobbyId).emit("lobbyUpdate", room.getPublicRoomData());
      io.emit("lobbyListUpdate", Array.from(lobbies.values()).map(lobby => lobby.getPublicRoomData()));

      console.log(`Player ${socket.id} joined lobby ${lobbyId}`);
    } catch (err) {
      socket.emit("error", err.message);
    }
  });

  socket.on("sendDeck", ({ lobbyId, deck }) => {
    const room = lobbies.get(lobbyId);
    if (!room) return;
    room.setDeck(socket.id, deck);
    io.to(lobbyId).emit("lobbyUpdate", room.getPublicRoomData());
  });

  socket.on("player-ready", (lobbyId) => {
    const room = lobbies.get(lobbyId);
    if (!room) return;
    room.setReady(socket.id);
    io.to(lobbyId).emit("lobbyUpdate", room.getPublicRoomData());

    if (room.allReady()) {
      startGame(room);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    // Cleanup (optional: remove empty rooms)
    for (const [id, room] of lobbies.entries()) {
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (room.players.length === 0) {
        lobbies.get(id).destroy();
        lobbies.delete(id);
      }
    }

    io.emit("lobbyListUpdate", Array.from(lobbies.values()).map(lobby => lobby.getPublicRoomData()));
  });
});

/**
 * Start game function
 */
async function startGame(room) {
  console.log(`🎮 Starting game in lobby ${room.id}`);

  const cardsIds = new Set();
  const players = room.players.map(p => {

    p.deck.mainDeck.forEach((id) => cardsIds.add(id));
    p.deck.extraDeck.forEach((id) => cardsIds.add(id));
    if (p.deck.sideDeck) {
      p.deck.sideDeck.forEach((id) => cardsIds.add(id));
    }

    return new YGOSocketClient(p.socket, p.id, 1);
  })

  const response = await fetch(`https://api.ygo101.com/cards?ids=${Array.from(cardsIds.values()).join(",")}`);
  //const response = await fetch(`http://localhost:5000/cards?ids=${Array.from(cardsIds.values()).join(",")}`);
  const cards = await response.json();

  const game = new YGOGameServer({
    players,
    ygoCoreProps: {
      players: room.players.map((p, index) => ({
        name: `player${index + 1}`,
        mainDeck: p.deck.mainDeck.map(id => cards.find(c => c.id === id)),
        extraDeck: p.deck.extraDeck.map(id => cards.find(c => c.id === id)),
        sideDeck: p.deck.sideDeck ? p.deck.sideDeck.map(id => cards.find(c => c.id === id)) : [],
      })),
      options: {
        // TODO
      }
    }
  })

  console.log("CREATE GAME SERVER");

  room.setGame(game);

  io.to(room.id).emit("gameStarted", { lobbyId: room.id });
}

const PORT = process.env.PORT || 5800;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
