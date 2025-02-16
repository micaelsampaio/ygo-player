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
import { pipe } from "it-pipe";
import { fromString, toString } from "uint8arrays";
import { Pushable, pushable } from "it-pushable";

export class dkeyedPeerToPeer {
  WEBRTC_CODE = protocols("webrtc").code;
  PROTOCOL = "/chat/1.0.0";
  peerId = null;
  ma = null;
  libp2p = null;

  private bootstrapNode: string;
  private streams: Map<string, Pushable<Uint8Array>>;

  constructor(bootstrapNode: string) {
    this.bootstrapNode = bootstrapNode;
    this.streams = new Map();

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
    console.log("Bootstrap Node:", this.bootstrapNode);
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

    // Set up protocol handler immediately after creating libp2p instance
    await this.setupProtocolHandler();

    await this.libp2p.start();
    this.peerId = this.libp2p.peerId.toString();
    console.log("libp2p started! Peer ID:", this.peerId);

    console.log(
      "Initial multiaddrs:",
      this.libp2p.getMultiaddrs().map((ma) => ma.toString())
    );

    this.libp2p.addEventListener("peer:discovery", (evt) => {
      console.log("Found peer:", evt.detail.id.toString());
      console.log(
        "Peer Multiaddrs:",
        evt.detail.multiaddrs.map((ma) => ma.toString())
      );
      this.updateMultiaddrs();
    });

    this.libp2p.addEventListener("connection:open", (evt) => {
      console.log("Connection opened with:", evt.detail.remoteAddr.toString());
      this.updateMultiaddrs();
    });

    this.libp2p.addEventListener("connection:close", (evt) => {
      console.log("Connection closed with:", evt.detail.remoteAddr.toString());
      const peerAddr = evt.detail.remoteAddr.toString();
      this.streams.delete(peerAddr);
    });

    this.libp2p.addEventListener("self:peer:update", () => {
      console.log("Self peer updated!");
      this.updateMultiaddrs();
    });

    return this.libp2p;
  }

  private async setupProtocolHandler() {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    await this.libp2p.handle(this.PROTOCOL, ({ connection, stream }) => {
      const peerId = connection.remotePeer.toString();
      console.log(`Setting up protocol handler for peer: ${peerId}`);

      pipe(
        stream.source,
        async function* (source) {
          for await (const msg of source) {
            const decodedMsg = toString(msg.subarray());
            console.log(`Received from ${peerId}:`, decodedMsg);
            yield msg;
          }
        },
        stream.sink
      ).catch((err) => {
        console.error(`Stream error with ${peerId}:`, err);
      });
    });
  }

  updateMultiaddrs() {
    if (!this.libp2p) return;

    const allAddrs = this.libp2p.getMultiaddrs();
    console.log(
      "All multiaddrs:",
      allAddrs.map((ma) => ma.toString())
    );
    return allAddrs;
  }

  isWebrtc(ma) {
    return ma.protoCodes().includes(this.WEBRTC_CODE);
  }

  async connectToPeer(ma: string) {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    const castedMultiAddress = multiaddr(ma);
    const signal = AbortSignal.timeout(5000);

    try {
      await this.libp2p.dial(castedMultiAddress, { signal });
      console.log(`Connected to '${castedMultiAddress}'`);

      try {
        const rtt = await this.libp2p.services.ping.ping(castedMultiAddress, {
          signal,
        });
        console.log(`RTT to ${castedMultiAddress.getPeerId()} was ${rtt}ms`);
      } catch (pingErr) {
        console.warn(`Connected but ping failed: ${pingErr.message}`);
      }
    } catch (err) {
      if (signal.aborted) {
        console.log(`Timed out connecting to '${castedMultiAddress}'`);
      } else {
        console.log(
          `Connecting to '${castedMultiAddress}' failed - ${err.message}`
        );
      }
      throw err;
    }
  }

  async sendMsgToPeer(peerMultiaddr: string, msg: string) {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    try {
      const targetPeer = multiaddr(peerMultiaddr);
      console.log(
        `Attempting to send message to ${targetPeer.toString()}: ${msg}`
      );

      let stream = this.streams.get(peerMultiaddr);

      if (!stream) {
        console.log("Creating new stream for peer");

        // **Debugging: Check if dialProtocol works**
        const connection = await this.libp2p.dial(targetPeer);
        console.log(`Connected to ${targetPeer.toString()}, opening stream...`);

        // **Try opening a stream**
        const newStream = await connection.newStream(this.PROTOCOL);

        if (!newStream) {
          throw new Error(`Failed to open stream to ${peerMultiaddr}`);
        }

        stream = pushable();
        pipe(stream, newStream.sink).catch((err) => {
          console.error(`Stream error for ${targetPeer.toString()}:`, err);
          this.streams.delete(peerMultiaddr);
        });

        this.streams.set(peerMultiaddr, stream);
      }

      stream.push(fromString(msg));
      console.log(
        `Successfully sent message to ${targetPeer.toString()}: ${msg}`
      );
    } catch (err) {
      console.error("Error sending message:", err);
      this.streams.delete(peerMultiaddr);
      throw err;
    }
  }

  async closeConnection(peerMultiaddr: string) {
    const stream = this.streams.get(peerMultiaddr);
    if (stream) {
      stream.end();
      this.streams.delete(peerMultiaddr);
    }
  }
}
