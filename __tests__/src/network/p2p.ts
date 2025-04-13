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
import { autoNAT } from "@libp2p/autonat";
import first from "it-first";
import { AudioStream } from "./AudioStream";
import {
  createDelegatedRoutingV1HttpApiClient,
  DelegatedRoutingV1HttpApiClient,
} from "@helia/delegated-routing-v1-http-api-client";
import EventEmitter from "events";

import { logger as libp2pLogger } from "@libp2p/logger";
import { Logger } from "../utils/logger";

// Create your custom logger
const logger = Logger.createLogger("P2P");

// Use libp2pLogger for bootstrap
const bootstrapLog = libp2pLogger("libp2p:bootstrap");

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
    this.setupKeepAlive();
  }

  private setupKeepAlive() {
    logger.debug("Setting up keepalive with 30s interval");
    this.keepAliveInterval = setInterval(async () => {
      if (!this.libp2p?.services.pubsub) {
        logger.warn("No pubsub service available for keepalive");
        return;
      }

      try {
        const topics = this.libp2p.services.pubsub.getTopics();
        logger.debug("Sending keepalive to topics:", topics);
        for (const topic of topics) {
          await this.libp2p.services.pubsub.publish(
            topic,
            new TextEncoder().encode(`keepalive:${Date.now()}`)
          );
        }
      } catch (err) {
        logger.error("Keepalive failed:", err);
      }
    }, 30000);
  }

  private setupDebugLogs() {
    localStorage.setItem("debug", "libp2p:*");
    localStorage.setItem(
      "debug",
      "libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer"
    );
    this.libp2p.services.pubsub.addEventListener("gossipsub:heartbeat", () => {
      // logger.debug(
      //   "Gossip:Mesh peers:",
      //   this.libp2p.services.pubsub.getMeshPeers(this.discoveryTopic)
      // );
      // logger.debug("Gossip:All peers:", this.libp2p.services.pubsub.getPeers());
    });
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
    logger.debug("P2P: Bootstrap Node:", this.bootstrapNode);

    this.libp2p = await createLibp2p({
      connectionManager: {
        // Add event listeners
        onConnect: (connection) => {
          logger.debug("Connected to:", connection.remotePeer.toString());
          logger.debug("via:", connection.remoteAddr.toString());
        },
        onDisconnect: (connection) => {
          logger.debug("Disconnected from:", connection.remotePeer.toString());
        },
      },
      addresses: {
        listen: ["/p2p-circuit", "/p2p-circuit/ws", "/webrtc"],
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
                urls: "turn:master-duel-turn.baseira.casa:3478?transport=tcp",
                username: "kaiba",
                credential: "downfall",
                //                credentialType: "password",
              },
            ],
            iceTransportPolicy: "relay", // Force using TURN relay instead of direct connections
            rtcpMuxPolicy: "require",
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
        //autoNat: autoNAT(),
        //delegatedRouting: () => delegatedClient,
        pubsub: gossipsub({
          allowPublishToZeroPeers: true,
          emitSelf: false,
          gossipIncoming: true,
          fallbackToFloodsub: true,
          ignoreDuplicatePublishError: true,
          heartbeatInterval: 1000,
          // Make mesh more permissive
          //         D: 4, // Desired outbound degree
          //         Dlo: 2, // Lower bound for outbound degree
          //         Dhi: 8, // Upper bound for outbound degree
          //         Dscore: 1, // Minimum score for peer to be included in mesh
          scoreParams: {
            IPColocationFactorThreshold: 1,
            behaviorPenaltyThreshold: 0,
            retainScore: 0,
          },
          directPeers: [
            {
              id: this.bootstrapNodePeerId,
              addrs: [multiaddr(this.bootstrapNode)],
            },
          ],
        }),
      },
    });

    await this.setupProtocolHandler();
    await this.libp2p.start();
    this.setupDebugLogs();

    this.peerId = this.libp2p.peerId.toString();
    logger.debug("P2P: libp2p started! Peer ID:", this.peerId);
    logger.debug(
      "P2P: Initial multiaddrs:",
      this.libp2p.getMultiaddrs().map((ma) => ma.toString())
    );

    this.setupEventListeners();
  }

  private async setupProtocolHandler() {
    logger.debug("P2P: Setting up protocol handler");
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    await this.libp2p.handle(this.PROTOCOL, ({ connection, stream }) => {
      const peerId = connection.remotePeer.toString();
      logger.debug(`Setting up protocol handler for peer: ${peerId}`);

      pipe(
        stream.source,
        async function* (source) {
          for await (const msg of source) {
            const decodedMsg = toString(msg.subarray());
            logger.debug(`Received from ${peerId}:`, decodedMsg);
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
      logger.debug("P2P: Peer Discovery:", peerId, addrs);
      this.emit("peer:discovery", {
        peerId,
        addresses: addrs,
        connected: "false",
      });
    });

    this.libp2p.addEventListener("connection:open", (evt) => {
      const peerId = evt.detail.remotePeer.toString();
      logger.debug("P2P: Connection Open:", peerId);
      this.emit("connection:open", { peerId });
    });

    this.libp2p.addEventListener("connection:close", (evt) => {
      const peerId = evt.detail.remotePeer.toString();
      logger.debug("P2P: Connection Close:", peerId);
      this.emit("connection:close", { peerId });
    });

    this.libp2p.addEventListener("self:peer:update", () => {
      logger.debug(
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
        logger.debug("P2p: Subscription Change", data);
      }
    );

    this.libp2p.services.pubsub.addEventListener("message", (message) => {
      const messageStr = new TextDecoder().decode(message.detail.data);
      this.emit("topic:" + message.detail.topic + ":message", { messageStr });
      if (messageStr.includes("remove:peer:")) {
        logger.debug("Peer Remove Message");
        const peerId = messageStr.toString().split(":")[2];
        this.emit("remove:peer", { peerId });
      }
    });
  }

  private async tryAddress(ma: string) {
    logger.debug("P2P: Connecting to peer:", ma);
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    const castedMultiAddress = multiaddr(ma);
    const signal = AbortSignal.timeout(10000);

    try {
      await this.libp2p.dial(castedMultiAddress, { signal });
      logger.debug(`Connected to '${castedMultiAddress}'`);
      return true;
    } catch (err) {
      if (signal.aborted) {
        logger.debug(`Timed out connecting to '${castedMultiAddress}'`);
      } else {
        logger.debug(
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
    logger.debug("P2P: Trying multiple addresses:", addresses);

    // Filter out invalid addresses
    const filteredAddresses = addresses.filter(
      (addr) => !this.isnotValidAddress(addr) // Remove invalid addresses
    );

    logger.debug(
      "Filtered addresses (should exclude invalid):",
      filteredAddresses
    );

    if (filteredAddresses.length === 0) {
      logger.debug("No valid addresses found.");
      return false;
    }

    // Prioritize WebSocket addresses
    const wsAddresses = filteredAddresses.filter((addr) =>
      addr.includes("/webrtc-direct/")
    );
    const otherAddresses = filteredAddresses.filter(
      (addr) => !addr.includes("/webrtc-direct/")
    );

    // Try WebSocket addresses first, then others
    const sortedAddresses = [...wsAddresses, ...otherAddresses];

    // Try each filtered address
    for (const addr of sortedAddresses) {
      try {
        logger.debug("Trying address:", addr);
        const connected = await this.tryAddress(addr);
        if (connected) {
          logger.debug(`Successfully connected to ${addr}`);
          return true; // Return early on success
        }
      } catch (err) {
        logger.debug(`Failed to connect to ${addr}:`, err.message);
      }
    }

    logger.debug("No valid connection could be established.");
    return false; // Return false if no connection succeeded
  }

  public async connectToPeerWithFallback(
    peerId: string,
    addresses: string[]
  ): Promise<boolean> {
    logger.debug(
      "P2P: Attempting to connect to peer",
      peerId,
      "with fallback addresses:",
      addresses
    );

    try {
      // Check if already connected first
      if (await this.isPeerConnected(peerId)) {
        logger.debug(
          `Already connected to peer ${peerId}, skipping connection attempt`
        );
        return true;
      }

      const connectedById = await this.connectToPeerById(peerId);
      if (connectedById) {
        logger.debug(`Successfully connected to peer ${peerId} using PeerID`);
        return true;
      }

      logger.debug(
        `Failed to connect using PeerID ${peerId}, trying provided addresses`
      );
      const connectedByAddr = await this.tryAddresses(addresses);
      if (connectedByAddr) {
        logger.debug(
          `Successfully connected to peer ${peerId} using provided addresses`
        );
        return true;
      }

      logger.debug(`Failed to connect to peer ${peerId} using any method`);
      return false;
    } catch (err) {
      console.error(`Error connecting to peer ${peerId}:`, err);
      return false;
    }
  }

  public async isPeerConnected(peerId: string): Promise<boolean> {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    try {
      const connections = this.libp2p.getConnections(peerId);
      if (connections.length === 0) return false;

      logger.debug(`P2p: Checking connection to ${peerId}`);
      logger.debug(`P2p: Connections: ${connections}`);
      // Check if any of the connections are direct or through a circuit to our target
      for (const conn of connections) {
        const remoteAddr = conn.remoteAddr;
        if (!remoteAddr) continue;

        const addrStr = remoteAddr.toString();
        logger.debug(`P2p: Checking connection to ${peerId}: ${addrStr}`);

        // Check if this connection is actually to our target peer
        if (addrStr.includes(`/p2p/${peerId}`)) {
          logger.debug(`Found valid connection to ${peerId}`);
          return conn;
        }
      }

      logger.debug(
        `No valid connection found to ${peerId} (connections were to other peers)`
      );
      return false;
    } catch (err) {
      console.error(`Error checking connection to ${peerId}:`, err);
      return false;
    }
  }

  public async sendMsgToPeer(peerMultiaddr: string, msg: string) {
    logger.debug("P2P: Sending message to peer:", peerMultiaddr, msg);
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    try {
      const targetPeer = multiaddr(peerMultiaddr);
      logger.debug(
        `Attempting to send message to ${targetPeer.toString()}: ${msg}`
      );

      let stream = this.streams.get(peerMultiaddr);

      if (!stream) {
        logger.debug("Creating new stream for peer");

        const connection = await this.libp2p.dial(targetPeer);
        logger.debug(
          `Connected to ${targetPeer.toString()}, opening stream...`
        );

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
      logger.debug(
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

  public async subscribeTopic(topic: string, meshForming: boolean = false) {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    try {
      // First check if we're already subscribed
      const currentTopics = this.libp2p.services.pubsub.getTopics();
      if (currentTopics.includes(topic)) {
        logger.debug(`Already subscribed to topic ${topic}`);
        return true;
      }

      // Subscribe to the topic
      await this.libp2p.services.pubsub.subscribe(topic);
      logger.debug(`Subscribed to topic ${topic}`);
      if (!meshForming) return true;

      // Wait for mesh formation with timeout and retries
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 5; // Increased from 10
        const interval = 2000; // 2 seconds between attempts

        const checkMesh = async () => {
          attempts++;
          const peers = this.libp2p.services.pubsub.getPeers();
          const meshPeers = this.libp2p.services.pubsub.getMeshPeers(topic);
          const subscribers = await this.libp2p.services.pubsub.getSubscribers(
            topic
          );

          logger.debug("Mesh formation status:", {
            topic,
            attempt: attempts,
            totalPeers: peers.length,
            meshPeers: meshPeers.length,
            subscribers: subscribers.length,
            peerIds: peers.map((p) => p.toString()),
            meshPeerIds: meshPeers.map((p) => p.toString()),
            subscriberIds: subscribers.map((p) => p.toString()),
          });

          // Consider mesh formed if we have any peers
          if (meshPeers.length > 0 || subscribers.length > 0) {
            logger.debug(`Mesh formed for topic ${topic}`);
            resolve(true);
            return;
          }

          // If we still don't have peers, try to trigger mesh formation
          if (attempts < maxAttempts) {
            try {
              // Publish a message to trigger mesh formation
              await this.libp2p.services.pubsub.publish(
                topic,
                new TextEncoder().encode(`mesh:heartbeat:${Date.now()}`)
              );
            } catch (err) {
              console.warn("Failed to publish heartbeat:", err);
            }
            setTimeout(checkMesh, interval);
          } else {
            console.warn(`Mesh formation timeout for topic ${topic}`);
            // Still return true as we are subscribed
            resolve(true);
          }
        };

        // Start checking mesh formation
        checkMesh();
      });
    } catch (error) {
      console.error("Failed to subscribe to topic:", error);
      return false;
    }
  }

  // Add this method to force mesh refresh
  public async refreshMesh(topic: string): Promise<void> {
    if (!this.libp2p?.services.pubsub) return;

    logger.debug(`Attempting mesh refresh for topic ${topic}`);

    try {
      // Get current mesh status
      const beforePeers = this.libp2p.services.pubsub.getMeshPeers(topic);
      logger.debug(
        "Mesh peers before refresh:",
        beforePeers.map((p) => p.toString())
      );

      // Try to trigger mesh updates by publishing a message
      await this.libp2p.services.pubsub.publish(
        topic,
        new TextEncoder().encode("mesh:refresh")
      );

      // Wait briefly for mesh to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check mesh status after refresh
      const afterPeers = this.libp2p.services.pubsub.getMeshPeers(topic);
      logger.debug(
        "Mesh peers after refresh:",
        afterPeers.map((p) => p.toString())
      );
    } catch (err) {
      console.error(`Mesh refresh failed for topic ${topic}:`, err);
    }
  }

  public async messageTopic(topic: string, message: string) {
    if (!this.libp2p?.services.pubsub) {
      console.warn("P2P: Cannot send message - pubsub not initialized");
      return;
    }

    try {
      // Don't check for peers or try to refresh mesh
      const encodedMessage = new TextEncoder().encode(message);

      // Force publish even with no subscribers
      await this.libp2p.services.pubsub.publish(topic, encodedMessage, {
        allowPublishToZeroPeers: true,
        ignoreDuplicatePublishError: true,
      });

      // Log subscription status but don't fail if no peers
      const subscribers = await this.libp2p.services.pubsub.getSubscribers(
        topic
      );
      logger.debug(
        `Message sent to topic ${topic}, subscribers: ${subscribers.length}`
      );
    } catch (error) {
      // Only log error but don't throw
      console.warn("P2P: Message publish issue:", error);
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

  public async getTopics() {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");
    const topics = this.libp2p.services.pubsub.getTopics();
    return topics;
  }

  public async getGossipPeers() {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");
    const gossipPeers = this.libp2p.services.pubsub.getPeers();
    return gossipPeers;
  }

  public async restartGossip() {
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");
    await this.libp2p.services.pubsub.start();
  }

  private async connectToPeerById(peerId: string): Promise<boolean> {
    logger.debug("P2P: Attempting to connect to peer by ID:", peerId);
    if (!this.libp2p) throw new Error("Libp2p instance not initialized");

    try {
      let peerInfo;
      try {
        const validPeerId = peerIdFromString(peerId);
        logger.debug("Valid PeerId created:", validPeerId.toString());

        const peers = await this.libp2p.peerStore.all();
        const peerExists = peers.some(
          (p) => p.id.toString() === validPeerId.toString()
        );

        if (!peerExists) {
          logger.debug(`Peer ${peerId} not found in peer store`);
          return false;
        }

        peerInfo = await this.libp2p.peerStore.get(validPeerId);

        if (
          !peerInfo ||
          !peerInfo.addresses ||
          peerInfo.addresses.length === 0
        ) {
          logger.debug(`No known addresses for peer ${peerId}`);
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

        logger.debug("Attempting to connect with addresses:", addresses);
        return await this.tryAddresses(addresses);
      } catch (peerIdErr) {
        logger.debug(`Invalid PeerId format: ${peerId}`, peerIdErr);
        return false;
      }
    } catch (err) {
      console.error(`Unexpected error connecting to peer ${peerId}:`, err);
      return false;
    }
  }
}
