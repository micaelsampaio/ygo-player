import { PeerToPeer } from "./p2p.js";
import EventEmitter from "events";

export class KaibaNet extends EventEmitter {
  private static instance: KaibaNet | null = null;
  private players: Map<
    string,
    { id: string; addresses: string[]; connected: boolean }
  > = new Map();
  private rooms: Map<string, { id: string; connected: boolean }> = new Map();
  private playerId: string | null = null;
  private roomId: string | null = null;
  private initialized = false;
  private peerToPeer: PeerToPeer | null = null; // Store the PeerToPeer instance

  private constructor() {
    super();
    if (KaibaNet.instance) {
      throw new Error("Use KaibaNet.getInstance() instead of new KaibaNet()");
    }
  }

  public static getInstance(): KaibaNet {
    if (!KaibaNet.instance) {
      KaibaNet.instance = new KaibaNet();
    }
    return KaibaNet.instance;
  }

  async initialize() {
    if (this.initialized) return;

    // Create and store the PeerToPeer instance
    this.peerToPeer = new PeerToPeer(
      import.meta.env.VITE_BOOTSTRAP_NODE,
      import.meta.env.VITE_DISCOVERY_TOPIC || "peer-discovery"
    );

    // Start P2P and get peer ID
    await this.peerToPeer.startP2P();
    const peerId = await this.peerToPeer.getPeerId();
    this.playerId = peerId;

    // Subscribe to topic
    await this.peerToPeer.subscribeTopic(peerId);

    // Set up event listeners
    this.setupEventListeners();

    this.initialized = true;
  }

  public getPlayerId() {
    return this.playerId;
  }

  public getPlayers() {
    return this.players;
  }

  public getRoomId() {
    return this.roomId;
  }

  public getRooms() {
    return this.rooms;
  }

  private addPlayer = ({ peerId, addresses }) => {
    console.log("KaibaNet: Peer discovered", peerId, addresses);
    this.players = new Map(this.players).set(peerId, {
      id: peerId,
      addresses,
      connected: false,
    });
    // Emit event when player is discovered or updated
    this.emit("players:updated", this.players);
  };

  private connectPlayer = ({ peerId }) => {
    console.log("KaibaNet: Connection opened", peerId);
    const player = this.players.get(peerId) || { id: peerId, addresses: [] };
    if (player.connected !== true) {
      this.players = new Map(this.players).set(peerId, {
        ...player,
        connected: true,
      });
      // Emit event when a player's connection is updated
      this.emit("players:updated", this.players);
    }
  };

  private disconnectPlayer = ({ peerId }) => {
    console.log("KaibaNet: Connection closed", peerId);
    const player = this.players.get(peerId);
    if (player && player.connected !== false) {
      this.players = new Map(this.players).set(peerId, {
        ...player,
        connected: false,
      });
      // Emit event when a player's connection is updated
      this.emit("players:updated", this.players);
    }
  };

  private removePlayer = ({ peerId }) => {
    console.log("KaibaNet: Peer removed", peerId);
    if (this.players.has(peerId)) {
      this.players = new Map(this.players);
      this.players.delete(peerId);
      // Emit event when player is removed
      this.emit("players:updated", this.players);
    }
  };

  private roomTopicMessageHandler = ({ messageStr }) => {
    console.log("KaibaNet: Message on Room Topic:", messageStr);

    // When we receive a message with the game state, emit an event with the decoded gameState
    if (messageStr.includes("duel:refresh:state:")) {
      console.log("KaibaNet: Game state refresh message received", messageStr);
      const gameStateBase64 = messageStr.toString().split(":")[3];
      const decodedGameState = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(gameStateBase64), (c) => c.charCodeAt(0))
        )
      );
      this.emit("duel:refresh:state:", decodedGameState);
    }

    // Handle player join messages in room topic
    if (messageStr.includes("duel:player:join:")) {
      const playerJoinedId = messageStr.split(":")[3];
      console.log("KaibaNet: Player joined room", playerJoinedId);
      this.emit("duel:player:join:", playerJoinedId);
    }

    // Handle player join messages in room topic
    if (messageStr.includes("duel:command:exec:")) {
      const command = b64ToObject(messageStr.split(":")[3]);
      console.log("TCL:: EXEC COMMAND ", command)
      this.emit("duel:command:exec", command);
    }
  };

  private discoveryTopicMessageHandler = ({ messageStr }) => {
    if (messageStr.includes("room:create:")) {
      const roomId = messageStr.split(":")[2];
      this.rooms = new Map(this.rooms).set(roomId, {
        id: roomId,
        connected: false,
      });
      console.log("KaibaNet: Room created Message received", roomId);
      console.log("KaibaNet: Room created Message received", this.rooms);
      console.log("KaibaNet: About to emit rooms:updated event", this.rooms);
      this.emit("rooms:updated", this.rooms);
      console.log("KaibaNet: Emitted rooms:updated event");
    }
  };

  private setupEventListeners() {
    if (!this.peerToPeer) return;

    this.peerToPeer.removeAllListeners("peer:discovery");
    this.peerToPeer.on("peer:discovery", this.addPlayer);

    this.peerToPeer.on("connection:open", this.connectPlayer);
    this.peerToPeer.on("connection:close", this.disconnectPlayer);
    this.peerToPeer.on("remove:peer", this.removePlayer);

    // Listen to discovery topic
    this.peerToPeer.on(
      "topic:" + this.peerToPeer.getDiscoveryTopic() + ":message",
      this.discoveryTopicMessageHandler
    );

    // If we have a roomId, set up room topic listener
    if (this.roomId) {
      this.peerToPeer.on(
        "topic:" + this.roomId + ":message",
        this.roomTopicMessageHandler
      );
    }
  }

  cleanListeners() {
    if (this.peerToPeer) {
      this.peerToPeer.removeAllListeners();
    }
    this.removeAllListeners();
  }

  cleanup() {
    this.cleanListeners();
    this.players.clear();
    this.playerId = null;
    this.initialized = false;
    this.peerToPeer = null;
  }

  async createRoom() {
    const discoveryTopic = await this.peerToPeer.getDiscoveryTopic();
    this.roomId = this.playerId; // Set roomId as owner

    this.rooms = new Map(this.rooms).set(this.playerId, {
      id: this.playerId,
      connected: false,
    });

    // Subscribe to own room topic (as room owner)
    await this.peerToPeer.subscribeTopic(this.playerId);

    // Set up room topic listener
    this.peerToPeer.on(
      "topic:" + this.playerId + ":message",
      this.roomTopicMessageHandler
    );

    await this.peerToPeer.messageTopic(
      discoveryTopic,
      "room:create:" + this.playerId
    );
    this.emit("rooms:updated", this.rooms);
  }

  async joinRoom(roomId: string, retryAttempts = 5, retryDelay = 1000) {
    this.roomId = roomId;

    // First check if we're already connected
    if (this.peerToPeer && await this.peerToPeer.isPeerConnected(roomId)) {
      console.log(`Already connected to room ${roomId}, proceeding with subscription`);
    } else {
      // Try to connect to the peer with retries
      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          const player = this.players.get(roomId);

          if (!player) {
            console.log(`Attempt ${attempt}: Waiting for player discovery...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }

          console.log(`Attempt ${attempt}: Connecting to peer...`);
          const connected = await this.peerToPeer?.connectToPeerWithFallback(roomId, player.addresses);
            
          if (!connected) {
            throw new Error("Failed to connect using any method");
          }
          break; // Successfully connected, exit retry loop
        } catch (error) {
          console.log(`Attempt ${attempt} failed:`, error);
          if (attempt === retryAttempts) {
            throw new Error(`Failed to join room after ${retryAttempts} attempts`);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // Proceed with room subscription and setup
    try {
      await this.peerToPeer?.subscribeTopic(roomId);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await this.peerToPeer?.messageTopic(
        roomId,
        "duel:player:join:" + this.playerId
      );
    } catch (error) {
      console.error("Failed to setup room subscription:", error);
      throw error;
    }
  }

  public cleanupRoomListener(roomId: string) {
    if (!this.peerToPeer) return;
    this.peerToPeer.removeAllListeners("topic:" + roomId + ":message");
    // Optionally unsubscribe from the topic
    this.peerToPeer.unsubscribeTopic(roomId);
  }

  async refreshGameState(roomId: string, gameState: string) {
    console.log("KaibaNet: Refreshing game state", roomId, gameState);
    // Encode the room decks data
    const jsonString = JSON.stringify(gameState);
    const base64Encoded = btoa(
      new TextEncoder()
        .encode(jsonString)
        .reduce((acc, byte) => acc + String.fromCharCode(byte), "")
    );
    // Send message after delay
    await this.peerToPeer.messageTopic(
      roomId,
      "duel:refresh:state:" + base64Encoded
    );
  }

  async execYGOCommand(roomId: string, command: any) {
    const commandB64 = objectToB64(command);
    await this.peerToPeer.messageTopic(
      roomId,
      "duel:command:exec:" + commandB64
    );
  }
}

function objectToB64(json: any) {
  const jsonStr = JSON.stringify(json);
  return stringToB64(jsonStr);
}
function stringToB64(str: string) {
  const base64Encoded = btoa(
    new TextEncoder()
      .encode(str)
      .reduce((acc, byte) => acc + String.fromCharCode(byte), "")
  );
  return base64Encoded;
}
function b64ToString(str: any) {
  return new TextDecoder().decode(
    Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
  )
}
function b64ToObject(data: any) {
  return JSON.parse(b64ToString(data));
}
