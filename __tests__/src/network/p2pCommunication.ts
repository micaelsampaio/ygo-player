import { PeerToPeer } from "./p2p";
import { ICommunicationLayer } from "./interfaces/ICommunicationLayer";
import EventEmitter from "events";
import { AudioManager } from "../audio/AudioManager";
import { Logger } from "../utils/logger";

const logger = Logger.createLogger("P2PCommunication");

// Define options interface for constructor
interface P2PCommunicationOptions {
  bootstrapNode: string;
  discoveryTopic?: string;
}

export class P2PCommunication
  extends EventEmitter
  implements ICommunicationLayer
{
  private peerToPeer: PeerToPeer;
  private playerId: string | null = null;
  private roomId: string | null = null;
  private audioManager: AudioManager;
  private currentVoiceTopic: string | null = null;
  private bootstrapNode: string;
  private discoveryTopic: string;
  private players = new Map<
    string,
    { id: string; addresses: string[]; connected: boolean }
  >();
  private rooms = new Map<string, { id: string; connected: boolean }>();

  constructor(
    options: P2PCommunicationOptions | string,
    discoveryTopicParam: string = "peer-discovery"
  ) {
    super();

    // Handle both object-style and string parameters
    if (typeof options === "object") {
      this.bootstrapNode = options.bootstrapNode;
      this.discoveryTopic = options.discoveryTopic || "peer-discovery";
    } else {
      this.bootstrapNode = options;
      this.discoveryTopic = discoveryTopicParam;
    }

    // Make sure bootstrapNode is a string before passing to PeerToPeer
    if (typeof this.bootstrapNode !== "string") {
      logger.error("Invalid bootstrapNode format:", this.bootstrapNode);
      throw new Error("Bootstrap node must be a string");
    }

    this.peerToPeer = new PeerToPeer(this.bootstrapNode, this.discoveryTopic);
    this.audioManager = new AudioManager({
      fftSize: 2048,
      minDecibels: -90,
      maxDecibels: -10,
      smoothingTimeConstant: 0.85,
    });
    this.setupAudioEventListeners();
  }

  async initialize(): Promise<void> {
    logger.debug("P2P: Initializing with bootstrap node:", this.bootstrapNode);
    try {
      await this.peerToPeer.startP2P();
      this.playerId = await this.peerToPeer.getPeerId();
      this.setupEventListeners();
      logger.debug("P2P: Initialized with ID:", this.playerId);
      return Promise.resolve();
    } catch (error) {
      logger.error("P2P: Failed to initialize:", error);
      return Promise.reject(error);
    }
  }

  cleanup(): void {
    logger.debug("P2P: Cleaning up");
    this.peerToPeer.removeAllListeners();
    this.removeAllListeners();
    this.players.clear();
    this.playerId = null;
    this.roomId = null;
    logger.debug("P2P: Cleanup completed");
  }

  getPeerId(): string | null {
    return this.playerId;
  }

  getMultiaddrs(): string[] | null {
    return this.peerToPeer.getMultiaddrs();
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  async createRoom(): Promise<void> {
    const discoveryTopic = await this.peerToPeer.getDiscoveryTopic();
    this.roomId = this.playerId; // Set roomId as owner

    this.rooms = new Map(this.rooms).set(this.playerId as string, {
      id: this.playerId as string,
      connected: false,
    });

    // Subscribe to own room topic (as room owner)
    await this.peerToPeer.subscribeTopic(this.playerId as string);

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
    logger.debug("P2P: Room created:", this.roomId);
  }

  async joinRoom(
    roomId: string,
    retryAttempts = 5,
    retryDelay = 5000
  ): Promise<void> {
    logger.debug(`P2P: Attempting to join room ${roomId}...`);
    this.roomId = roomId;

    // Wait for player discovery
    const player = await this.waitForPlayer(roomId, retryAttempts, retryDelay);
    if (!player) {
      throw new Error("End of attempts to wait for player discovery");
    }

    // Connects to the room owner they will exchange the topics they are subscribed to
    logger.debug(`P2P: Connecting to peer...`);
    const connected = await this.peerToPeer.connectToPeerWithFallback(
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
    logger.debug("P2P: Room owner connection status", roomOwnerConnection);

    // Subscribe to room topic
    const subscribed = await this.peerToPeer.subscribeTopic(roomId, true);
    if (!subscribed) {
      throw new Error("Failed to subscribe to room topic");
    }

    // Force mesh refresh after subscription
    await this.refreshMesh(roomId);

    // Wait for the gossipsub to update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // First check if we are connected
    if (!roomOwnerConnection) {
      throw new Error("Peer not connected");
    }

    await this.peerToPeer.messageTopic(
      roomId,
      `duel:player:join:${this.playerId}`
    );

    logger.debug("P2P: Successfully joined room:", roomId);
  }

  async subscribeTopic(topic: string, meshForming = false): Promise<boolean> {
    return this.peerToPeer.subscribeTopic(topic, meshForming);
  }

  unsubscribeTopic(topic: string): void {
    // Add the unsubscribe method to the PeerToPeer class if needed
    if (typeof this.peerToPeer.unsubscribeTopic === "function") {
      this.peerToPeer.unsubscribeTopic(topic);
    }
  }

  async messageTopic(topic: string, message: string): Promise<void> {
    await this.peerToPeer.messageTopic(topic, message);
  }

  async refreshMesh(topic: string): Promise<void> {
    if (typeof this.peerToPeer.refreshMesh === "function") {
      await this.peerToPeer.refreshMesh(topic);
    }
  }

  async startVoiceChat(roomId: string): Promise<boolean> {
    try {
      this.currentVoiceTopic = `${roomId}/voice`;

      // Debug state before any changes
      logger.debug("=== Initial State ===");
      this.debugEventListeners();

      // Clean up both audio and voice topic listeners
      logger.debug("Cleaning up existing listeners...");
      this.audioManager.removeAllListeners("audioData");
      this.peerToPeer.removeAllListeners(
        `topic:${this.currentVoiceTopic}:message`
      );

      // Initialize the AudioManager
      logger.debug("Initializing audio manager...");
      await this.audioManager.initialize();

      // Set up voice message receiver
      logger.debug("Setting up voice message receiver...");
      this.peerToPeer.on(
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
      await this.peerToPeer.subscribeTopic(this.currentVoiceTopic);

      // Final debug check
      logger.debug("=== Final Setup State ===");
      this.debugEventListeners();

      return true;
    } catch (error) {
      console.error("Failed to start voice chat:", error);
      return false;
    }
  }

  stopVoiceChat(roomId: string): void {
    this.audioManager.removeListener("audioData", this.audioDataHandler);

    if (this.currentVoiceTopic) {
      this.peerToPeer.removeAllListeners(
        `topic:${this.currentVoiceTopic}:message`
      );
      this.unsubscribeTopic(this.currentVoiceTopic);
    }

    this.audioManager.stop();
    this.currentVoiceTopic = null;

    logger.debug("P2P: Voice chat stopped and cleaned up");
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

  async getTopics(): Promise<string[]> {
    return this.peerToPeer.getTopics();
  }

  async getPeers(): Promise<string[]> {
    const gossipPeers = await this.peerToPeer.getGossipPeers();
    return gossipPeers.map((peer) => peer.toString());
  }

  // Helper methods
  private setupEventListeners() {
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

  private addPlayer = ({ peerId, addresses }) => {
    logger.debug("P2P: Peer discovered", peerId, addresses);
    this.players = new Map(this.players).set(peerId, {
      id: peerId,
      addresses,
      connected: false,
    });
    // Emit event when player is discovered or updated
    this.emit("players:updated", this.players);
  };

  private connectPlayer = ({ peerId }) => {
    logger.debug("P2P: Connection opened", peerId);
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
    logger.debug("P2P: Connection closed", peerId);
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
    logger.debug("P2P: Peer removed", peerId);
    if (this.players.has(peerId)) {
      this.players = new Map(this.players);
      this.players.delete(peerId);
      // Emit event when player is removed
      this.emit("players:updated", this.players);
    }
  };

  private roomTopicMessageHandler = ({ messageStr }) => {
    logger.debug("P2P: Message on Room Topic:", messageStr);

    // Add handler for chat messages
    if (messageStr.includes("duel:chat:message:")) {
      const messageBase64 = messageStr.split(":")[3];
      const decodedMessage = this.decodeBase64(messageBase64);
      this.emit("duel:chat:message", decodedMessage);
    }

    // When we receive a message with the game state, emit an event with the decoded gameState
    if (messageStr.includes("duel:refresh:state:")) {
      logger.debug("P2P: Game state refresh message received", messageStr);
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
      logger.debug("P2P: Player joined room", playerJoinedId);
      this.emit("duel:player:join:", playerJoinedId);
    }

    // Handle player join messages in room topic
    if (messageStr.includes("duel:command:exec:")) {
      const command = this.decodeBase64ToObject(messageStr.split(":")[3]);
      logger.debug("P2P: EXEC COMMAND ", command);
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
      logger.debug("P2P: Emitted rooms:updated event");
    }
  };

  private waitForPlayer = async (
    roomId: string,
    retryAttempts: number,
    retryDelay: number
  ) => {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      logger.debug("P2P: Current players:", this.players);
      const player = this.players.get(roomId);
      if (player) return player; // Return the player immediately when found

      logger.debug(`P2P: Attempt ${attempt}: Waiting for player discovery...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
    return null; // Return null if no player is found after all attempts
  };

  private audioDataHandler = async (data: Uint8Array) => {
    if (!this.currentVoiceTopic) {
      console.warn("P2P: Voice chat not properly initialized");
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
        `P2P: Sending voice data to ${this.currentVoiceTopic}, size: ${data.length}`
      );
      await this.peerToPeer.messageTopic(
        this.currentVoiceTopic,
        JSON.stringify(message)
      );
    } catch (error) {
      console.error("P2P: Failed to send audio data:", error);
    }
  };

  private setupAudioEventListeners() {
    this.audioManager.on("error", (error) => {
      console.error("P2P: Audio error:", error);
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
    logger.debug("P2P events:", this.peerToPeer.eventNames());
    logger.debug("==========================");
  }

  // Helper functions for encoding/decoding
  private encodeToBase64(data: string): string {
    return btoa(
      new TextEncoder()
        .encode(data)
        .reduce((acc, byte) => acc + String.fromCharCode(byte), "")
    );
  }

  private decodeBase64(str: string): string {
    return new TextDecoder().decode(
      Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
    );
  }

  private encodeObjectToBase64(json: any): string {
    return this.encodeToBase64(JSON.stringify(json));
  }

  private decodeBase64ToObject(data: string): any {
    return JSON.parse(this.decodeBase64(data));
  }
}
