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

    // Wait for player discovery with exponential backoff
    let player = null;
    let currentDelay = retryDelay;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      logger.debug(`Discovery attempt ${attempt}/${retryAttempts}`);
      player = this.players.get(roomId);

      if (player) {
        logger.debug("Player found:", player);
        break;
      }

      logger.debug(`Waiting ${currentDelay}ms for player discovery...`);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));

      // Apply exponential backoff with a cap
      currentDelay = Math.min(currentDelay * 1.5, 15000);
    }

    if (!player) {
      logger.error("Failed to discover player after all attempts");
      throw new Error("Player discovery failed after multiple attempts");
    }

    // Step 1: Connect to the room owner
    logger.debug(`Connecting to room owner (peer)...`);
    const connectStartTime = Date.now();
    let connected = false;

    try {
      connected = await this.peerToPeer?.connectToPeerWithFallback(
        roomId,
        player.addresses
      );
    } catch (error) {
      logger.error("Connection error:", error);
    }

    if (!connected) {
      logger.error("Failed to connect to room owner");
      throw new Error("Failed to connect to peer using any method");
    }

    logger.debug(
      `Connected to room owner in ${Date.now() - connectStartTime}ms`
    );

    // Step 2: Subscribe to room message events first
    this.peerToPeer.on(
      `topic:${this.roomId}:message`,
      this.roomTopicMessageHandler
    );

    // Step 3: Allow time for gossipsub protocol to exchange subscriptions
    logger.debug("Waiting for gossipsub to stabilize...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 4: Check connection to room owner
    const roomOwnerConnection = await this.peerToPeer.isPeerConnected(roomId);
    logger.debug("Room owner connection status:", roomOwnerConnection);

    if (!roomOwnerConnection) {
      logger.error("Lost connection to room owner");
      this.peerToPeer.off(
        `topic:${this.roomId}:message`,
        this.roomTopicMessageHandler
      );
      throw new Error("Connection to room owner was lost");
    }

    // Step 5: Subscribe to room topic with mesh formation
    logger.debug("Subscribing to room topic...");
    let subscribed = false;

    try {
      subscribed = await this.peerToPeer?.subscribeTopic(roomId, true);
    } catch (error) {
      logger.error("Subscription error:", error);
    }

    if (!subscribed) {
      logger.error("Failed to subscribe to room topic");
      this.peerToPeer.off(
        `topic:${this.roomId}:message`,
        this.roomTopicMessageHandler
      );
      throw new Error("Failed to subscribe to room topic");
    }

    // Step 6: Force mesh refresh to ensure we're properly connected
    logger.debug("Refreshing mesh network...");
    await this.peerToPeer?.refreshMesh(roomId);

    // Step 7: Verify mesh peers
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const meshPeers =
      this.peerToPeer?.libp2p.services.pubsub.getMeshPeers(roomId);
    logger.debug(
      "Mesh peers after refresh:",
      meshPeers?.map((p) => p.toString())
    );

    if (!meshPeers || meshPeers.length === 0) {
      logger.warn("No mesh peers found, trying one more refresh");
      await this.peerToPeer?.refreshMesh(roomId);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryMeshPeers =
        this.peerToPeer?.libp2p.services.pubsub.getMeshPeers(roomId);
      logger.debug(
        "Mesh peers after second refresh:",
        retryMeshPeers?.map((p) => p.toString())
      );

      if (!retryMeshPeers || retryMeshPeers.length === 0) {
        logger.warn("Still no mesh peers, but continuing anyway");
      }
    }

    // Step 8: Announce joining the room
    logger.debug("Announcing player join to room");
    let joinMessageSent = false;

    // Try multiple times to send the join message
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.peerToPeer?.messageTopic(
          roomId,
          `duel:player:join:${this.playerId}`
        );
        joinMessageSent = true;
        logger.debug(`Join message sent successfully (attempt ${attempt})`);
        break;
      } catch (error) {
        logger.warn(`Failed to send join message (attempt ${attempt}):`, error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!joinMessageSent) {
      logger.warn("Could not send join message, but room join was successful");
    }

    logger.debug("Room join completed successfully");
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
