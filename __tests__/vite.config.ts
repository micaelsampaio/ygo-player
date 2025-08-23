import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const fullReloadAlways = {
  handleHotUpdate({ server }: any) {
    server.ws.send({ type: "full-reload" });
    return [];
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), fullReloadAlways as any],
  server: {
    port: 5275
  },
})
