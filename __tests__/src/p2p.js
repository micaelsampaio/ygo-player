import { dcutr } from "@libp2p/dcutr";
import * as filters from "@libp2p/websockets/filters";
import { identify, identifyPush } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { webSockets } from "@libp2p/websockets";
import { multiaddr, protocols } from "@multiformats/multiaddr";
import { byteStream } from "it-byte-stream";
import { fromString, toString } from "uint8arrays";
import { bootstrap } from "@libp2p/bootstrap";
import { createLibp2p } from "libp2p";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { webTransport } from "@libp2p/webtransport";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";

export class dkeyedPeerToPeer {
  WEBRTC_CODE = protocols("webrtc").code;
  peerId = null;
  ma = null;
  libp2p = null;

  constructor() {
    this.libp2p = null;
  }

  getPeerId() {
    return this.peerId;
  }

  getMultiaddrs() {
    return this.ma;
  }

  // Initialize the libp2p instance
  async startP2P() {
    this.libp2p = await createLibp2p({
      addresses: {
        listen: ["/p2p-circuit", "/webrtc"],
      },
      transports: [
        webSockets({ filter: filters.all }),
        webRTC(),
        circuitRelayTransport(),
      ],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      connectionGater: {
        denyDialMultiaddr: () => false,
      },
      services: {
        identify: identify(),
        identifyPush: identifyPush(),
        ping: ping(),
      },
    });

    await this.libp2p.start();
    this.peerId = this.libp2p.peerId.toString();
    console.log("libp2p started! Peer ID:", this.libp2p.peerId.toString());

    // Event listeners
    this.libp2p.addEventListener("connection:open", () =>
      this.updateConnList()
    );
    this.libp2p.addEventListener("connection:close", () =>
      this.updateConnList()
    );
    this.libp2p.addEventListener("self:peer:update", () =>
      this.updateMultiaddrs()
    );

    this.connectToRelay();

    return this.libp2p;
  }

  // Update connections list
  async updateConnList() {
    this.libp2p.getConnections().map((connection) => {
      console.log("New connection event:");
      if (connection.remoteAddr.protoCodes().includes(this.WEBRTC_CODE)) {
        console.log("Peer Connection ", connection.remoteAddr.toString());
        this.ma = connection.remoteAddr.toString();
      } else {
        console.log("Relay Connection ", connection.remoteAddr.toString());
      }
    });
  }

  // Update multiaddresses, only show WebRTC addresses
  updateMultiaddrs() {
    const multiaddrs = this.libp2p
      .getMultiaddrs()
      .filter((ma) => this.isWebrtc(ma))
      .map((ma) => {
        console.log("New multiaddress: ", ma.toString());
      });
  }

  // Check if the multiaddr is WebRTC
  isWebrtc(ma) {
    return ma.protoCodes().includes(this.WEBRTC_CODE);
  }

  // Connect to a specific peer
  async connectToPeer(ma) {
    const castedMultiAddress = multiaddr(ma);
    const signal = AbortSignal.timeout(5000);
    try {
      if (this.isWebrtc(castedMultiAddress)) {
        const rtt = await this.libp2p.services.ping.ping(castedMultiAddress, {
          signal,
        });
        console.log(`Connected to '${castedMultiAddress}'`);
        console.log(`RTT to ${castedMultiAddress.getPeerId()} was ${rtt}ms`);
      } else {
        await this.libp2p.dial(castedMultiAddress, { signal });
        console.log("Connected to relay");
      }
    } catch (err) {
      if (signal.aborted) {
        console.log(`Timed out connecting to '${castedMultiAddress}'`);
      } else {
        console.log(
          `Connecting to '${castedMultiAddress}' failed - ${err.message}`
        );
      }
    }
  }

  // Connect to a relay peer
  async connectToRelay() {
    const relayMa = multiaddr(
      "/ip4/127.0.0.1/tcp/64271/ws/p2p/12D3KooWCTBGzs1qVdKnnHG4d341qs5pkzo2rF1AY4RuyXDVEYfj"
    );
    return await this.connectToPeer(relayMa);
  }
}
