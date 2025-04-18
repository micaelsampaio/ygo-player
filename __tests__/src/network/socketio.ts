import { io, Socket } from "socket.io-client";
import EventEmitter from "events";
import { ICommunicationLayer } from "./interfaces/ICommunicationLayer";
import { AudioManager } from "../audio/AudioManager";
import { Logger } from "../utils/logger";

const logger = Logger.createLogger("SocketIO");

export class SocketIOCommunication
  extends EventEmitter
  implements ICommunicationLayer
{
  private socket: Socket | null = null;
  private playerId: string | null = null;
  private roomId: string | null = null;
  private serverUrl: string;
  private connected = false;
  private audioManager: AudioManager;
  private currentVoiceTopic: string | null = null;

  constructor(serverUrl: string) {
    super();
    this.serverUrl = serverUrl;
    this.audioManager = new AudioManager({
      fftSize: 2048,
      minDecibels: -90,
      maxDecibels: -10,
      smoothingTimeConstant: 0.85,
    });
    this.setupAudioEventListeners();
  }

  async initialize(): Promise<void> {
    try {
      logger.debug("SocketIO: Connecting to server:", this.serverUrl);
      this.socket = io(this.serverUrl, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      await this.setupSocketEvents();
      return Promise.resolve();
    } catch (error) {
      logger.error("SocketIO: Failed to initialize:", error);
      return Promise.reject(error);
    }
  }

  cleanup(): void {
    logger.debug("SocketIO: Cleaning up");
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.playerId = null;
    this.roomId = null;
    this.connected = false;
    this.removeAllListeners();
  }

  getPeerId(): string | null {
    return this.playerId;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  async createRoom(): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new Error("SocketIO: Not connected to server");
    }

    return new Promise((resolve, reject) => {
      this.socket?.emit("room:create", {}, async (response: any) => {
        if (response.error) {
          logger.error("SocketIO: Failed to create room:", response.error);
          reject(new Error(response.error));
        } else {
          this.roomId = response.roomId;
          logger.info(`SocketIO: Room created with ID: ${this.roomId}`);

          // Auto-subscribe to the room topic to be able to send messages
          try {
            const subscribed = await this.subscribeTopic(this.roomId);
            if (!subscribed) {
              logger.warn(
                `SocketIO: Failed to auto-subscribe to room: ${this.roomId}`
              );
            } else {
              logger.debug(
                `SocketIO: Auto-subscribed to room topic: ${this.roomId}`
              );
            }

            // Remove any existing handlers for this room
            this.socket?.off(`room:${this.roomId}:message`);

            // Set up room message handlers with detailed logging
            this.socket?.on(`room:${this.roomId}:message`, (data: any) => {
              logger.debug(
                `SocketIO: Room owner received message for ${this.roomId}:`,
                data
              );
              this.handleRoomMessage(data);
            });

            logger.debug(
              `SocketIO: Room ${this.roomId} is now listening for player joins`
            );

            // Set room creator as ready
            setTimeout(async () => {
              try {
                // Set player as ready automatically
                const isReady = await this.setPlayerReady(
                  this.roomId as string
                );
                if (isReady) {
                  logger.debug(
                    `SocketIO: Room creator auto-marked as ready in room ${this.roomId}`
                  );
                } else {
                  logger.warn(
                    `SocketIO: Failed to auto-mark room creator as ready in room ${this.roomId}`
                  );
                }
              } catch (error) {
                logger.error(
                  `SocketIO: Error setting room creator ready: ${error}`
                );
              }
            }, 500); // Small delay to ensure room creation is fully processed
          } catch (error) {
            logger.error(
              `SocketIO: Error auto-subscribing to room topic: ${this.roomId}`,
              error
            );
          }

          this.emit(
            "rooms:updated",
            new Map([[this.roomId, { id: this.roomId, connected: true }]])
          );
          resolve();
        }
      });
    });
  }

  async joinRoom(
    roomId: string,
    retryAttempts = 5,
    retryDelay = 5000
  ): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new Error("SocketIO: Not connected to server");
    }

    this.roomId = roomId;

    return new Promise((resolve, reject) => {
      let attempts = 0;

      const tryJoin = () => {
        this.socket?.emit("room:join", { roomId }, async (response: any) => {
          if (response.error) {
            attempts++;
            if (attempts < retryAttempts) {
              logger.warn(
                `SocketIO: Failed to join room (attempt ${attempts}/${retryAttempts}):`,
                response.error
              );
              setTimeout(tryJoin, retryDelay);
            } else {
              logger.error(
                "SocketIO: Failed to join room after multiple attempts"
              );
              reject(new Error(response.error));
            }
          } else {
            logger.debug("SocketIO: Successfully joined room:", roomId);

            // Auto-subscribe to the room topic to be able to send messages
            try {
              const subscribed = await this.subscribeTopic(roomId);
              if (!subscribed) {
                logger.warn(
                  `SocketIO: Failed to auto-subscribe to room: ${roomId}`
                );
              } else {
                logger.debug(
                  `SocketIO: Auto-subscribed to room topic: ${roomId}`
                );
              }
            } catch (error) {
              logger.error(
                `SocketIO: Error auto-subscribing to room topic: ${roomId}`,
                error
              );
            }

            // Remove any existing room message handlers for this room
            this.socket?.off(`room:${roomId}:message`);

            // Set up room event handlers with proper logging
            this.socket?.on(`room:${roomId}:message`, (data: any) => {
              logger.debug(
                `SocketIO: Room message received for ${roomId}:`,
                data
              );
              this.handleRoomMessage(data);
            });

            // Manually emit the player-join event for this player to trigger setup
            this.emit("duel:player:join:", this.playerId);
            logger.debug(
              `SocketIO: Emitted self join event for player: ${this.playerId}`
            );

            // Add a slight delay before marking player as ready to ensure setup is complete
            setTimeout(async () => {
              try {
                // Set player as ready automatically after joining
                const isReady = await this.setPlayerReady(roomId);
                if (isReady) {
                  logger.debug(
                    `SocketIO: Player auto-marked as ready in room ${roomId}`
                  );
                } else {
                  logger.warn(
                    `SocketIO: Failed to auto-mark player as ready in room ${roomId}`
                  );
                }
                resolve();
              } catch (error) {
                logger.error(`SocketIO: Error setting player ready: ${error}`);
                // Still resolve the promise since the room join was successful
                resolve();
              }
            }, 500); // Small delay to ensure room join is fully processed
          }
        });
      };

      tryJoin();
    });
  }

  async subscribeTopic(topic: string, meshForming = false): Promise<boolean> {
    if (!this.socket || !this.connected) {
      logger.error("SocketIO: Cannot subscribe - not connected");
      return false;
    }

    return new Promise((resolve) => {
      this.socket?.emit("topic:subscribe", { topic }, (response: any) => {
        if (response.error) {
          logger.error(
            "SocketIO: Failed to subscribe to topic:",
            response.error
          );
          resolve(false);
        } else {
          logger.debug("SocketIO: Subscribed to topic:", topic);
          resolve(true);
        }
      });
    });
  }

  unsubscribeTopic(topic: string): void {
    if (!this.socket || !this.connected) {
      logger.error("SocketIO: Cannot unsubscribe - not connected");
      return;
    }

    this.socket.emit("topic:unsubscribe", { topic }, (response: any) => {
      if (response.error) {
        logger.error(
          "SocketIO: Failed to unsubscribe from topic:",
          response.error
        );
      } else {
        logger.debug("SocketIO: Unsubscribed from topic:", topic);
      }
    });
  }

  async messageTopic(topic: string, message: string): Promise<void> {
    if (!this.socket || !this.connected) {
      logger.error("SocketIO: Cannot send message - not connected");
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket?.emit(
        "topic:message",
        { topic, message },
        (response: any) => {
          if (response.error) {
            logger.error("SocketIO: Failed to send message:", response.error);
            reject(new Error(response.error));
          } else {
            logger.debug("SocketIO: Message sent to topic:", topic);
            resolve();
          }
        }
      );
    });
  }

  async startVoiceChat(roomId: string): Promise<boolean> {
    try {
      this.currentVoiceTopic = `${roomId}/voice`;

      // Debug state before any changes
      logger.debug("=== Initial Voice Chat State ===");

      // Clean up existing audio listeners
      this.audioManager.removeAllListeners("audioData");

      // Initialize the AudioManager
      await this.audioManager.initialize();

      // Subscribe to voice topic
      await this.subscribeTopic(this.currentVoiceTopic);

      // Set up audio data handler
      this.audioManager.on("audioData", this.audioDataHandler);

      logger.debug("SocketIO: Voice chat started for room:", roomId);
      return true;
    } catch (error) {
      logger.error("SocketIO: Failed to start voice chat:", error);
      return false;
    }
  }

  stopVoiceChat(roomId: string): void {
    if (!this.socket || !this.connected) {
      return;
    }

    this.audioManager.removeListener("audioData", this.audioDataHandler);

    if (this.currentVoiceTopic) {
      this.unsubscribeTopic(this.currentVoiceTopic);
    }

    this.audioManager.stop();
    this.currentVoiceTopic = null;

    logger.debug("SocketIO: Voice chat stopped for room:", roomId);
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

  /**
   * Set this player as ready in a room
   * @param roomId Room ID
   * @returns Promise that resolves when player ready status is set
   */
  async setPlayerReady(roomId: string): Promise<boolean> {
    if (!this.socket || !this.connected) {
      logger.error("SocketIO: Cannot set player ready - not connected");
      return false;
    }

    if (!this.roomId || this.roomId !== roomId) {
      logger.error(`SocketIO: Cannot set ready - not in room ${roomId}`);
      return false;
    }

    return new Promise((resolve) => {
      this.socket?.emit("player:ready", { roomId }, (response: any) => {
        if (response.error) {
          logger.error("SocketIO: Failed to set player ready:", response.error);
          resolve(false);
        } else {
          logger.debug(
            `SocketIO: Player ${this.playerId} is now ready in room ${roomId}`
          );

          if (response.allReady) {
            logger.debug("SocketIO: All players in the room are ready");
          } else {
            logger.debug("SocketIO: Waiting for other players to be ready");
          }

          resolve(true);
        }
      });
    });
  }

  private async setupSocketEvents(): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    return new Promise((resolve, reject) => {
      // Set up connection event handlers
      this.socket?.on("connect", () => {
        this.connected = true;
        this.playerId = this.socket?.id || null;
        logger.debug("SocketIO: Connected to server, ID:", this.playerId);
        resolve();
      });

      this.socket?.on("connect_error", (error) => {
        logger.error("SocketIO: Connection error:", error);
        reject(error);
      });

      this.socket?.on("disconnect", (reason) => {
        this.connected = false;
        logger.debug("SocketIO: Disconnected:", reason);
      });

      // Add debugging for raw room:message events
      this.socket?.on("room:message", (data) => {
        logger.info("SocketIO: [RAW] room:message event received:", data);

        // CRITICAL FIX: Process all room:message events directly
        // This ensures messages like duel:all_players_ready are processed
        // even if they don't come through room-specific handlers
        this.handleRoomMessage(data);
      });

      // Set up peer discovery events
      this.socket?.on("peer:discovery", (data) => {
        logger.debug("SocketIO: Peer discovered:", data);
        this.emit("peer:discovery", data);
      });

      this.socket?.on("peer:connect", (data) => {
        logger.debug("SocketIO: Peer connected:", data);
        this.emit("connection:open", data);

        // When we get a peer:connect event, also check if we need to handle player join
        // This is an additional safeguard in case room:message is missed
        if (this.roomId && data.peerId && data.peerId !== this.playerId) {
          logger.debug(
            `SocketIO: Detected peer connect, emitting player join for ${data.peerId}`
          );
          this.emit("duel:player:join:", data.peerId);
        }
      });

      this.socket?.on("peer:disconnect", (data) => {
        logger.debug("SocketIO: Peer disconnected:", data);
        this.emit("connection:close", data);
      });

      // Set up room events
      this.socket?.on("room:created", (data) => {
        logger.debug("SocketIO: Room created:", data);
        // Add the new room to the rooms map
        const rooms = new Map();
        rooms.set(data.roomId, {
          id: data.roomId,
          creatorId: data.creatorId,
          connected: false,
          timestamp: data.timestamp,
        });
        this.emit("rooms:updated", rooms);
      });

      // Set up discovery topic events
      this.socket?.on("discovery:message", (data) => {
        logger.debug("SocketIO: Discovery topic message:", data);
        this.emit("topic:discovery:message", { messageStr: data.message });
      });

      // Set timeout for connection
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error("SocketIO: Connection timeout"));
        }
      }, 10000); // 10 seconds timeout
    });
  }

  private handleRoomMessage = (data: { message: string }) => {
    logger.debug("SocketIO: Room message received:", data);

    // Emit the correct event based on message prefix
    const messageStr = data.message;

    if (this.roomId) {
      this.emit(`topic:${this.roomId}:message`, { messageStr });
    }

    // Handle specific message types
    if (messageStr.includes("duel:chat:message:")) {
      try {
        const messageBase64 = messageStr.split("duel:chat:message:")[1];
        const decodedMessage = this.decodeBase64(messageBase64);

        // Skip messages sent by self to avoid duplicating them
        if (decodedMessage.startsWith(`${this.playerId}:`)) {
          logger.debug("SocketIO: Skipping self-sent message");
          return;
        }

        logger.debug("SocketIO: Decoded chat message:", decodedMessage);
        this.emit("duel:chat:message", decodedMessage);
      } catch (error) {
        logger.error("SocketIO: Failed to decode chat message:", error);
      }
    } else if (messageStr.includes("duel:refresh:state:")) {
      try {
        const gameStateBase64 = messageStr.split("duel:refresh:state:")[1];
        logger.debug(
          "SocketIO: Received base64 game state, length:",
          gameStateBase64.length
        );

        // Add a debug check to see if the base64 content is valid
        const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(gameStateBase64);
        logger.debug("SocketIO: Base64 validation check:", isValidBase64);

        if (!isValidBase64) {
          logger.warn("SocketIO: Received potentially malformed base64 data");
        }

        // Improved error handling for base64 decoding
        let decodedText;
        try {
          decodedText = this.decodeBase64(gameStateBase64);
          logger.debug("SocketIO: Decoded text length:", decodedText.length);

          // Log a small sample of the decoded text to help with debugging
          if (decodedText.length > 0) {
            const sample =
              decodedText.length > 30
                ? decodedText.substring(0, 30) + "..."
                : decodedText;
            logger.debug("SocketIO: Decoded text sample:", sample);
          }

          // Parse the game state
          const gameState = JSON.parse(decodedText);
          logger.debug("SocketIO: Parsed game state");

          // Emit event with the decoded game state
          this.emit("duel:refresh:state:", gameState);
        } catch (error) {
          logger.error(
            "SocketIO: Failed to decode game state:",
            error,
            "Original message:",
            messageStr.substring(0, 200) + "..." // Log only first part of message to avoid console overflow
          );
        }
      } catch (error) {
        logger.error("SocketIO: Failed to process game state message:", error);
      }
    } else if (messageStr.includes("duel:command:exec:")) {
      try {
        const commandBase64 = messageStr.split("duel:command:exec:")[1];
        const command = this.decodeBase64ToObject(commandBase64);
        logger.debug("SocketIO: Received command execution:", command);
        this.emit("duel:command:exec", command);
      } catch (error) {
        logger.error("SocketIO: Failed to decode command:", error);
      }
    } else if (messageStr.includes("duel:player:join:")) {
      const playerId = messageStr.split("duel:player:join:")[1];
      logger.debug("SocketIO: Player joined:", playerId);
      this.emit("duel:player:join:", playerId);
    } else if (messageStr === "duel:all_players_ready") {
      logger.debug("SocketIO: All players are ready in the room");
      this.emit("duel:all_players_ready");
    } else {
      logger.debug("SocketIO: Unhandled message type:", messageStr);
    }
  };

  private audioDataHandler = async (data: Uint8Array) => {
    if (!this.currentVoiceTopic || !this.socket || !this.connected) {
      return;
    }

    try {
      const message = {
        type: "voice",
        data: Array.from(data),
        senderId: this.playerId,
        timestamp: Date.now(),
      };

      await this.messageTopic(this.currentVoiceTopic, JSON.stringify(message));
    } catch (error) {
      logger.error("SocketIO: Failed to send audio data:", error);
    }
  };

  private setupAudioEventListeners() {
    this.audioManager.on("error", (error) => {
      logger.error("SocketIO: Audio error:", error);
      this.emit("audio:error", error);
    });

    this.audioManager.on("stateChange", (state) => {
      this.emit("audio:stateChange", state);
    });
  }

  // Helper functions to match P2P implementation
  private encodeToBase64(data: string): string {
    try {
      // Use TextEncoder to properly handle Unicode characters
      const encoded = new TextEncoder().encode(data);

      // Convert to a format suitable for btoa (binary to ASCII)
      const binaryString = Array.from(encoded)
        .map((byte) => String.fromCharCode(byte))
        .join("");

      // Convert to base64
      return btoa(binaryString);
    } catch (error) {
      logger.error("SocketIO: Failed to encode string to base64:", error);
      // Return a fallback that will be recognizable as an error
      return btoa("ENCODING_ERROR");
    }
  }

  private decodeBase64(str: string): string {
    try {
      // Convert from base64 to binary string
      const binaryString = atob(str);

      // Convert to Uint8Array
      const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));

      // Decode back to string using TextDecoder
      return new TextDecoder().decode(bytes);
    } catch (error) {
      logger.error("SocketIO: Failed to decode base64 to string:", error);
      return JSON.stringify({ error: "Decoding error" });
    }
  }

  private encodeObjectToBase64(json: any): string {
    try {
      // First ensure we have a proper JSON string
      const jsonStr = typeof json === "string" ? json : JSON.stringify(json);
      logger.debug(
        "SocketIO: Converting object to base64, sample:",
        jsonStr.length > 100 ? jsonStr.substring(0, 100) + "..." : jsonStr
      );

      // Convert to Base64
      return this.encodeToBase64(jsonStr);
    } catch (error) {
      logger.error("SocketIO: Failed to convert object to base64:", error);
      // Even if there's an error, try to convert the original object to string
      return this.encodeToBase64(
        JSON.stringify({ error: "Encoding error", originalType: typeof json })
      );
    }
  }

  private decodeBase64ToObject(data: string): any {
    try {
      const jsonStr = this.decodeBase64(data);
      logger.debug(
        "SocketIO: Decoded base64 to string, sample:",
        jsonStr.length > 100 ? jsonStr.substring(0, 100) + "..." : jsonStr
      );
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error("SocketIO: Failed to convert base64 to object:", error);
      return { error: "Failed to decode object" };
    }
  }
}
