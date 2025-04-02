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
      // Resolve CSS for ygo-player
      "ygo-player/style.css": isDocker
        ? resolve(__dirname, "./node_modules/ygo-player/style.css") // Point to style.css in Docker
        : resolve(__dirname, "../dist/style.css"), // Point to style.css for local development
      // Resolve JavaScript (bundle.js) for ygo-player
      "ygo-player": isDocker
        ? resolve(__dirname, "./node_modules/ygo-player/bundle.js") // Point to bundle.js in Docker
        : resolve(__dirname, "../dist/bundle.js"), // Point to src for local development
      "ygo-core-images-utils/style.css": isDocker
        ? resolve(__dirname, "./node_modules/ygo-core-images-utils/style.css")
        : resolve(__dirname, "../../ygo-core-images-utils/dist/style.css"),
      "ygo-core-images-utils": isDocker
        ? resolve(__dirname, "./node_modules/ygo-core-images-utils/index.js")
        : resolve(__dirname, "../../ygo-core-images-utils/dist/index.js"),
      "ygo-core": isDocker
        ? resolve(__dirname, "./node_modules/ygo-core/index.js")
        : resolve(__dirname, "../../ygo-core/dist/index.js"),
    },
  },
  build: {
    sourcemap: true,
  },
});
