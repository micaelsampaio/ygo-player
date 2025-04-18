import { PeerToPeer } from "./p2p.js";
import { AudioManager } from "../audio/AudioManager";
import EventEmitter from "events";
import { isValidVoiceMessage, VoiceMessage } from "./types/voice";
import { Logger } from "../utils/logger";

const logger = Logger.createLogger("KaibaNet");

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
  private readonly VOICE_PROTOCOL = "/ygo/voice/1.0.0";
  private audioManager: AudioManager;
  private currentVoiceTopic: string | null = null;
  private communicationType: string = "p2p"; // Default to P2P
  private communicationLayer: any = null; // For other communication types

  private constructor() {
    super();
    if (KaibaNet.instance) {
      throw new Error("Use KaibaNet.getInstance() instead of new KaibaNet()");
    }
    this.peerToPeer = new PeerToPeer(
      import.meta.env.VITE_BOOTSTRAP_NODE,
      "ygo-discovery"
    );
    this.audioManager = new AudioManager({
      fftSize: 2048,
      minDecibels: -90,
      maxDecibels: -10,
      smoothingTimeConstant: 0.85,
    });

    this.setupAudioEventListeners();
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

  public getCommunicationType(): string {
    return this.communicationType;
  }

  /**
   * Switch to a different communication method
   * @param type The type of communication to switch to ('p2p' or 'socketio')
   * @param options Configuration options
   */
  async switchCommunication(
    type: string,
    options: {
      bootstrapNode?: string;
      discoveryTopic?: string;
      serverUrl?: string;
    } = {}
  ) {
    logger.debug(
      `Switching communication from ${this.communicationType} to ${type}`
    );

    if (type === this.communicationType) {
      logger.debug(`Already using ${type} communication, no change needed`);
      return;
    }

    try {
      // Clean up existing connections and listeners
      this.cleanup();

      // Import necessary modules
      const { CommunicationFactory } = await import("./communicationFactory");

      // Set the new communication type
      this.communicationType = type;

      // Create the appropriate communication layer using the factory
      const communicationLayer = CommunicationFactory.createCommunication(
        type as any,
        {
          // Use Vite's import.meta.env for environment variables
          bootstrapNode:
            import.meta.env.VITE_BOOTSTRAP_NODE || options.bootstrapNode,
          discoveryTopic:
            import.meta.env.VITE_DISCOVERY_TOPIC ||
            options.discoveryTopic ||
            "peer-discovery",
          // Priority order: ENV > options > default
          serverUrl:
            import.meta.env.VITE_SOCKET_SERVER ||
            options.serverUrl ||
            "http://localhost:3035",
        }
      );

      // Re-initialize with the new communication layer
      this.initialized = false;

      if (type === "p2p") {
        this.peerToPeer = communicationLayer as any; // Cast to appropriate type
      } else {
        // For Socket.IO or future communication types
        this.peerToPeer = null;
        this.communicationLayer = communicationLayer;
      }

      // Initialize the new communication layer
      await communicationLayer.initialize();

      // Setup event listeners for the new communication layer
      this.setupEventListenersForCommunicationLayer(communicationLayer);

      // Set properties from the new communication layer
      this.playerId = communicationLayer.getPeerId();
      this.initialized = true;

      logger.debug(`Successfully switched to ${type} communication`);

      // Notify that communication type has changed
      this.emit("communication:changed", type);
    } catch (error) {
      logger.error(`Failed to switch communication to ${type}:`, error);
      throw error;
    }
  }

  private setupEventListenersForCommunicationLayer(communicationLayer: any) {
    // Setup common event listeners for any communication layer

    communicationLayer.on("peer:discovery", this.addPlayer);
    communicationLayer.on("connection:open", this.connectPlayer);
    communicationLayer.on("connection:close", this.disconnectPlayer);
    communicationLayer.on("remove:peer", this.removePlayer);

    // Room updates
    communicationLayer.on("rooms:updated", (rooms) => {
      this.rooms = rooms;
      this.emit("rooms:updated", rooms);
    });

    // Forward duel events
    communicationLayer.on("duel:all_players_ready", () => {
      this.emit("duel:all_players_ready");
    });

    communicationLayer.on("duel:chat:message", (message) => {
      this.emit("duel:chat:message", message);
    });

    communicationLayer.on("duel:refresh:state:", (state) => {
      this.emit("duel:refresh:state:", state);
    });

    communicationLayer.on("duel:player:join:", (playerId) => {
      this.emit("duel:player:join:", playerId);
    });

    communicationLayer.on("duel:command:exec", (command) => {
      this.emit("duel:command:exec", command);
    });

    // Forward audio events
    communicationLayer.on("audio:error", (error) => {
      this.emit("audio:error", error);
    });

    communicationLayer.on("audio:stateChange", (state) => {
      this.emit("audio:stateChange", state);
    });
  }

  private addPlayer = ({ peerId, addresses }) => {
    logger.debug("KaibaNet: Peer discovered", peerId, addresses);
    this.players = new Map(this.players).set(peerId, {
      id: peerId,
      addresses,
      connected: false,
    });
    // Emit event when player is discovered or updated
    this.emit("players:updated", this.players);
  };

  private connectPlayer = ({ peerId }) => {
    logger.debug("KaibaNet: Connection opened", peerId);
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
    logger.debug("KaibaNet: Connection closed", peerId);
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
    logger.debug("KaibaNet: Peer removed", peerId);
    if (this.players.has(peerId)) {
      this.players = new Map(this.players);
      this.players.delete(peerId);
      // Emit event when player is removed
      this.emit("players:updated", this.players);
    }
  };

  private roomTopicMessageHandler = ({ messageStr }) => {
    logger.debug("KaibaNet: Message on Room Topic:", messageStr);

    // Add handler for chat messages
    if (messageStr.includes("duel:chat:message:")) {
      const messageBase64 = messageStr.split(":")[3];
      const decodedMessage = b64ToString(messageBase64);
      this.emit("duel:chat:message", decodedMessage);
    }

    // When we receive a message with the game state, emit an event with the decoded gameState
    if (messageStr.includes("duel:refresh:state:")) {
      logger.debug("KaibaNet: Game state refresh message received", messageStr);
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
      logger.debug("KaibaNet: Player joined room", playerJoinedId);
      this.emit("duel:player:join:", playerJoinedId);
    }

    // Handle player join messages in room topic
    if (messageStr.includes("duel:command:exec:")) {
      const command = b64ToObject(messageStr.split(":")[3]);
      logger.debug("TCL:: EXEC COMMAND ", command);
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
      this.emit("rooms:updated", this.rooms);
      logger.debug("KaibaNet: Emitted rooms:updated event");
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
      logger.debug(this.players);
      const player = this.players.get(roomId);
      if (player) return player; // Return the player immediately when found

      logger.debug(`Attempt ${attempt}: Waiting for player discovery...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
    return null; // Return null if no player is found after all attempts
  };

  async joinRoom(roomId: string, retryAttempts = 5, retryDelay = 5000) {
    logger.debug(`Attempting to join room ${roomId}...`);
    this.roomId = roomId;

    // Wait for player discovery
    const player = await this.waitForPlayer(roomId, retryAttempts, retryDelay);
    if (!player) {
      throw new Error("End of attempts to wait for player discovery");
    }
    // Connects to the room owner they will exchange the topics they are subscribed to
    logger.debug(`Connecting to peer...`);
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
    logger.debug("KaibaNet: Room owner connection status", roomOwnerConnection);

    // Pubsub protocol will send the current peers subcriptions when connects to a peer
    // Subscribe to room topic
    const subscribed = await this.peerToPeer?.subscribeTopic(roomId, true);
    if (!subscribed) {
      throw new Error("Failed to subscribe to room topic");
    }

    // Force mesh refresh after subscription
    await this.peerToPeer?.refreshMesh(roomId);

    // Wait for the gossipsub to update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const meshPeers =
      this.peerToPeer?.libp2p.services.pubsub.getMeshPeers(roomId);
    logger.debug("Mesh peers after refresh:", meshPeers);

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
    logger.debug("KaibaNet: Refreshing game state", roomId, gameState);
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

  // Add new method for sending chat messages
  async sendMessage(roomId: string, message: string) {
    if (!this.peerToPeer) {
      console.error("KaibaNet: Cannot send message - P2P not initialized");
      return;
    }

    const messageB64 = stringToB64(message);
    await this.peerToPeer.messageTopic(
      roomId,
      "duel:chat:message:" + messageB64
    );
  }

  private audioDataHandler = async (data: Uint8Array) => {
    if (!this.currentVoiceTopic || !this.peerToPeer?.libp2p?.services.pubsub) {
      console.warn("Voice chat not properly initialized");
      return;
    }

    try {
      const message = {
        type: "voice",
        data: Array.from(data),
        senderId: this.playerId,
        timestamp: Date.now(),
      };

      logger.debug(
        `Sending voice data to ${this.currentVoiceTopic}, size: ${data.length}`
      );
      await this.peerToPeer.messageTopic(
        this.currentVoiceTopic,
        JSON.stringify(message)
      );
    } catch (error) {
      console.error("Failed to send audio data:", error);
    }
  };

  async startVoiceChat(roomId: string) {
    try {
      this.currentVoiceTopic = `${roomId}/voice`;

      // Debug state before any changes
      logger.debug("=== Initial State ===");
      this.debugEventListeners();

      // Clean up both audio and voice topic listeners
      logger.debug("Cleaning up existing listeners...");
      this.audioManager.removeAllListeners("audioData");
      this.peerToPeer?.removeAllListeners(
        `topic:${this.currentVoiceTopic}:message`
      );

      // Initialize the AudioManager
      logger.debug("Initializing audio manager...");
      await this.audioManager.initialize();

      // Set up voice message receiver
      logger.debug("Setting up voice message receiver...");
      this.peerToPeer?.on(
        `topic:${this.currentVoiceTopic}:message`,
        (message: any) => {
          try {
            // Skip non-voice messages
            if (typeof message === "object") {
              if (
                message.messageStr?.startsWith("keepalive:") ||
                message.messageStr?.startsWith("mesh:")
              ) {
                return;
              }
            }

            // Try to parse the message
            let parsedMessage;
            try {
              parsedMessage =
                typeof message === "string"
                  ? JSON.parse(message)
                  : message.messageStr
                  ? JSON.parse(message.messageStr)
                  : message;
            } catch (parseError) {
              // If it's not JSON, it's probably a system message - ignore it
              return;
            }

            // Process only valid voice messages
            if (
              parsedMessage.type === "voice" &&
              parsedMessage.senderId !== this.playerId
            ) {
              logger.debug("Received voice data from:", parsedMessage.senderId);
              const audioData = new Uint8Array(parsedMessage.data);
              this.audioManager.playRemoteAudio(audioData);
            }
          } catch (error) {
            // Only log errors for actual voice messages
            if (
              !message.messageStr?.startsWith("keepalive:") &&
              !message.messageStr?.startsWith("mesh:")
            ) {
              console.error("Failed to process voice message:", error);
            }
          }
        }
      );

      // Add the audio data sender handler
      logger.debug("Setting up audio data handler...");
      this.audioManager.on("audioData", this.audioDataHandler);

      // Subscribe to voice topic
      logger.debug("Subscribing to voice topic:", this.currentVoiceTopic);
      await this.peerToPeer?.subscribeTopic(this.currentVoiceTopic);

      // Final debug check
      logger.debug("=== Final Setup State ===");
      this.debugEventListeners();

      return true;
    } catch (error) {
      console.error("Failed to start voice chat:", error);
      throw error;
    }
  }

  stopVoiceChat(roomId: string) {
    if (!this.peerToPeer) {
      throw new Error("KaibaNet: Cannot stop voice chat - P2P not initialized");
    }

    this.audioManager.removeListener("audioData", this.audioDataHandler);

    if (this.currentVoiceTopic) {
      this.peerToPeer?.removeAllListeners(
        `topic:${this.currentVoiceTopic}:message`
      );
      this.peerToPeer.unsubscribeTopic(this.currentVoiceTopic);
    }

    this.audioManager.stop();
    this.currentVoiceTopic = null;

    logger.debug("Voice chat stopped and cleaned up");
  }

  setMicMuted(muted: boolean): void {
    this.audioManager.setMicrophoneMuted(muted);
  }

  setPlaybackMuted(muted: boolean): void {
    this.audioManager.setPlaybackMuted(muted);
  }

  getAudioAnalyser(): AnalyserNode | null {
    return this.audioManager.getAnalyser();
  }

  private setupAudioEventListeners() {
    this.audioManager.on("error", (error) => {
      console.error("Audio error:", error);
      this.emit("audio:error", error);
    });

    this.audioManager.on("stateChange", (state) => {
      this.emit("audio:stateChange", state);
    });
  }

  private debugEventListeners() {
    logger.debug("=== Event Listeners Debug ===");
    logger.debug("AudioManager events:", this.audioManager.eventNames());
    logger.debug(
      "AudioManager audioData listeners:",
      this.audioManager.listenerCount("audioData")
    );
    logger.debug("P2P events:", this.peerToPeer?.eventNames());
    logger.debug("==========================");
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
