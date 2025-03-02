import { Libp2p } from "libp2p";
import { Pushable } from "it-pushable";
import EventEmitter from "events";

export class PeerToPeer extends EventEmitter {
  // Class properties
  private PROTOCOL: string;
  private peerId: string | null;
  private ma: string | null;
  private libp2p: Libp2p | null;
  private discoveryTopic: string | null;
  private bootstrapNode: string;
  private streams: Map<string, Pushable<Uint8Array>>;

  // Constructor
  constructor(bootstrapNode: string, discoveryTopic: string);

  // Initialization methods
  private setupDebugLogs(): void;
  public startP2P(): Promise<void>;
  private setupProtocolHandler(): Promise<void>;
  private setupEventListeners(): void;

  // Connection methods
  private tryAddress(ma: string): Promise<void>;
  private connectToPeerById(peerId: string): Promise<boolean>;
  private tryAddresses(addresses: string[]): Promise<boolean>;
  public connectToPeerWithFallback(peerId: string, addresses: string[]): Promise<boolean>;
  private isPeerConnected(peerId: string): Promise<boolean>;

  // Messaging methods
  public sendMsgToPeer(peerMultiaddr: string, msg: string): Promise<void>;
  private closeConnection(peerMultiaddr: string): Promise<void>;

  // Topic/Pubsub methods
  public subscribeTopic(topic: string): Promise<void>;
  public messageTopic(topic: string, message: string): Promise<void>;

  // Getter methods
  public getPeerId(): string | null;
  public getMultiaddrs(): string | null;
  public getDiscoveryTopic(): string | null;
  public getPeerAddresses(peerId: string): Promise<string[]>;
}
