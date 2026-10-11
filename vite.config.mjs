import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve("publish/entry.ts"),
      name: "KuraEngine",
      formats: ["iife"],
      fileName: () => "engine.js",
    },
    outDir: "publish",
    emptyOutDir: false,
    publicDir: false,
  },
});
