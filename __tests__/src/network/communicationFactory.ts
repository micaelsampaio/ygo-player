import { ICommunicationLayer } from "./interfaces/ICommunicationLayer";
import { P2PCommunication } from "./p2pCommunication";
import { SocketIOCommunication } from "./socketio";

/**
 * Available communication types
 */
export type CommunicationType = "p2p" | "socketio";

/**
 * Configuration options for network communication
 */
export interface CommunicationOptions {
  bootstrapNode?: string;
  discoveryTopic?: string;
  serverUrl?: string;
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
      default:
        throw new Error(`Unsupported communication type: ${type}`);
    }
  }
}
