import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: path.resolve(import.meta.dirname, "../.."),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://workspaceapi-server-production-5e99.up.railway.app",
        changeOrigin: true,
      },
    },
  },
});
