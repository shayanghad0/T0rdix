import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev proxy → no CORS pain; works with the default VITE_API_URL=/api
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Monaco is large; keep chunks below reasonable limits.
    chunkSizeWarningLimit: 3000,
  },
  worker: {
    format: "es",
  },
});
