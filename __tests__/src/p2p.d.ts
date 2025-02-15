import { Libp2p } from "libp2p";
import { Multiaddr } from "@multiformats/multiaddr";

export class dkeyedPeerToPeer {
  WEBRTC_CODE: number;
  peerId: string | null;
  ma: string | null;
  libp2p: Libp2p | null;

  constructor();

  getPeerId(): string | null;

  getMultiaddrs(): string | null;

  startP2P(): Promise<Libp2p>;

  updateConnList(): Promise<void>;

  updateMultiaddrs(): void;

  isWebrtc(ma: Multiaddr): boolean;

  connectToPeer(ma: string): Promise<void>;

  connectToRelay(): Promise<void>;
}
