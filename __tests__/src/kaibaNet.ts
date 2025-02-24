import { PeerToPeer } from "./p2p.js";
import EventEmitter from "events";

export class KaibaNet extends EventEmitter {
  private static instance: KaibaNet | null = null;
  private players: Map<
    string,
    { id: string; addresses: string[]; connected: boolean }
  > = new Map();
  private playerId: string | null = null;
  private initialized = false;
  private peerToPeer: PeerToPeer | null = null; // Store the PeerToPeer instance
  private onGameStartCallback = null;

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

  setOnGameStartCallback(callback) {
    this.onGameStartCallback = callback;
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

  private setupEventListeners() {
    if (!this.peerToPeer) return;
    // Set up new listeners
    this.peerToPeer.removeAllListeners("peer:discovery");
    this.peerToPeer.on("peer:discovery", ({ peerId, addresses, connected }) => {
      console.log("KaibaNet: Peer discovered", peerId, addresses);
      const currentPlayer = this.players.get(peerId);
      if (!currentPlayer || currentPlayer.connected !== false) {
        this.players = new Map(this.players).set(peerId, {
          id: peerId,
          addresses,
          connected: false,
        });
        // Emit event when player is discovered or updated
        this.emit("players:updated", this.players);
      }
    });

    this.peerToPeer.on("connection:open", ({ peerId }) => {
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
    });

    this.peerToPeer.on("connection:close", ({ peerId }) => {
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
    });

    this.peerToPeer.on("remove:peer", ({ peerId }) => {
      console.log("KaibaNet: Peer removed", peerId);
      if (this.players.has(peerId)) {
        this.players = new Map(this.players);
        this.players.delete(peerId);
        // Emit event when player is removed
        this.emit("players:updated", this.players);
      }
    });

    this.peerToPeer.on(
      "topic:" + this.playerId + ":message",
      ({ messageStr }) => {
        console.log(
          "KaibaNet: Message on PlayerID ",
          this.playerId,
          "topic",
          messageStr
        );
        if (messageStr.includes("duel:player:start:")) {
          console.log("Room start message");
          const gameStateBase64 = messageStr.toString().split(":")[3];
          // Decode Base64 → Convert from binary → Parse JSON
          const decodedGameState = JSON.parse(
            new TextDecoder().decode(
              Uint8Array.from(atob(gameStateBase64), (c) => c.charCodeAt(0))
            )
          );

          this.onGameStartCallback(decodedGameState);
        }
      }
    );
  }

  getPlayerId() {
    return this.playerId;
  }

  getPlayers() {
    return this.players;
  }

  getPeerToPeer() {
    return this.peerToPeer;
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

  async joinRoom(roomId: string, roomDecks: any) {
    console.log("Destination Addresses:", this.players.get(roomId).addresses);

    // Connect to the peer
    await this.peerToPeer.connectToPeer(this.players.get(roomId).addresses[1]);

    // Subscribe to the topic
    await this.peerToPeer.subscribeTopic(roomId);

    // Wait for subscription to propagate
    await new Promise((resolve) => setTimeout(resolve, 300)); // Wait 300ms

    // Encode the room decks data
    const jsonString = JSON.stringify(roomDecks);
    const base64Encoded = btoa(
      new TextEncoder()
        .encode(jsonString)
        .reduce((acc, byte) => acc + String.fromCharCode(byte), "")
    );

    // Send message after delay
    await this.peerToPeer.messageTopic(
      roomId,
      "duel:player:start:" + base64Encoded
    );
  }
}
