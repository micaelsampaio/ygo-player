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
    //await this.peerToPeer.subscribeTopic(peerId);

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
    console.log("xxxxxxxxxxxxxxxxxxx");
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
      console.log("TCL:: EXEC COMMAND ", command);
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

  private waitForPlayer = async (roomId, retryAttempts, retryDelay) => {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      console.log(this.players);
      const player = this.players.get(roomId);
      if (player) return player; // Return the player immediately when found

      console.log(`Attempt ${attempt}: Waiting for player discovery...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
    return null; // Return null if no player is found after all attempts
  };

  async joinRoom(roomId: string, retryAttempts = 5, retryDelay = 5000) {
    console.log(`Attempting to join room ${roomId}...`);
    this.roomId = roomId;

    // Wait for player discovery
    const player = await this.waitForPlayer(roomId, retryAttempts, retryDelay);
    if (!player) {
      throw new Error("End of attempts to wait for player discovery");
    }
    // Connects to the room owner they will exchange the topics they are subscribed to
    console.log(`Connecting to peer...`);
    const connected = await this.peerToPeer?.connectToPeerWithFallback(
      roomId,
      player.addresses
    );

    if (!connected) {
      throw new Error("Failed to connect to peer using any method");
    }

    // Subscribe to room message events
    this.peerToPeer.on(
      `topic:${this.roomId}:message`,
      this.roomTopicMessageHandler
    );
    // wait for the gossipsub to update
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const roomOwnerConnection = await this.peerToPeer.isPeerConnected(roomId);
    console.log("KaibaNet: Room owner connection status", roomOwnerConnection);

    // Pubsub protocol will send the current peers subcriptions when connects to a peer
    // Subscribe to room topic
    const subscribed = await this.peerToPeer?.subscribeTopic(roomId);
    if (!subscribed) {
      throw new Error("Failed to subscribe to room topic");
    }

    // Force mesh refresh after subscription
    await this.peerToPeer?.refreshMesh(roomId);

    // Wait for the gossipsub to update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const meshPeers =
      this.peerToPeer?.libp2p.services.pubsub.getMeshPeers(roomId);
    console.log("Mesh peers after refresh:", meshPeers);

    if (!meshPeers || meshPeers.length === 0) {
      // Try one more refresh
      await this.peerToPeer?.refreshMesh(roomId);
    }

    // First check if we are connected
    if (!roomOwnerConnection) {
      throw new Error("Peer not connected");
    }

    await this.peerToPeer?.messageTopic(
      roomId,
      `duel:player:join:${this.playerId}`
    );
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
    const base64Encoded = objectToB64(gameState);
    await new Promise((resolve) => setTimeout(resolve, 3000));
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
  );
}

function b64ToObject(data: any) {
  return JSON.parse(b64ToString(data));
}
