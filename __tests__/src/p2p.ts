// @ts-nocheck
import type {
  Connection,
  Message,
  SignedMessage,
  PeerId,
  Libp2p,
  PeerInfo,
} from "@libp2p/interface";
import * as filters from "@libp2p/websockets/filters";
import { identify, identifyPush } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { webSockets } from "@libp2p/websockets";
import { multiaddr, protocols } from "@multiformats/multiaddr";
import { bootstrap } from "@libp2p/bootstrap";
import { createLibp2p } from "libp2p";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { webTransport } from "@libp2p/webtransport";
import { pipe } from "it-pipe";
import { fromString, toString } from "uint8arrays";
import { Pushable, pushable } from "it-pushable";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import { peerIdFromString } from "@libp2p/peer-id";
import { dcutr } from "@libp2p/dcutr";
import first from "it-first";
import {
  createDelegatedRoutingV1HttpApiClient,
  DelegatedRoutingV1HttpApiClient,
} from "@helia/delegated-routing-v1-http-api-client";
import EventEmitter from "events";

import { logger } from "@libp2p/logger";

const log = logger("libp2p:bootstrap");

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
    const bootstrapNodePeerId = bootstrapNode.split("/p2p/")[1];
    this.bootstrapNodePeerId = peerIdFromString(bootstrapNodePeerId);
    this.streams = new Map();
    this.setupDebugLogs();
  }

  private setupDebugLogs() {
    localStorage.setItem("debug", "libp2p:*");
    localStorage.setItem(
      "debug",
      "libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer"
    );
  }

  private async getRelayListenAddrs(): Promise<string[]> {
    const peers: PeerInfo = [
      { id: this.bootstrapNodePeerId, Addrs: [multiaddr(this.bootstrapNode)] },
    ];
    const relayListenAddrs = [];
    for (const p of peers) {
      if (p && p.Addrs.length > 0) {
        for (const maddr of p.Addrs) {
          const protos = maddr.protoNames();
          // Note: narrowing to Secure WebSockets and IP4 addresses to avoid potential issues with ipv6
          // https://github.com/libp2p/js-libp2p/issues/2977
          if (protos.includes("ws")) {
            if (maddr.nodeAddress().address === "127.0.0.1") continue; // skip loopback
            relayListenAddrs.push(this.getRelayListenAddr(maddr, p.id));
          }
        }
      }
    }
    return relayListenAddrs;
  }

  // Constructs a multiaddr string representing the circuit relay v2 listen address for a relayed connection to the given peer.
  private getRelayListenAddr = (maddr: Multiaddr, peer: PeerId): string =>
    `${maddr.toString()}/p2p/${peer.toString()}/p2p-circuit`;

  public async startP2P() {
    console.log("P2P: Bootstrap Node:", this.bootstrapNode);

    this.libp2p = await createLibp2p({
      connectionManager: {
        // Add event listeners
        onConnect: (connection) => {
          console.log("Connected to:", connection.remotePeer.toString());
          console.log("via:", connection.remoteAddr.toString());
        },
        onDisconnect: (connection) => {
          console.log("Disconnected from:", connection.remotePeer.toString());
        },
      },
      addresses: {
        listen: ["/p2p-circuit", "/webrtc"],
        // announce: [
        //   "/dns4/master-duel-node.baseira.casa/tcp/443/wss",
        //   "/dns4/master-duel-node.baseira.casa/udp/443/webtransport",
        // ],
        announceFilter: (multiaddrs) => {
          // Filter out local addresses when announcing
          return multiaddrs.filter((ma) => {
            const addr = ma.nodeAddress().address;
            return !addr.match(/^(127\.|172\.|::1|fe80:)/);
          });
        },
      },
      transports: [
        webSockets({ filter: filters.all }),
        webTransport(),

        webRTC({
          rtcConfiguration: {
            iceServers: [
              {
                urls: [
                  "stun:stun.l.google.com:19302",
                  "stun:stun.l.google.com:5349",
                  "stun:stun1.l.google.com:3478",
                ],
              },
              {
                urls: "turn:master-duel-turn.baseira.casa:3478",
                //                username: "kaiba",
                //                credential: "downfall",
                //                credentialType: "password",
              },
            ],
            iceCandidatePoolSize: 10,
            iceTransportPolicy: "all",
          },
          debugWebRTC: true,
        }),
        webRTCDirect({
          // Optional config for direct connections
          maxInboundStreams: 1000,
          maxOutboundStreams: 1000,
          listenerOptions: {
            port: 9090, // Specific port for WebRTC-Direct
          },
        }),
        circuitRelayTransport({
          discoverRelays: 2,
        }),
      ],
      peerDiscovery: [
        pubsubPeerDiscovery({
          interval: 5000,
          topics: [this.discoveryTopic],
          listenOnly: false,
        }),
        bootstrap({
          list: [this.bootstrapNode],
          timeout: 2000, // Adjust timeout as needed
          tagName: "bootstrap",
          tagValue: 50,
          tagTTL: 120000,
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
        dcutr: dcutr(),
        //delegatedRouting: () => delegatedClient,
        pubsub: gossipsub({
          allowPublishToZeroPeers: true,
          emitSelf: false,
          gossipIncoming: true,
          fallbackToFloodsub: true,
          ignoreDuplicatePublishError: true,
          directPeers: [
            {
              id: this.bootstrapNodePeerId,
              addrs: [multiaddr(this.bootstrapNode)],
            },
          ],
          scoreThresholds: {
            publishThreshold: -1000,
            graylistThreshold: -1000,
            acceptPXThreshold: -1000,
          },
        }),
      },
    });

    await this.setupProtocolHandler();
    await this.libp2p.start();

    this.peerId = this.libp2p.peerId.toString();
    console.log("P2P: libp2p started! Peer ID:", this.peerId);
    console.log(
      "P2P: Initial multiaddrs:",
      this.libp2p.getMultiaddrs().map((ma) => ma.toString())
    );

    this.setupEventListeners();
  }

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

  private setupEventListeners() {
    this.libp2p.addEventListener("peer:discovery", (evt) => {
      const peerId = evt.detail.id.toString();
      const addrs = evt.detail.multiaddrs.map((ma) => ma.toString());
      console.log("P2P: Peer Discovery:", peerId, addrs);
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
  }

  private async tryAddress(ma: string) {
    console.log("P2P: Connecting to peer:", ma);
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    const castedMultiAddress = multiaddr(ma);
    const signal = AbortSignal.timeout(10000);

    try {
      await this.libp2p.dial(castedMultiAddress, { signal });
      console.log(`Connected to '${castedMultiAddress}'`);
      return true;
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

  // Function to check invalid addresses (synchronous)
  private isnotValidAddress(address: string): boolean {
    return address.includes("/p2p-circuit/p2p/");
  }

  // Function to try multiple addresses and connect to the first valid one
  private async tryAddresses(addresses: string[]): Promise<boolean> {
    console.log("P2P: Trying multiple addresses:", addresses);

    // Filter out invalid addresses
    const filteredAddresses = addresses.filter(
      (addr) => !this.isnotValidAddress(addr) // Remove invalid addresses
    );

    console.log(
      "Filtered addresses (should exclude invalid):",
      filteredAddresses
    );

    if (filteredAddresses.length === 0) {
      console.log("No valid addresses found.");
      return false;
    }

    // Try each filtered address
    for (const addr of filteredAddresses) {
      try {
        console.log("Trying address:", addr);
        const connected = await this.tryAddress(addr);
        if (connected) {
          console.log(`Successfully connected to ${addr}`);
          return true; // Return early on success
        }
      } catch (err) {
        console.log(`Failed to connect to ${addr}:`, err.message);
      }
    }

    console.log("No valid connection could be established.");
    return false; // Return false if no connection succeeded
  }

  public async connectToPeerWithFallback(
    peerId: string,
    addresses: string[]
  ): Promise<boolean> {
    console.log(
      "P2P: Attempting to connect to peer",
      peerId,
      "with fallback addresses:",
      addresses
    );

    try {
      // Check if already connected first
      if (await this.isPeerConnected(peerId)) {
        console.log(
          `Already connected to peer ${peerId}, skipping connection attempt`
        );
        return true;
      }

      const connectedById = await this.connectToPeerById(peerId);
      if (connectedById) {
        console.log(`Successfully connected to peer ${peerId} using PeerID`);
        return true;
      }

      console.log(
        `Failed to connect using PeerID ${peerId}, trying provided addresses`
      );
      const connectedByAddr = await this.tryAddresses(addresses);
      if (connectedByAddr) {
        console.log(
          `Successfully connected to peer ${peerId} using provided addresses`
        );
        return true;
      }

      console.log(`Failed to connect to peer ${peerId} using any method`);
      return false;
    } catch (err) {
      console.error(`Error connecting to peer ${peerId}:`, err);
      return false;
    }
  }

  private async isPeerConnected(peerId: string): Promise<boolean> {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    try {
      const connections = this.libp2p.getConnections(peerId);
      if (connections.length === 0) return false;

      console.log(`P2p: Checking connection to ${peerId}`);
      console.log(`P2p: Connections: ${connections}`);
      // Check if any of the connections are direct or through a circuit to our target
      for (const conn of connections) {
        const remoteAddr = conn.remoteAddr;
        if (!remoteAddr) continue;

        const addrStr = remoteAddr.toString();
        console.log(`P2p: Checking connection to ${peerId}: ${addrStr}`);

        // Check if this connection is actually to our target peer
        if (addrStr.includes(`/p2p/${peerId}`)) {
          console.log(`Found valid connection to ${peerId}`);
          return true;
        }
      }

      console.log(
        `No valid connection found to ${peerId} (connections were to other peers)`
      );
      return false;
    } catch (err) {
      console.error(`Error checking connection to ${peerId}:`, err);
      return false;
    }
  }

  public async sendMsgToPeer(peerMultiaddr: string, msg: string) {
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

        const connection = await this.libp2p.dial(targetPeer);
        console.log(`Connected to ${targetPeer.toString()}, opening stream...`);

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

  private async closeConnection(peerMultiaddr: string) {
    const stream = this.streams.get(peerMultiaddr);
    if (stream) {
      stream.end();
      this.streams.delete(peerMultiaddr);
    }
  }

  public async subscribeTopic(topic: string) {
    try {
      await this.libp2p.services.pubsub.subscribe(topic);
      console.log(`P2P: Subscribed to topic: ${topic}`);

      // Debug logs
      console.log("Pubsub peers:", this.libp2p.services.pubsub.getPeers());
      console.log(
        "Pubsub mesh for topic:",
        this.libp2p.services.pubsub.mesh.get(topic)
      );
      console.log("All topics:", this.libp2p.services.pubsub.getTopics());

      // Check if we're actually connected to the relay
      const relayPeers = this.libp2p
        .getConnections()
        .filter((conn) => conn.remoteAddr.toString().includes("p2p-circuit"));
      console.log("Relay connections:", relayPeers);
    } catch (error) {
      console.error("P2P: Subscription failed:", error);
    }
  }

  public async messageTopic(topic: string, message: string) {
    console.log("P2P: Message topic:", topic, message);
    try {
      const subscribers = await this.libp2p.services.pubsub.getSubscribers(
        topic
      );
      if (!subscribers || subscribers.length === 0) {
        console.log("P2P: No subscribers found for topic:", topic);
        return;
      }

      await this.libp2p.services.pubsub.publish(topic, fromString(message));
    } catch (error) {
      console.log("P2P: Error publishing message:", error);
    }
  }

  public getPeerId() {
    return this.peerId;
  }

  public getMultiaddrs() {
    return this.ma;
  }

  public getDiscoveryTopic() {
    return this.discoveryTopic;
  }

  async getPeerAddresses(peerId: string): Promise<string[]> {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    try {
      const peerInfo = await this.libp2p.peerStore.get(peerId);
      if (!peerInfo || !peerInfo.addresses) {
        return [];
      }
      return peerInfo.addresses.map((addr) => addr.multiaddr.toString());
    } catch (err) {
      console.error(`Failed to get addresses for peer ${peerId}:`, err);
      return [];
    }
  }

  private async connectToPeerById(peerId: string): Promise<boolean> {
    console.log("P2P: Attempting to connect to peer by ID:", peerId);
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    try {
      let peerInfo;
      try {
        const validPeerId = peerIdFromString(peerId);
        console.log("Valid PeerId created:", validPeerId.toString());

        const peers = await this.libp2p.peerStore.all();
        const peerExists = peers.some(
          (p) => p.id.toString() === validPeerId.toString()
        );

        if (!peerExists) {
          console.log(`Peer ${peerId} not found in peer store`);
          return false;
        }

        peerInfo = await this.libp2p.peerStore.get(validPeerId);

        if (
          !peerInfo ||
          !peerInfo.addresses ||
          peerInfo.addresses.length === 0
        ) {
          console.log(`No known addresses for peer ${peerId}`);
          return false;
        }

        // Modify addresses to include target peer ID for circuit addresses
        const addresses = peerInfo.addresses.map((addr) => {
          const addrStr = addr.multiaddr.toString();
          //if (addrStr.includes("/p2p-circuit")) {
          // Only append peer ID if it's not already there
          //if (!addrStr.endsWith(peerId)) {
          //  return `${addrStr}/p2p/${peerId}`;
          //}
          //}
          return addrStr;
        });
        //.slice(7); // Skip the first address

        console.log("Attempting to connect with addresses:", addresses);
        return await this.tryAddresses(addresses);
      } catch (peerIdErr) {
        console.log(`Invalid PeerId format: ${peerId}`, peerIdErr);
        return false;
      }
    } catch (err) {
      console.error(`Unexpected error connecting to peer ${peerId}:`, err);
      return false;
    }
  }
}
