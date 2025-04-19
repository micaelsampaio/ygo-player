import EventEmitter from "events";
import { ICommunicationLayer } from "./interfaces/ICommunicationLayer";
import { AudioManager } from "../audio/AudioManager";
import { Logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

const logger = Logger.createLogger("LocalCommunication");

/**
 * Implementation of ICommunicationLayer that provides offline functionality.
 * This allows the game to be played locally without requiring a network connection.
 */
export class LocalCommunication
  extends EventEmitter
  implements ICommunicationLayer
{
  private playerId: string;
  private roomId: string | null = null;
  private subscribedTopics: Set<string> = new Set();
  private audioManager: AudioManager;
  private currentVoiceTopic: string | null = null;
  private localEventBus: EventEmitter = new EventEmitter();

  constructor() {
    super();
    // Generate a persistent playerId for this session
    this.playerId = uuidv4();

    // Set up audio for local voice playback (mostly a no-op in offline mode)
    this.audioManager = new AudioManager({
      fftSize: 2048,
      minDecibels: -90,
      maxDecibels: -10,
      smoothingTimeConstant: 0.85,
    });

    this.setupAudioEventListeners();
    logger.info("Local communication mode initialized with ID:", this.playerId);
  }

  async initialize(): Promise<void> {
    logger.info("Initializing offline mode");
    this.setupLocalEventHandlers();
    return Promise.resolve();
  }

  cleanup(): void {
    logger.debug("Cleaning up local communication");
    this.audioManager.stop();
    this.subscribedTopics.clear();
    this.roomId = null;
    this.localEventBus.removeAllListeners();
    this.removeAllListeners();
  }

  getPeerId(): string | null {
    return this.playerId;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  async createRoom(): Promise<void> {
    // In offline mode, the room ID is the same as the player ID
    this.roomId = this.playerId;
    logger.info("Created local room with ID:", this.roomId);

    // Auto-subscribe to the room topic
    await this.subscribeTopic(this.roomId);

    // Emit room creation event
    this.emit(
      "rooms:updated",
      new Map([[this.roomId, { id: this.roomId, connected: true }]])
    );

    // Auto-mark player as ready after a short delay
    setTimeout(() => {
      if (this.roomId) {
        this.emit("duel:player:join:", this.playerId);
        this.emit("duel:player:ready:", this.playerId);
        this.emit("duel:all_players_ready");
        logger.info("Local player marked as ready");
      }
    }, 500);

    return Promise.resolve();
  }

  async joinRoom(
    roomId: string,
    retryAttempts = 1,
    retryDelay = 0
  ): Promise<void> {
    this.roomId = roomId;
    logger.info("Joined local room:", roomId);

    // Auto-subscribe to room topic
    await this.subscribeTopic(roomId);

    // In offline mode, emit events to simulate joining
    setTimeout(() => {
      this.emit("duel:player:join:", this.playerId);
      this.emit("duel:player:ready:", this.playerId);
      this.emit("duel:all_players_ready");
    }, 500);

    return Promise.resolve();
  }

  async subscribeTopic(topic: string): Promise<boolean> {
    this.subscribedTopics.add(topic);
    logger.debug("Subscribed to local topic:", topic);
    return true;
  }

  unsubscribeTopic(topic: string): void {
    this.subscribedTopics.delete(topic);
    logger.debug("Unsubscribed from local topic:", topic);
  }

  async messageTopic(topic: string, message: string): Promise<void> {
    // In offline mode, we simply emit events on the localEventBus
    // and listen for them in the same process
    if (!this.subscribedTopics.has(topic)) {
      logger.warn("Attempt to message unsubscribed topic:", topic);
      await this.subscribeTopic(topic);
    }

    logger.debug(
      `Local message to topic ${topic}: ${message.substring(0, 50)}...`
    );
    this.localEventBus.emit(`topic:${topic}:message`, { messageStr: message });
    return Promise.resolve();
  }

  async startVoiceChat(roomId: string): Promise<boolean> {
    // In offline mode, we don't need actual voice chat
    // but we want to return true to not break the flow
    logger.info("Voice chat simulation started for local room:", roomId);
    this.currentVoiceTopic = `${roomId}/voice`;
    return true;
  }

  stopVoiceChat(roomId: string): void {
    logger.info("Voice chat simulation stopped for local room:", roomId);
    this.currentVoiceTopic = null;
  }

  setMicMuted(muted: boolean): void {
    this.audioManager.setMicrophoneMuted(muted);
    logger.debug("Local microphone muted:", muted);
  }

  setPlaybackMuted(muted: boolean): void {
    this.audioManager.setPlaybackMuted(muted);
    logger.debug("Local playback muted:", muted);
  }

  getAudioAnalyser(): AnalyserNode | null {
    return this.audioManager.getAnalyser();
  }

  private setupLocalEventHandlers(): void {
    // Listen for local events and forward them to the main event emitter
    this.localEventBus.on("topic:*:message", (data: any) => {
      const { messageStr } = data;

      // Handle room messages in the same way as network communication would
      if (this.roomId && messageStr) {
        this.handleRoomMessage({ messageStr });
      }
    });
  }

  private handleRoomMessage({ messageStr }: { messageStr: string }): void {
    logger.debug("Local room message:", messageStr.substring(0, 50) + "...");

    // Emit the generic room message for subscribers
    if (this.roomId) {
      this.emit(`topic:${this.roomId}:message`, { messageStr });
    }

    // Process specific message types
    if (messageStr.includes("duel:chat:message:")) {
      try {
        const messageBase64 = messageStr.split("duel:chat:message:")[1];
        const decodedMessage = this.decodeBase64(messageBase64);

        // Skip self-messages to avoid duplication
        if (!decodedMessage.startsWith(`${this.playerId}:`)) {
          this.emit("duel:chat:message", decodedMessage);
        }
      } catch (error) {
        logger.error("Failed to decode chat message:", error);
      }
    } else if (messageStr.includes("duel:refresh:state:")) {
      try {
        const gameStateBase64 = messageStr.split("duel:refresh:state:")[1];
        const decodedGameState = this.decodeBase64ToObject(gameStateBase64);
        this.emit("duel:refresh:state:", decodedGameState);
      } catch (error) {
        logger.error("Failed to process game state message:", error);
      }
    } else if (messageStr.includes("duel:command:exec:")) {
      try {
        const commandBase64 = messageStr.split("duel:command:exec:")[1];
        const command = this.decodeBase64ToObject(commandBase64);
        this.emit("duel:command:exec", command);
      } catch (error) {
        logger.error("Failed to decode command:", error);
      }
    }
  }

  private setupAudioEventListeners(): void {
    this.audioManager.on("error", (error) => {
      logger.error("Audio error:", error);
      this.emit("audio:error", error);
    });

    this.audioManager.on("stateChange", (state) => {
      this.emit("audio:stateChange", state);
    });
  }

  // Helper functions for base64 encoding/decoding
  private encodeToBase64(data: string): string {
    try {
      const encoded = new TextEncoder().encode(data);
      const binaryString = Array.from(encoded)
        .map((byte) => String.fromCharCode(byte))
        .join("");
      return btoa(binaryString);
    } catch (error) {
      logger.error("Failed to encode string to base64:", error);
      return btoa("ENCODING_ERROR");
    }
  }

  private decodeBase64(str: string): string {
    try {
      const binaryString = atob(str);
      const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch (error) {
      logger.error("Failed to decode base64 to string:", error);
      return JSON.stringify({ error: "Decoding error" });
    }
  }

  private decodeBase64ToObject(data: string): any {
    try {
      const jsonStr = this.decodeBase64(data);
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error("Failed to convert base64 to object:", error);
      return { error: "Failed to decode object" };
    }
  }
}
