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
    // all libp2p debug logs
    localStorage.setItem("debug", "libp2p:*");
    // networking debug logs
    localStorage.setItem(
      "debug",
      "libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer"
    );
  }

  getPeerId() {
    return this.peerId;
  }

  getMultiaddrs() {
    return this.ma;
  }

  // Initialize the libp2p instance
  async startP2P() {
    console.log("Bootstrap Node:", import.meta.env.BOOTSTRAP_NODE);
    this.libp2p = await createLibp2p({
      addresses: {
        listen: ["/p2p-circuit", "/webrtc"],
      },
      transports: [
        webSockets({ filter: filters.all }),
        webRTC(),
        circuitRelayTransport(),
      ],
      peerDiscovery: [
        bootstrap({
          list: [
            "/ip4/127.0.0.1/tcp/5001/ws/p2p/12D3KooWS2XoZP8164gZXkeBK43X3Wi7QQifggVY9B1jku55F2Rb",
            //String(import.meta.env.BOOTSTRAP_NODE),
            // a list of bootstrap peer multiaddrs to connect to on node startup
          ],
        }),
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
    this.libp2p.addEventListener("peer:discovery", (evt) => {
      console.log("found peer: ", evt.detail.toString());
    });
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
}
