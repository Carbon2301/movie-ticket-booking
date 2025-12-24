import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["hustcinema.lekhai.id.vn", "localhost", ".localhost"],
    watch: {
      usePolling: true,
      interval: 1000, // Poll interval in milliseconds
    },
    proxy: {
      "/api": {
        // Use localhost for local development, backend for Docker
        target: "http://backend:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        ws: true,
      },
      "/socket.io": {
        // Proxy Socket.io connections to backend
        target: "http://backend:3000",
        changeOrigin: true,
        ws: true,
        secure: false,
      },
      "/auth": {
        // Proxy auth routes (including Google OAuth callback) to backend
        target: "http://backend:3000",
        changeOrigin: true,
        ws: false,
      },
    },
  },
});
