import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { vitePluginSocialMediaPrerender } from "./src/middleware/socialMediaPrerender";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd());

  // Check if running in Docker using Vite's environment variable approach
  const isDocker = env.VITE_DOCKER === "true" || process.env.DOCKER === "true";

  // Add debug logging
  console.log("Environment mode:", mode);
  console.log("Environment variables:", env);
  console.log("Is Docker:", isDocker);
  console.log("Current working directory:", process.cwd());

  // Log the resolved paths
  const playerCssPath = isDocker
    ? resolve(__dirname, "./node_modules/ygo-player/style.css")
    : resolve(__dirname, "../dist/style.css");
  const playerJsPath = isDocker
    ? resolve(__dirname, "./node_modules/ygo-player/bundle.js")
    : resolve(__dirname, "../dist/bundle.js");

  console.log("Player CSS path:", playerCssPath);
  console.log("Player JS path:", playerJsPath);

  return {
    plugins: [
      react(),
      vitePluginSocialMediaPrerender(), // Add our custom prerendering plugin
    ],
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
      // Set environment variables explicitly for the build
      envPrefix: ["VITE_", "DOCKER"],
      rollupOptions: {
        // Explicitly make axios external - this tells Rollup not to try to bundle it
        external: ["axios"],
      },
    },
    // Properly expose env variables to the client
    define: {
      // Add polyfill for process.env to fix "process is not defined" error
      "process.env": {
        DOCKER: JSON.stringify(process.env.DOCKER || env.VITE_DOCKER),
        VITE_YGO_CDN_URL: JSON.stringify(
          env.VITE_YGO_CDN_URL || "https://cdn.ygo101.com"
        ),
      },
      "process.browser": true,
      "process.version": '"16.0.0"',
    },
  };
});
