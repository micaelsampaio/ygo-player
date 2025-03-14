import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import {
  circuitRelayServer,
  circuitRelayTransport,
} from "@libp2p/circuit-relay-v2";
import { webSockets } from "@libp2p/websockets";
import { tcp } from "@libp2p/tcp";
import * as filters from "@libp2p/websockets/filters";
import { createLibp2p } from "libp2p";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { webTransport } from "@libp2p/webtransport";
import fs from "fs";
import { identify, identifyPush } from "@libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { autoNAT } from "@libp2p/autonat";

const enableWSS = process.env.ENABLE_WSS === "true"; // Check if WSS is enabled
const PUBSUB_PEER_DISCOVERY = "peer-discovery";

// If using SSL/TLS and WSS is enabled
let key, cert;
if (enableWSS) {
  key = fs.readFileSync(process.env.SSL_KEY_PATH);
  cert = fs.readFileSync(process.env.SSL_CERT_PATH);
}

const listenAddresses = [
  "/ip4/0.0.0.0/tcp/3002/ws", // WebSocket (WS)
  "/ip4/0.0.0.0/udp/9090/webrtc-direct",
  "/webrtc", // WebRTC
  "/p2p-circuit", // Circuit relay
];

// Add WSS addresses only if enabled
if (enableWSS) {
  listenAddresses.push("/ip4/0.0.0.0/tcp/3001/wss");
}

const transports = [
  webSockets({ filter: filters.all }),
  tcp(),
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
          username: "kaiba",
          credential: "downfall",
          //          credentialType: "password",
        },
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: "all",
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
  webTransport(),
  circuitRelayTransport({ discoverRelays: 2 }),
];

// Add WSS transport only if enabled
if (enableWSS) {
  transports.push(
    webSockets({
      websocket: {
        server: {
          key,
          cert,
          port: 5001,
          handleProtocols: (protocols) => protocols,
        },
      },
    })
  );
}

const server = await createLibp2p({
  addresses: { listen: listenAddresses },
  transports,
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => false,
  },
  services: {
    autoNat: autoNAT(),
    identify: identify(),
    identifyPush: identifyPush(),
    pubsub: gossipsub({
      directPeers: [],
      doPX: true,
      allowPublishToZeroPeers: true,
      emitSelf: true,
      gossipIncoming: true,
      fallbackToFloodsub: true,
      ignoreDuplicatePublishError: true,
      scoreParams: {
        IPColocationFactorThreshold: 1, // Allow multiple connections from same IP
        behaviorPenaltyThreshold: 0,
        retainScore: 0,
        meshMessageDeliveriesThreshold: -1000, // More permissive mesh
        meshMessageDeliveriesWindow: 2 * 60 * 1000, // 2 minutes
        meshMessageDeliveriesActivation: 2 * 60 * 1000, // 2 minutes
        meshMessageDeliveriesDecay: 0,
        meshFailurePenaltyDecay: 0,
        meshFailurePenaltyWeight: 0,
        invalidMessageDeliveriesWeight: 0,
        invalidMessageDeliveriesDecay: 0,
      },
      heartbeatInterval: 1000,
      keepAliveInterval: 5000,
      fanoutTTL: 60000,
      //D: 4, // Desired outbound degree
      //Dlo: 2, // Lower bound for outbound degree
      //Dhi: 6, // Upper bound for outbound degree
      //Dscore: 1, // Minimum score for peer to be included in mesh
    }),
    relay: circuitRelayServer({
      reservations: {
        maxReservations: Infinity,
        maxDuration: 24 * 60 * 60 * 1000, // 24 hours
      },
      hop: {
        enabled: true,
        timeout: 60000,
        maxReservations: Infinity,
        applyConnectionLimits: false, // Important for relay
      },
      advertise: {
        bootDelay: 0, // Start advertising immediately
        interval: 5000, // Advertise every 5 seconds
        maxAdvertisements: Infinity,
      },
    }),
  },
  // connectionManager: {
  //   maxConnections: 1000,
  //   minConnections: 50,
  //   pollInterval: 2000,
  // },
  nat: { enabled: true, description: "libp2p relay server" },
});

// Log all listening addresses
console.info("The node is running and listening on:");
console.info(
  server
    .getMultiaddrs()
    .map((ma) => ma.toString())
    .join("\n")
);

const pubsub = server.services.pubsub;
pubsub.subscribe(PUBSUB_PEER_DISCOVERY);
console.log(`Subscribed to ${PUBSUB_PEER_DISCOVERY}`);

// Handle incoming messages for the subscribed topic
//pubsub.addEventListener("message", (event) => {
// console.log(
//   `Message received on ${event.detail.topic}:`,
//   new TextDecoder().decode(event.detail.data)
// );
//});

server.addEventListener("peer:connect", (event) => {
  console.log("Peer Connect:");
  console.log(event.detail.toString());
});

server.addEventListener("connection:open", (event) => {
  console.log("Connection Open:");
  console.log(event.detail.remotePeer.toString());
});

server.addEventListener("peer:discovery", (event) => {
  console.log("Peer Discovery:");
  console.log(event.detail.id.toString());
});

server.addEventListener("peer:disconnect", (event) => {
  console.log("Peer Disconnect:");
  console.log(event.detail.toString());
});

server.addEventListener("connection:close", async (event) => {
  console.log("Connection Close:");
  const peerId = event.detail.remotePeer.toString();
  console.log(peerId);
  const message = "remove:peer:" + peerId;

  try {
    // Check if there are subscribers before publishing
    const subscribers = await pubsub.getSubscribers(PUBSUB_PEER_DISCOVERY);
    if (!subscribers || subscribers.length === 0) {
      console.log("No subscribers found for peer discovery topic");
      return;
    }

    await pubsub.publish(
      PUBSUB_PEER_DISCOVERY,
      new TextEncoder().encode(message)
    );
  } catch (error) {
    console.log("Error publishing disconnect message:", error);
  }
});

server.addEventListener("error", (event) => {
  console.error("Node error:", event);
  console.log(event.detail.remoteAddr.toString());
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await server.stop();
  process.exit(0);
});
