import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd());

  // Check if running in Docker using Vite's environment variable approach
  const isDocker = env.VITE_DOCKER === "true";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        path: "path-browserify",
        // Resolve CSS for ygo-player
        "ygo-player/style.css": isDocker
          ? resolve(__dirname, "./node_modules/ygo-player/style.css")
          : resolve(__dirname, "../dist/style.css"),
        // Resolve JavaScript (bundle.js) for ygo-player
        "ygo-player": isDocker
          ? resolve(__dirname, "./node_modules/ygo-player/bundle.js")
          : resolve(__dirname, "../dist/bundle.js"),
        "ygo-core-images-utils/style.css": isDocker
          ? resolve(__dirname, "./node_modules/ygo-core-images-utils/style.css")
          : resolve(__dirname, "../../ygo-core-images-utils/dist/style.css"),
        "ygo-core-images-utils": isDocker
          ? resolve(__dirname, "./node_modules/ygo-core-images-utils/bundle.js")
          : resolve(__dirname, "../../ygo-core-images-utils/dist/bundle.js"),
        "ygo-core": isDocker
          ? resolve(__dirname, "./node_modules/ygo-core/index.js")
          : resolve(__dirname, "../../ygo-core/dist/index.js"),
      },
    },
    build: {
      sourcemap: true,
    },
    // Properly expose env variables to the client
    define: {
      // Add polyfill for process.env to fix "process is not defined" error
      "process.env": {},
      "process.browser": true,
      "process.version": '"16.0.0"',
    },
  };
});
