import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      path: "path-browserify",
      "ygo-player": resolve(__dirname, "../src"),
    },
  },
  build: {
    sourcemap: true,
  },
});
