import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import {
  circuitRelayServer,
  circuitRelayTransport,
} from "@libp2p/circuit-relay-v2";
import { identify } from "@libp2p/identify";
import { webSockets } from "@libp2p/websockets";
import { tcp } from "@libp2p/tcp";
import * as filters from "@libp2p/websockets/filters";
import { createLibp2p } from "libp2p";
import { webRTC } from "@libp2p/webrtc";
import { webTransport } from "@libp2p/webtransport";

// If using SSL/TLS
import fs from "fs";
const key = fs.readFileSync(process.env.SSL_KEY_PATH);
const cert = fs.readFileSync(process.env.SSL_CERT_PATH);

const server = await createLibp2p({
  addresses: {
    listen: [
      // WebSocket (WS)
      "/ip4/0.0.0.0/tcp/5002/ws",

      // WebSocket Secure (WSS)
      "/ip4/0.0.0.0/tcp/5001/wss",

      // TCP
      "/ip4/0.0.0.0/tcp/5003",

      // WebRTC
      "/ip4/0.0.0.0/udp/5004/webrtc",

      // WebTransport
      "/ip4/0.0.0.0/udp/5005/quic-v1/webtransport",

      // IPv6 support
      "/ip6/::/tcp/5001/ws",
      "/ip6/::/tcp/5002/wss",

      // Local network
      "/ip4/127.0.0.1/tcp/5001/ws",

      // Circuit relay
      "/p2p-circuit",
    ],
  },
  transports: [
    webSockets({
      filter: filters.all,
      websocket: {
        server: {
          key,
          cert,
          port: 5001,
          // Allow any origin
          handleProtocols: (protocols) => protocols,
        },
      },
    }),
    tcp(),
    webRTC({
      rtcConfiguration: {
        iceServers: [
          {
            // STUN servers help the browser discover its own public IPs
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:global.stun.twilio.com:3478",
            ],
          },
        ],
      },
    }),
    webTransport(),
    circuitRelayTransport({
      discoverRelays: 1,
    }),
  ],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    identify: identify(),
    relay: circuitRelayServer({
      reservations: {
        maxReservations: 50,
        maxDuration: 1800000,
      },
      hop: {
        timeout: 30000,
        maxReservations: 50,
      },
    }),
  },
  connectionManager: {
    maxConnections: 1000,
    minConnections: 50,
    pollInterval: 2000,
  },
  nat: {
    enabled: true,
    description: "libp2p relay server",
  },
});

// Log all listening addresses
console.info("The node is running and listening on the following addresses:");
console.info(
  server
    .getMultiaddrs()
    .map((ma) => ma.toString())
    .join("\n")
);

// Monitor connections
server.addEventListener("connection:open", (event) => {
  console.log("New connection opened:", event.detail.remoteAddr.toString());
});

server.addEventListener("connection:close", (event) => {
  console.log("Connection closed:", event.detail.remoteAddr.toString());
});

// Monitor errors
server.addEventListener("error", (event) => {
  console.error("Node error:", event);
});

// Keep the process running
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await server.stop();
  process.exit(0);
});
