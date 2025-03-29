import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Check if running in Docker
const isDocker = process.env.DOCKER === "true";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      path: "path-browserify",
      // Use different paths for local and Docker builds
      "ygo-player": isDocker
        ? resolve(__dirname, "./node_modules/ygo-player/bundle.js") // Explicitly point to index.js
        : resolve(__dirname, "../src"),
    },
  },
  build: {
    sourcemap: true,
  },
});
