import { ICommunicationLayer } from "./interfaces/ICommunicationLayer";
import { P2PCommunication } from "./p2pCommunication";
import { SocketIOCommunication } from "./socketio";
import { EventEmitter } from "events";

/**
 * Available communication types
 */
export type CommunicationType = "p2p" | "socketio" | "offline";

/**
 * Configuration options for network communication
 */
export interface CommunicationOptions {
  bootstrapNode?: string;
  discoveryTopic?: string;
  serverUrl?: string;
}

/**
 * A minimal offline communication layer that implements the ICommunicationLayer interface
 * but doesn't actually attempt any network communication
 */
class OfflineCommunicationLayer
  extends EventEmitter
  implements ICommunicationLayer
{
  private playerId = "offline-player";
  private roomId: string | null = null;

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  cleanup(): void {
    // No-op in offline mode
  }

  getPeerId(): string {
    return this.playerId;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  async createRoom(): Promise<void> {
    this.roomId = `offline-room-${Date.now()}`;
    return Promise.resolve();
  }

  async joinRoom(): Promise<void> {
    return Promise.resolve();
  }

  async subscribeTopic(): Promise<boolean> {
    return Promise.resolve(true);
  }

  unsubscribeTopic(): void {
    // No-op in offline mode
  }

  async messageTopic(): Promise<void> {
    // No-op in offline mode
    return Promise.resolve();
  }

  async startVoiceChat(): Promise<boolean> {
    return Promise.resolve(false);
  }

  stopVoiceChat(): void {
    // No-op in offline mode
  }

  setMicMuted(): void {
    // No-op in offline mode
  }

  setPlaybackMuted(): void {
    // No-op in offline mode
  }

  getAudioAnalyser(): AnalyserNode | null {
    return null;
  }
}

/**
 * Factory for creating communication layer implementations
 */
export class CommunicationFactory {
  /**
   * Create an appropriate communication implementation based on the type
   * @param type The type of communication to create
   * @param options Configuration options
   * @returns An implementation of ICommunicationLayer
   */
  static createCommunication(
    type: CommunicationType,
    options: CommunicationOptions = {}
  ): ICommunicationLayer {
    switch (type) {
      case "p2p":
        return new P2PCommunication({
          bootstrapNode:
            options.bootstrapNode ||
            "/127.0.0.1/tcp/443/ws/p2p/12D3KooWFw9nAkCnXM8BoWUGqWv9ZLJBbJ3aAVcYXP2B5LENb2LR",
          discoveryTopic: options.discoveryTopic || "ygo-player-discovery",
        });
      case "socketio":
        return new SocketIOCommunication(
          import.meta.env.VITE_SOCKET_SERVER ||
            options.serverUrl ||
            "http://localhost:3035"
        );
      case "offline":
        // Just create a minimal implementation that doesn't do any actual networking
        return new OfflineCommunicationLayer();
      default:
        throw new Error(`Unsupported communication type: ${type}`);
    }
  }
}
