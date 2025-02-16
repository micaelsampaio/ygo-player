// @ts-nocheck
import * as filters from "@libp2p/websockets/filters";
import { identify, identifyPush } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { webSockets } from "@libp2p/websockets";
import { multiaddr, protocols } from "@multiformats/multiaddr";
import { bootstrap } from "@libp2p/bootstrap";
import { createLibp2p } from "libp2p";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { webRTC } from "@libp2p/webrtc";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";

export class dkeyedPeerToPeer {
  WEBRTC_CODE = protocols("webrtc").code;
  peerId = null;
  ma = null;
  libp2p = null;

  private bootstrapNode: string;

  constructor(bootstrapNode: string) {
    this.bootstrapNode = bootstrapNode;

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
          list: [this.bootstrapNode],
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

    this.libp2p.addEventListener("connection:open", (evt) => {
      console.log("Connection opened with:", evt.detail.remoteAddr.toString());
      console.dir(evt.detail, { depth: null });
    });

    this.libp2p.addEventListener("connection:close", (evt) => {
      console.log("Connection closed with:", evt.detail.remoteAddr.toString());
    });

    this.libp2p.addEventListener("self:peer:update", () => {
      console.log("Self peer updated!");
      this.updateMultiaddrs();
    });

    this.libp2p.addEventListener("peer:discovery", (evt) => {
      console.log("Found peer:", evt.detail.id.toString());
      console.log(
        "Peer Multiaddrs:",
        evt.detail.multiaddrs.map((ma) => ma.toString())
      );
      console.log(
        "My Multiaddrs:",
        this.libp2p.getMultiaddrs().map((ma) => ma.toString())
      );
    });
    return this.libp2p;
  }

  async updateConnList() {
    if (!this.libp2p) return;

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

  updateMultiaddrs() {
    if (!this.libp2p) return;

    const multiaddrs = this.libp2p
      .getMultiaddrs()
      .filter((ma) => this.isWebrtc(ma))
      .map((ma) => {
        console.log("New multiaddress: ", ma.toString());
      });
  }

  isWebrtc(ma) {
    return ma.protoCodes().includes(this.WEBRTC_CODE);
  }

  async connectToPeer(ma) {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    const castedMultiAddress = multiaddr(ma);
    const signal = AbortSignal.timeout(5000);

    try {
      const rtt = await this.libp2p.services.ping.ping(castedMultiAddress, {
        signal,
      });
      await this.libp2p.dial(castedMultiAddress, { signal });
      console.log(`Connected to '${castedMultiAddress}'`);
      console.log(`RTT to ${castedMultiAddress.getPeerId()} was ${rtt}ms`);
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
