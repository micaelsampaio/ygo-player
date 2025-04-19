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

    // Only initialize AudioManager in constructor, communication layer will be initialized later
    this.audioManager = new AudioManager({
      fftSize: 2048,
      minDecibels: -90,
      maxDecibels: -10,
      smoothingTimeConstant: 0.85,
    });

    this.setupAudioEventListeners();

    // Get preferred communication type from localStorage if available
    const storedType =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("commType")
        : null;

    if (storedType) {
      this.communicationType = storedType;
      logger.debug(`Using stored communication type: ${storedType}`);
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

    try {
      logger.debug(
        `Initializing KaibaNet with communication type: ${this.communicationType}`
      );

      // Import the factory dynamically
      const { CommunicationFactory } = await import("./communicationFactory");

      // Create the appropriate communication layer using the factory
      const communicationLayer = CommunicationFactory.createCommunication(
        this.communicationType as any,
        {
          // Use environment variables if available
          bootstrapNode: import.meta.env.VITE_BOOTSTRAP_NODE,
          discoveryTopic:
            import.meta.env.VITE_DISCOVERY_TOPIC || "peer-discovery",
          serverUrl:
            import.meta.env.VITE_SOCKET_SERVER || "http://localhost:3035",
        }
      );

      // Initialize the communication layer
      await communicationLayer.initialize();

      // Store the communication layer in a common property
      this.communicationLayer = communicationLayer;

      // Set up event listeners for the new communication layer
      this.setupEventListenersForCommunicationLayer(communicationLayer);

      // Get playerId from the communication layer
      this.playerId = communicationLayer.getPeerId();

      this.initialized = true;
      logger.debug(
        `KaibaNet initialized with ${this.communicationType}, playerId: ${this.playerId}`
      );
    } catch (error) {
      logger.error("Failed to initialize KaibaNet:", error);
      throw error;
    }
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
   * Set the communication type to use
   * @param type The communication type ('p2p' or 'socketio')
   */
  public setCommunicationType(type: string): void {
    // Store the preference in localStorage if available
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("commType", type);
    }

    this.communicationType = type;
    logger.debug(`Communication type set to ${type}`);
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

      // Update the communication type (also persists to localStorage)
      this.setCommunicationType(type);

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

      // Mark as not initialized during the switch
      this.initialized = false;

      // Store the communication layer
      this.communicationLayer = communicationLayer;

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

    // Add player ready event handling
    communicationLayer.on("duel:player:ready:", (playerId) => {
      this.emit("duel:player:ready:", playerId);
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
    // Get the currently active communication layer
    const commLayer = this.getActiveCommunicationLayer();

    // Set up common event listeners
    commLayer.removeAllListeners("peer:discovery");
    commLayer.on("peer:discovery", this.addPlayer);

    commLayer.on("connection:open", this.connectPlayer);
    commLayer.on("connection:close", this.disconnectPlayer);
    commLayer.on("remove:peer", this.removePlayer);

    // Listen to discovery topic if available
    if (commLayer.getDiscoveryTopic) {
      const discoveryTopic = commLayer.getDiscoveryTopic();
      commLayer.on(
        "topic:" + discoveryTopic + ":message",
        this.discoveryTopicMessageHandler
      );
    }

    // If we have a roomId, set up room topic listener
    if (this.roomId) {
      commLayer.on(
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
    logger.debug(
      `Creating room with ${this.communicationType} communication type`
    );

    const commLayer = this.getActiveCommunicationLayer();

    // Use ICommunicationLayer interface methods
    await commLayer.createRoom();

    // Update roomId
    this.roomId = commLayer.getRoomId();

    logger.debug(`Room created with ID: ${this.roomId}`);
    return this.roomId;
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

    const commLayer = this.getActiveCommunicationLayer();

    // Use the ICommunicationLayer interface to join a room
    await commLayer.joinRoom(roomId, retryAttempts, retryDelay);

    // Update roomId from the communication layer
    this.roomId = commLayer.getRoomId();

    logger.debug(`Successfully joined room with ID: ${this.roomId}`);
  }

  public cleanupRoomListener(roomId: string) {
    const commLayer = this.getActiveCommunicationLayer();
    commLayer.removeAllListeners("topic:" + roomId + ":message");
    // Optionally unsubscribe from the topic
    commLayer.unsubscribeTopic(roomId);
  }

  async refreshGameState(roomId: string, gameState: string) {
    try {
      // Log state size to help with debugging
      const gameStateSize =
        typeof gameState === "string"
          ? gameState.length
          : JSON.stringify(gameState).length;
      logger.debug(
        `KaibaNet: Refreshing game state. Room: ${roomId}, State size: ${gameStateSize} bytes`
      );

      // Ensure we're using the correct room ID
      const actualRoomId = this.roomId || roomId;
      if (actualRoomId !== roomId) {
        logger.warn(
          `KaibaNet: Using stored room ID (${actualRoomId}) instead of provided room ID (${roomId})`
        );
      }

      const commLayer = this.getActiveCommunicationLayer();

      // First, ensure we're subscribed to the room topic
      logger.debug(
        `KaibaNet: Ensuring subscription to room topic: ${actualRoomId}`
      );
      if (this.communicationType === "socketio") {
        // For Socket.IO, explicitly re-subscribe to ensure we have an active subscription
        const subscribed = await commLayer.subscribeTopic(actualRoomId);
        if (!subscribed) {
          logger.warn(
            `KaibaNet: Failed to subscribe to room: ${actualRoomId}, but continuing anyway`
          );
        }
      }

      // Encode the game state data to Base64
      const base64Encoded = objectToB64(gameState);
      logger.debug(
        `KaibaNet: Base64 encoded state size: ${base64Encoded.length} characters`
      );

      // Send the message to the room topic
      logger.debug(
        `KaibaNet: Sending game state refresh to room: ${actualRoomId}`
      );
      await commLayer.messageTopic(
        actualRoomId,
        "duel:refresh:state:" + base64Encoded
      );
      logger.debug(`KaibaNet: Game state refresh sent successfully`);

      return true;
    } catch (error) {
      logger.error(`KaibaNet: Error refreshing game state: ${error}`);
      return false;
    }
  }

  async execYGOCommand(roomId: string, command: any) {
    const commLayer = this.getActiveCommunicationLayer();

    // Ensure we're using the actual room ID from the instance,
    // not the player ID which might be passed in by mistake
    const actualRoomId = this.roomId || roomId;

    if (actualRoomId !== roomId) {
      logger.warn(
        `KaibaNet: Using stored room ID (${actualRoomId}) instead of provided ID (${roomId}) for command execution`
      );
    }

    logger.debug(`KaibaNet: Sending command to room: ${actualRoomId}`);
    const commandB64 = objectToB64(command);
    await commLayer.messageTopic(
      actualRoomId,
      "duel:command:exec:" + commandB64
    );
  }

  // Add new method for sending chat messages
  async sendMessage(roomId: string, message: string) {
    const commLayer = this.getActiveCommunicationLayer();

    // Ensure we're using the actual room ID from the instance,
    // not the player ID which might be passed in by mistake
    const actualRoomId = this.roomId || roomId;

    logger.debug(
      `Sending message to room: ${actualRoomId} (input roomId was: ${roomId})`
    );

    const messageB64 = stringToB64(message);
    await commLayer.messageTopic(
      actualRoomId,
      "duel:chat:message:" + messageB64
    );
  }

  async startVoiceChat(roomId: string) {
    try {
      const commLayer = this.getActiveCommunicationLayer();

      // Use the communication layer's startVoiceChat method
      const result = await commLayer.startVoiceChat(roomId);

      // The voice topic is now handled by the communication layer
      this.currentVoiceTopic = `${roomId}/voice`;

      return result;
    } catch (error) {
      console.error("Failed to start voice chat:", error);
      throw error;
    }
  }

  stopVoiceChat(roomId: string) {
    const commLayer = this.getActiveCommunicationLayer();

    // Use the communication layer's stopVoiceChat method
    commLayer.stopVoiceChat(roomId);

    // Reset the voice topic
    this.currentVoiceTopic = null;

    logger.debug("Voice chat stopped");
  }

  setMicMuted(muted: boolean): void {
    // First, use the communication layer if available
    try {
      const commLayer = this.getActiveCommunicationLayer();
      commLayer.setMicMuted(muted);
    } catch (error) {
      // Fallback to using AudioManager directly
      this.audioManager.setMicrophoneMuted(muted);
    }
  }

  setPlaybackMuted(muted: boolean): void {
    // First, use the communication layer if available
    try {
      const commLayer = this.getActiveCommunicationLayer();
      commLayer.setPlaybackMuted(muted);
    } catch (error) {
      // Fallback to using AudioManager directly
      this.audioManager.setPlaybackMuted(muted);
    }
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

  /**
   * Get the currently active communication layer
   * @returns The active communication layer
   * @throws Error if no communication layer is available
   */
  private getActiveCommunicationLayer(): any {
    const commLayer =
      this.communicationType === "p2p"
        ? this.peerToPeer
        : this.communicationLayer;

    if (!commLayer) {
      throw new Error("No active communication layer available");
    }

    return commLayer;
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
