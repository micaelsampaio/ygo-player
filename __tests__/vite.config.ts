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
      // Resolve JavaScript (bundle.js) for ygo-player
      "ygo-player": isDocker
        ? resolve(__dirname, "./node_modules/ygo-player/bundle.js") // Point to bundle.js in Docker
        : resolve(__dirname, "../src"), // Point to src for local development
      // Resolve CSS for ygo-player
      "ygo-player/style.css": isDocker
        ? resolve(__dirname, "./node_modules/ygo-player/style.css") // Point to style.css in Docker
        : resolve(__dirname, "../src/style.css"), // Point to style.css for local development
    },
  },
  build: {
    sourcemap: true,
  },
});
