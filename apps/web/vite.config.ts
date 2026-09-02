import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const cartographyRoot = path.resolve(__dirname, "../../../cartography-lab-app");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@cartography-lab/ui/styles.css",
        replacement: path.resolve(cartographyRoot, "packages/ui/src/styles/ui.css"),
      },
      {
        find: "@cartography-lab/tokens",
        replacement: path.resolve(cartographyRoot, "packages/tokens/dist/index.css"),
      },
      {
        find: "@cartography-lab/ui",
        replacement: path.resolve(cartographyRoot, "packages/ui/src/index.ts"),
      },
    ],
  },
  server: {
    host: "localhost",
    port: 5177,
    strictPort: true,
    open: "/",
    fs: { allow: [cartographyRoot, path.resolve(__dirname, "../..")] },
  },
  preview: {
    host: "localhost",
    port: 5177,
    strictPort: true,
  },
});
