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
import { webTransport } from "@libp2p/webtransport";
import { pipe } from "it-pipe";
import { fromString, toString } from "uint8arrays";
import { Pushable, pushable } from "it-pushable";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

import EventEmitter from "events";

export class dkeyedPeerToPeer extends EventEmitter {
  WEBRTC_CODE = protocols("webrtc").code;
  PROTOCOL = "/chat/1.0.0";
  peerId = null;
  ma = null;
  libp2p = null;
  private PUBSUB_PEER_DISCOVERY = "peer-discovery";

  private bootstrapNode: string;
  private streams: Map<string, Pushable<Uint8Array>>;

  constructor(bootstrapNode: string) {
    super();
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
        webTransport(),
        webRTC(),
        circuitRelayTransport({
          discoverRelays: 1,
        }),
      ],
      peerDiscovery: [
        pubsubPeerDiscovery({
          // Every 10 seconds publish our multiaddrs
          interval: 5000,
          // The topic that the relay is also subscribed to
          topics: [this.PUBSUB_PEER_DISCOVERY],
        }),
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
        pubsub: gossipsub(),
      },
    });

    // Join the discovery channel
    //    const topic = "peer-discovery";

    //    await this.libp2p.services.pubsub.subscribe(topic);
    //    console.log("Subscribed to PubSub topic:", topic);
    //    await this.libp2p.services.pubsub.publish(
    //      topic,
    //      new TextEncoder().encode(this.libp2p.peerId.toString())
    //    );

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
      const id = evt.detail.id.toString();
      const addrs = evt.detail.multiaddrs.map((ma) => ma.toString());
      // Emit the event for the React component
      this.emit("peer:discovery", { id, addresses: addrs, connected: "false" });
    });

    this.libp2p.addEventListener("connection:open", (evt) => {
      const peerId = evt.detail.remotePeer.toString();
      this.emit("connection:open", { peerId });
    });

    this.libp2p.addEventListener("connection:close", (evt) => {
      const peerId = evt.detail.remotePeer.toString();
      this.emit("connection:close", { peerId });
    });

    this.libp2p.addEventListener("self:peer:update", () => {
      console.log("Self peer updated!");
      this.updateMultiaddrs();
    });

    this.libp2p.addEventListener("error", (event) => {
      console.error("Libp2p error:", event);
    });

    this.libp2p.services.pubsub.addEventListener("message", (message) => {
      const messageStr = new TextDecoder().decode(message.detail.data);
      if (messageStr.includes("remove:peer:")) {
        console.log("Peer Remove Message");
        const peerId = messageStr.toString().split(":")[2];
        this.emit("remove:peer", { peerId });
      }
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
