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

export class PeerToPeer extends EventEmitter {
  PROTOCOL = "/chat/1.0.0";
  private peerId = null;
  private ma = null;
  libp2p = null;
  private discoveryTopic = null;

  private bootstrapNode: string;
  private streams: Map<string, Pushable<Uint8Array>>;

  constructor(bootstrapNode: string, discoveryTopic: string) {
    super();
    this.bootstrapNode = bootstrapNode;
    this.discoveryTopic = discoveryTopic;
    this.streams = new Map();

    // all libp2p debug logs
    localStorage.setItem("debug", "libp2p:*");
    // networking debug logs
    localStorage.setItem(
      "debug",
      "libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer"
    );
  }
  // Intanciates the libp2p node
  async startP2P() {
    console.log("P2P: Bootstrap Node:", this.bootstrapNode);
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
          topics: [this.discoveryTopic],
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

    // Set up protocol handler immediately after creating libp2p instance
    await this.setupProtocolHandler();

    await this.libp2p.start();
    this.peerId = this.libp2p.peerId.toString();
    console.log("P2P: libp2p started! Peer ID:", this.peerId);

    console.log(
      "P2P: Initial multiaddrs:",
      this.libp2p.getMultiaddrs().map((ma) => ma.toString())
    );

    this.libp2p.addEventListener("peer:discovery", (evt) => {
      const peerId = evt.detail.id.toString();
      const addrs = evt.detail.multiaddrs.map((ma) => ma.toString());
      console.log("P2P: Peer Discovery:", peerId, addrs);
      // Emit the event for the React component
      this.emit("peer:discovery", {
        peerId,
        addresses: addrs,
        connected: "false",
      });
    });

    this.libp2p.addEventListener("connection:open", (evt) => {
      const peerId = evt.detail.remotePeer.toString();
      console.log("P2P: Connection Open:", peerId);
      this.emit("connection:open", { peerId });
    });

    this.libp2p.addEventListener("connection:close", (evt) => {
      const peerId = evt.detail.remotePeer.toString();
      console.log("P2P: Connection Close:", peerId);
      this.emit("connection:close", { peerId });
    });

    this.libp2p.addEventListener("self:peer:update", () => {
      console.log(
        "P2P: Self peer update event",
        this.libp2p.getMultiaddrs().map((ma) => ma.toString())
      );
    });

    this.libp2p.addEventListener("error", (evt) => {
      console.error("Libp2p error:", evt);
    });

    // Event listener for topic messages

    this.libp2p.services.pubsub.addEventListener(
      "subscription-change",
      (data) => {
        console.log("P2p: Subscription Change", data);
      }
    );

    this.libp2p.services.pubsub.addEventListener("message", (message) => {
      const messageStr = new TextDecoder().decode(message.detail.data);
      this.emit("topic:" + message.detail.topic + ":message", { messageStr });
      if (messageStr.includes("remove:peer:")) {
        console.log("Peer Remove Message");
        const peerId = messageStr.toString().split(":")[2];
        this.emit("remove:peer", { peerId });
      }
    });
    return this.libp2p;
  }

  // Gets the instantiated node peerID
  getPeerId() {
    return this.peerId;
  }

  // Gets the instantiated node multiaddrs
  getMultiaddrs() {
    return this.ma;
  }

  getDiscoveryTopic() {
    return this.discoveryTopic;
  }

  // Opens connection to a peer using the destination peer's multiaddress
  // In the future this should be done using the peer's peerID and try to connect to all multiaddresses
  async connectToPeer(ma: string) {
    console.log("P2P: Connecting to peer:", ma);
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    const castedMultiAddress = multiaddr(ma);
    const signal = AbortSignal.timeout(10000); // 10 seconds timeout

    try {
      await this.libp2p.dial(castedMultiAddress, { signal });
      console.log(`Connected to '${castedMultiAddress}'`);

      const peerId = castedMultiAddress.getPeerId();
      const connections = this.libp2p.getConnections(peerId);

      if (!connections.length) {
        console.warn(`Dialed peer '${peerId}', but no active connection.`);
        return;
      }

      if (this.libp2p.services.ping) {
        try {
          const rtt = await this.libp2p.services.ping.ping(castedMultiAddress, {
            signal,
          });
          console.log(`RTT to ${peerId} was ${rtt}ms`);
        } catch (pingErr) {
          console.warn(
            `Ping failed, but connection is established: ${pingErr.message}`
          );
        }
      } else {
        console.warn("Ping service is not available.");
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

  // Sets up the message protocol for peers communcation
  private async setupProtocolHandler() {
    console.log("P2P: Setting up protocol handler");
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

  // Sends a message to a peer using the destination peer's multiaddress
  async sendMsgToPeer(peerMultiaddr: string, msg: string) {
    console.log("P2P: Sending message to peer:", peerMultiaddr, msg);
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

  // Closes the message stream to a peer
  async closeConnection(peerMultiaddr: string) {
    const stream = this.streams.get(peerMultiaddr);
    if (stream) {
      stream.end();
      this.streams.delete(peerMultiaddr);
    }
  }
  // Subscribes to a topic
  async subscribeTopic(topic: string) {
    console.log("P2P: Attempting to subscribe to topic:", topic);
    try {
      await this.libp2p.services.pubsub.subscribe(topic);
      console.log(`P2P: Successfully subscribed to topic: ${topic}`);

      // Log current topics to verify subscription
      const currentTopics = await this.libp2p.services.pubsub.getTopics();
      console.log("P2P: Current topics:", currentTopics);

      const subs = await this.libp2p.services.pubsub.getSubscribers(topic);
      console.log(`P2P: Subscribers for topic ${topic}:`, subs);
      console.log("Gossipsub mesh:", this.libp2p.services.pubsub);
      console.log("Connected Peers:", this.libp2p.services.pubsub.getPeers());
      const { topics, subscriptions, mesh } = await this.libp2p.services.pubsub;
      console.log(
        "P2P: Current mesh:",
        "topics:",
        topics,
        "subscriptions:",
        subscriptions,
        "mesh:",
        mesh
      );
    } catch (error) {
      console.error("P2P: Subscription failed:", error);
      throw error;
    }
  }

  // Sends a message to a topic
  async messageTopic(topic: string, message: string) {
    console.log("P2P: Message topic:", topic, message);
    await this.libp2p.services.pubsub.publish(topic, fromString(message));
  }
}
