import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { palettesApiPlugin } from "./vite-plugins/palettesApiPlugin";

const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  if (env.ADMIN_TOKEN) process.env.ADMIN_TOKEN = env.ADMIN_TOKEN;
  if (env.BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN;

  return {
    plugins: [react(), palettesApiPlugin()],
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
  };
});
