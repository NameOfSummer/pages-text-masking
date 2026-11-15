/// <reference types="vitest/config" />
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages: https://<user>.github.io/pages-text-masking/
  base: "/pages-text-masking/",
  plugins: [react(), tailwindcss()],
  build: {
    // CodeMirror で約 590 kB。エディタは起動直後に必ず使うので分割せず、警告の上限だけ上げる
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
