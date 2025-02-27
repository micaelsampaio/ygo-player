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

  private playerTopicMessageHandler = ({ messageStr }) => {
    console.log(
      "KaibaNet: Message on PlayerID",
      this.playerId,
      "Topic:",
      messageStr
    );
    //When we receive a message with the player joining the duel room, emit an event with the player's ID
    if (messageStr.includes("duel:player:join:")) {
      const playerJoinedId = messageStr.split(":")[3];
      console.log("KaibaNet: Player joined Message received", playerJoinedId);
      this.emit("duel:player:join:", playerJoinedId);
    }
    // When we receive a message with the game state, emit an event with the decoded gameState
    if (messageStr.includes("duel:refresh:state:")) {
      const gameStateBase64 = messageStr.toString().split(":")[3];
      const decodedGameState = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(gameStateBase64), (c) => c.charCodeAt(0))
        )
      );
      this.emit("duel:refresh:state:", decodedGameState);
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

    this.peerToPeer.on(
      "topic:" + this.playerId + ":message",
      this.playerTopicMessageHandler
    );

    this.peerToPeer.on(
      "topic:" + this.peerToPeer.getDiscoveryTopic() + ":message",
      this.discoveryTopicMessageHandler
    );
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

  // Sends a message to the discovery topic announcing the creation of a room
  async createRoom() {
    const discoveryTopic = await this.peerToPeer.getDiscoveryTopic();
    this.rooms = new Map(this.rooms).set(this.playerId, {
      id: this.playerId,
      connected: false,
    });
    await this.peerToPeer.messageTopic(
      discoveryTopic,
      "room:create:" + this.playerId
    );
    this.emit("rooms:updated", this.rooms);
  }

  async joinRoom(roomId: string) {
    // Connect to the peer
    await this.peerToPeer.connectToPeer(this.players.get(roomId).addresses[1]);

    // Subscribe to the topic
    await this.peerToPeer.subscribeTopic(roomId);

    // Wait for subscription to propagate
    await new Promise((resolve) => setTimeout(resolve, 300)); // Wait 300ms

    // Message the topic that the player has joined
    await this.peerToPeer.messageTopic(
      roomId,
      "duel:player:join:" + this.playerId
    );
  }

  async refreshGameState(roomId: string, gameState: string) {
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
}
