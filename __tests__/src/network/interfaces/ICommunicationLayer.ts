import { EventEmitter } from "events";

/**
 * Interface for modular communication implementations
 * Any communication method (P2P, Socket.IO, etc.) must implement this interface
 */
export interface ICommunicationLayer extends EventEmitter {
  /**
   * Initialize the communication layer
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Clean up resources when the communication layer is no longer needed
   */
  cleanup(): void;

  /**
   * Get the player/peer ID
   * @returns The unique identifier for this peer
   */
  getPeerId(): string | null;

  /**
   * Get the current room ID
   * @returns The ID of the room this peer is currently in
   */
  getRoomId(): string | null;

  /**
   * Create a new room
   * @returns Promise that resolves when the room is created
   */
  createRoom(): Promise<void>;

  /**
   * Join an existing room
   * @param roomId The ID of the room to join
   * @param retryAttempts Optional number of retry attempts
   * @param retryDelay Optional delay between retries in milliseconds
   * @returns Promise that resolves when the room is joined
   */
  joinRoom(
    roomId: string,
    retryAttempts?: number,
    retryDelay?: number
  ): Promise<void>;

  /**
   * Subscribe to a topic for receiving messages
   * @param topic The topic to subscribe to
   * @returns Promise that resolves to true if subscription was successful
   */
  subscribeTopic(topic: string): Promise<boolean>;

  /**
   * Unsubscribe from a topic to stop receiving messages
   * @param topic The topic to unsubscribe from
   */
  unsubscribeTopic(topic: string): void;

  /**
   * Send a message to a topic
   * @param topic The topic to send the message to
   * @param message The message to send
   * @returns Promise that resolves when the message is sent
   */
  messageTopic(topic: string, message: string): Promise<void>;

  /**
   * Start voice chat in the specified room
   * @param roomId The ID of the room
   * @returns Promise that resolves to true if voice chat was started successfully
   */
  startVoiceChat(roomId: string): Promise<boolean>;

  /**
   * Stop voice chat in the specified room
   * @param roomId The ID of the room
   */
  stopVoiceChat(roomId: string): void;

  /**
   * Set the microphone mute state
   * @param muted Whether the microphone should be muted
   */
  setMicMuted(muted: boolean): void;

  /**
   * Set the playback mute state for incoming audio
   * @param muted Whether playback should be muted
   */
  setPlaybackMuted(muted: boolean): void;

  /**
   * Get the audio analyzer for visualizations
   * @returns The audio analyzer node or null if not available
   */
  getAudioAnalyser(): AnalyserNode | null;
}
