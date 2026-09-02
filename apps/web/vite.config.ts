import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@cartography-lab/ui/styles.css",
        replacement: path.resolve(repoRoot, "packages/ui/src/styles/ui.css"),
      },
      {
        find: "@cartography-lab/tokens",
        replacement: path.resolve(repoRoot, "packages/tokens/dist/index.css"),
      },
      {
        find: "@cartography-lab/ui",
        replacement: path.resolve(repoRoot, "packages/ui/src/index.ts"),
      },
    ],
  },
  server: {
    host: "localhost",
    port: 5177,
    strictPort: true,
    open: "/",
    fs: { allow: [repoRoot] },
  },
  preview: {
    host: "localhost",
    port: 5177,
    strictPort: true,
  },
});
