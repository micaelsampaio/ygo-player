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
import fs from "fs";

const enableWSS = process.env.ENABLE_WSS === "true"; // Check if WSS is enabled

// If using SSL/TLS and WSS is enabled
let key, cert;
if (enableWSS) {
  key = fs.readFileSync(process.env.SSL_KEY_PATH);
  cert = fs.readFileSync(process.env.SSL_CERT_PATH);
}

const listenAddresses = [
  "/ip4/0.0.0.0/tcp/3002/ws", // WebSocket (WS)
  "/ip4/0.0.0.0/tcp/3003", // TCP
  "/ip4/0.0.0.0/udp/3004/webrtc", // WebRTC
  "/ip4/0.0.0.0/udp/3005/quic-v1/webtransport", // WebTransport
  "/ip4/127.0.0.1/tcp/3001/ws", // Local WS
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
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    },
  }),
  webTransport(),
  circuitRelayTransport({ discoverRelays: 1 }),
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
  services: {
    identify: identify(),
    relay: circuitRelayServer({
      reservations: { maxReservations: 50, maxDuration: 1800000 },
      hop: { timeout: 30000, maxReservations: 50 },
    }),
  },
  connectionManager: {
    maxConnections: 1000,
    minConnections: 50,
    pollInterval: 2000,
  },
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

// Monitor connections
server.addEventListener("connection:open", (event) => {
  console.log("New connection:", event.detail.remoteAddr.toString());
});
server.addEventListener("connection:close", (event) => {
  console.log("Connection closed:", event.detail.remoteAddr.toString());
});
server.addEventListener("error", (event) => {
  console.error("Node error:", event);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await server.stop();
  process.exit(0);
});
